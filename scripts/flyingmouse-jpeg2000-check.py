#!/usr/bin/env python3
"""Synthetic paired JPEG2000 checks; preserves evidence under --root."""
import argparse
import hashlib
import json
import shutil
import struct
import subprocess
import sys
import tempfile
import time
from pathlib import Path

NFRAMES = 11
CANONICAL_FORMATS = {'rgb24': 'rgb24', 'gray16': 'gray16le', 'rgb48': 'rgb48le',
                     'yuv420p10le': 'yuv420p10le', 'yuva444p16le': 'yuva444p16le'}
DECODER_FORMATS = {
    'rgb24': {'rgb24', 'bgr24', 'gbrp'} | {
        f'{layout}{bits}{endian}' for layout, bits in [('rgb', 48), ('bgr', 48)] +
        [('gbrp', depth) for depth in (9, 10, 12, 14, 16)] for endian in ('le', 'be')},
    'gray16le': {'gray16le', 'gray16be'},
    'rgb48le': {f'{layout}{endian}' for layout in ('rgb48', 'bgr48', 'gbrp16') for endian in ('le', 'be')},
    'yuv420p10le': {f'yuv420p{depth}{endian}' for depth in (10, 12, 14, 16) for endian in ('le', 'be')},
    'yuva444p16le': {'yuva444p16le', 'yuva444p16be', 'ayuv64le', 'ayuv64be'},
}
OPENJPEG_CHECK = """import hashlib,json,sys
from pathlib import Path
from PIL import Image,features
frames=[]
for path in sorted(Path(sys.argv[1]).glob('frame-*.'+sys.argv[2])):
    record={'file':path.name}
    try:
        with Image.open(path) as image:
            image.load()
            pixels=image.tobytes()
            record.update(success=True,size=image.size,mode=image.mode,bytes=len(pixels),
                          sha256=hashlib.sha256(pixels).hexdigest())
    except Exception as error:
        record.update(success=False,error=str(error))
    frames.append(record)
print(json.dumps({'version':features.version_codec('jpg_2000'),'frames':frames}))
"""

def emit(record):
    print(json.dumps(record, sort_keys=True), flush=True)

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def run(argv, commands, timeout):
    record = {'argv': [str(value) for value in argv]}
    commands.append(record)
    start = time.monotonic()
    try:
        result = subprocess.run(record['argv'], capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired as error:
        record.update(duration_seconds=time.monotonic() - start, error='timeout',
                      stderr=(error.stderr or b'').decode(errors='replace')[-4000:])
        raise RuntimeError('command timeout') from error
    record.update(duration_seconds=time.monotonic() - start, returncode=result.returncode,
                  stderr=result.stderr.decode(errors='replace')[-4000:])
    if result.returncode:
        raise RuntimeError('command exited ' + str(result.returncode))
    return result.stdout

def sequence(directory, width, height, channels, bits):
    directory.mkdir()
    suffix = 'ppm' if channels == 3 else 'pgm'
    maximum = (1 << bits) - 1
    noise = bytearray()
    flat = ((1 << (bits - 1)).to_bytes(bits // 8, 'big')) * (width * height * channels)
    for index in range(width * height * channels):
        value = ((index * 1664525 + 1013904223) ^ ((index >> 7) * 2246822519)) & maximum
        noise.extend(value.to_bytes(bits // 8, 'big'))
    header = ('P6' if channels == 3 else 'P5') + f'\n{width} {height}\n{maximum}\n'
    for frame in range(NFRAMES):
        (directory / f'frame-{frame:02d}.{suffix}').write_bytes(
            header.encode() + (flat if frame % 3 == 1 else noise))
    return ['-f', 'image2', '-framerate', '3', '-start_number', '0',
            '-i', str(directory / ('frame-%02d.' + suffix))]

def frame_bytes(width, height, pixel_format):
    if pixel_format == 'yuv420p10le':
        return 2 * (width * height + 2 * ((width + 1) // 2) * ((height + 1) // 2))
    return width * height * {'rgb24': 3, 'gray16le': 2, 'rgb48le': 6,
                             'yuva444p16le': 8, 'rgba64le': 8}[pixel_format]

def raw_hash(input_options, target, width, height, full, commands, timeout, pixel_format='rgba64le'):
    expected = frame_bytes(width, height, pixel_format) * NFRAMES
    if shutil.disk_usage(target.parent).free < 3 * 1024**3 + expected:
        raise RuntimeError('decoded scratch would breach 3 GiB disk reserve')
    try:
        run([full, '-hide_banner', '-v', 'error', '-xerror', '-y', '-threads', '1',
             *input_options, '-map', '0:v:0', '-an', '-filter_threads', '1', '-c:v', 'rawvideo',
             '-threads', '1', '-pix_fmt', pixel_format, '-f', 'rawvideo', target], commands, timeout)
        if target.stat().st_size != expected:
            raise RuntimeError('decoded raw byte count differs from complete sequence')
        return {'raw_bytes': expected, 'raw_sha256': digest(target), 'raw_pix_fmt': pixel_format}
    finally:
        target.unlink(missing_ok=True)

def yuva_sequence(path, width=65, height=33):
    samples = width * height
    with path.open('wb') as stream:
        for frame in range(NFRAMES):
            for plane in range(4):
                values = [((i * 4051 + frame * 997) & 65535) if plane == 3 else
                          (32768 if frame % 3 == 1 else
                           ((i * 1664525 + plane * 997 + 1013904223) & 65535)) for i in range(samples)]
                stream.write(struct.pack('<' + 'H' * samples, *values))
    if path.stat().st_size != samples * 4 * 2 * NFRAMES:
        raise RuntimeError('synthetic planar YUVA16 byte count mismatch')
    return ['-f', 'rawvideo', '-pixel_format', 'yuva444p16le', '-video_size', f'{width}x{height}',
            '-framerate', '3', '-i', str(path)]

def inspect(directory, suffix, width, height, pixel_format, full, probe, openjpeg_python, commands, timeout, result):
    files = sorted(directory.glob('frame-*.' + suffix))
    if [path.name for path in files] != [f'frame-{i:02d}.{suffix}' for i in range(NFRAMES)]:
        raise RuntimeError('encoded frame count/names differ from requested sequence')
    result.update(file_sha256=[digest(path) for path in files],
                  file_sizes=[path.stat().st_size for path in files], encoded_frame_count=len(files))
    result['openjpeg'] = json.loads(run([openjpeg_python, '-c', OPENJPEG_CHECK, directory, suffix],
                                       commands, timeout))
    openjpeg_ok = (result['openjpeg']['version'] is not None
                   and len(result['openjpeg']['frames']) == NFRAMES
                   and all(frame['success'] and frame['size'] == [width, height]
                           for frame in result['openjpeg']['frames']))
    image_input = ['-f', 'image2', '-framerate', '3', '-start_number', '0',
                   '-i', str(directory / ('frame-%02d.' + suffix))]
    metadata = json.loads(run([probe, '-v', 'error', '-c:v', 'jpeg2000', *image_input, '-show_frames',
                              '-show_entries', 'frame=width,height,pix_fmt', '-of', 'json'],
                             commands, timeout))['frames']
    result.update(frames=metadata, decoded_frame_count=len(metadata), canonical_pix_fmt=pixel_format,
                  allowed_decoder_pix_fmts=sorted(DECODER_FORMATS[pixel_format]))
    if len(metadata) != NFRAMES or any((f['width'], f['height']) != (width, height) or
                                      f['pix_fmt'] not in DECODER_FORMATS[pixel_format] for f in metadata):
        raise RuntimeError('decoded frame count/dimensions/pixel format are incompatible with synthetic input')
    pixels = raw_hash(['-c:v', 'jpeg2000', *image_input], directory / 'decoded.rgba64le',
                      width, height, full, commands, timeout)
    result.update(pixels)
    result['canonical'] = raw_hash(['-c:v', 'jpeg2000', *image_input], directory / 'decoded.canonical.raw',
                                   width, height, full, commands, timeout, pixel_format)
    if not openjpeg_ok:
        raise RuntimeError('OpenJPEG could not decode every complete frame with expected dimensions')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('/diagnostic'))
    parser.add_argument('--full', type=Path, default=Path('/opt/ffmpeg-8.1.1/bin/ffmpeg'))
    parser.add_argument('--ffprobe', type=Path, default=Path('/opt/ffmpeg-8.1.1/bin/ffprobe'))
    parser.add_argument('--openjpeg-python', type=Path, default=Path('/opt/pdf2docx-venv/bin/python'))
    parser.add_argument('--timeout', type=int, default=900, help='seconds per subprocess')
    args = parser.parse_args()
    binaries = {'baseline': args.root / 'baseline/ffmpeg', 'candidate': args.root / 'candidate/ffmpeg'}
    work = Path(tempfile.mkdtemp(prefix='paired-synthetic-', dir=args.root))
    started, setup_commands, identities = time.monotonic(), [], {}
    try:
        if shutil.disk_usage(work).free < 3 * 1024**3:
            raise RuntimeError('less than 3 GiB disk reserve')
        identities = {label: {'path': str(binary), 'sha256': digest(binary)}
                      for label, binary in {**binaries, 'full_defaults': args.full,
                                             'ffprobe': args.ffprobe, 'openjpeg_python': args.openjpeg_python}.items()}
        inputs = {'rgb24': (sequence(work / 'rgb24', 513, 257, 3, 8), 513, 257),
                  'gray16': (sequence(work / 'gray16', 65, 33, 1, 16), 65, 33),
                  'rgb48': (sequence(work / 'rgb48', 65, 33, 3, 16), 65, 33)}
        for pixel_format in ('yuv420p10le', 'yuva444p16le'):
            target = work / (pixel_format + '.nut')
            raw_yuva = work / 'synthetic-yuva444p16le.raw'
            input_args = inputs['rgb48'][0] if pixel_format == 'yuv420p10le' else yuva_sequence(raw_yuva)
            run([args.full, '-hide_banner', '-v', 'error', '-xerror', '-y',
                 *input_args, '-frames:v', str(NFRAMES), '-an', '-filter_threads', '1',
                 '-c:v', 'rawvideo', '-threads', '1', '-pix_fmt', pixel_format, '-f', 'nut', target],
                setup_commands, args.timeout)
            inputs[pixel_format] = (['-f', 'nut', '-i', str(target)], 65, 33)
            raw_yuva.unlink(missing_ok=True)
        frozen = {source: {
            'rgba64le': raw_hash(options, work / (source + '-frozen.rgba64le'), width, height,
                                  args.full, setup_commands, args.timeout),
            'canonical': raw_hash(options, work / (source + '-frozen.canonical.raw'), width, height,
                                  args.full, setup_commands, args.timeout, CANONICAL_FORMATS[source])}
                  for source, (options, width, height) in inputs.items()}
        emit({'event': 'setup', 'success': True, 'work': str(work), 'commands': setup_commands, 'binaries': identities, 'frozen_sources': frozen,
              'duration_seconds': time.monotonic() - started})
    except Exception as error:
        emit({'event': 'setup', 'success': False, 'work': str(work), 'error': str(error),
              'commands': setup_commands, 'binaries': identities, 'duration_seconds': time.monotonic() - started})
        return 1
    cases = []
    for suffix in ('jp2', 'j2k'):
        for threads in (1, 2):
            cases.append((f'default-{suffix}-t{threads}', 'rgb24', suffix, threads, []))
    groups = [('lossless53', ['-pred', 'dwt53', '-q:v', '0']),
              ('quality97', ['-pred', 'dwt97int', '-q:v', '7']),
              ('quality53', ['-pred', 'dwt53', '-q:v', '7']),
              ('rates97', ['-pred', 'dwt97int', '-layer_rates', '8,4,1']),
              ('rates53', ['-pred', 'dwt53', '-layer_rates', '8,4,1']),
              ('rates53-limited', ['-pred', 'dwt53', '-layer_rates', '8,4,2'])]
    groups += [(f'progression-{order}', ['-layer_rates', '8,4,1', '-sop', '1', '-eph', '1',
                                       '-prog', order]) for order in ('lrcp', 'rlcp', 'rpcl', 'pcrl', 'cprl')]
    for name, options in groups:
        for threads in (1, 2):
            cases.append((f'{name}-t{threads}', 'rgb24', 'jp2', threads, options))
    for source in ('gray16', 'rgb48', 'yuv420p10le', 'yuva444p16le'):
        for threads in (1, 2):
            cases.append((f'{source}-lossless53-t{threads}', source, 'jp2', threads,
                          ['-pred', 'dwt53', '-q:v', '0']))
    failed = 0
    for name, source, suffix, threads, options in cases:
        start, commands, outputs = time.monotonic(), [], {}
        record = {'event': 'case', 'case': name, 'source': source, 'commands': commands, 'outputs': outputs}
        try:
            if shutil.disk_usage(work).free < 3 * 1024**3:
                raise RuntimeError('less than 3 GiB disk reserve')
            selected = dict(binaries)
            if name == 'default-jp2-t1':
                selected['full_defaults'] = args.full
            input_options, width, height = inputs[source]
            errors = {}
            for label, binary in selected.items():
                outputs[label] = {}
                try:
                    directory = work / (name + '-' + label)
                    directory.mkdir()
                    run([binary, '-hide_banner', '-v', 'error', '-xerror', '-y', *input_options,
                         '-frames:v', str(NFRAMES), '-map', '0:v:0', '-an', '-filter_threads', '1',
                         '-c:v', 'jpeg2000', '-threads', str(threads), '-format', suffix,
                         '-pix_fmt', CANONICAL_FORMATS[source], *options,
                         '-start_number', '0', '-f', 'image2', directory / ('frame-%02d.' + suffix)],
                        commands, args.timeout)
                    inspect(directory, suffix, width, height, CANONICAL_FORMATS[source],
                            args.full, args.ffprobe, args.openjpeg_python,
                            commands, args.timeout, outputs[label])
                except Exception as error:
                    errors[label] = str(error)
            record.update(binary_errors=errors, encoded_bytes_equal=all(
                result.get('file_sha256') == outputs['baseline'].get('file_sha256')
                and 'file_sha256' in result for result in outputs.values()))
            if errors:
                raise RuntimeError('one or more binary checks failed')
            if any(result != outputs['baseline'] for result in outputs.values()):
                raise RuntimeError('complete encoded bytes, frame metadata or decoded pixels differ')
            lossless = 'lossless53' in name or name.startswith('rates53-t')
            if lossless and any(result['canonical'] != frozen[source]['canonical'] or
                                result['raw_sha256'] != frozen[source]['rgba64le']['raw_sha256']
                                for result in outputs.values()):
                raise RuntimeError('lossless decoded canonical planes or RGBA pixels differ from frozen source')
            record.update(success=True, lossless_source_checked=lossless, frozen_source=frozen[source])
        except Exception as error:
            failed += 1
            record.update(success=False, error=str(error))
        record['duration_seconds'] = time.monotonic() - start
        emit(record)
    emit({'event': 'summary', 'success': failed == 0, 'cases': len(cases), 'failed': failed,
          'work': str(work), 'duration_seconds': time.monotonic() - started})
    return int(failed != 0)


if __name__ == '__main__':
    sys.exit(main())
