// Additional real-codec cases; successful execution alone is not Windows parity.
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { dirname, extname, join } = require('node:path')

module.exports = async function verifyMediaCodec(convert, source, env, codecSet = 'avs') {
  if (!['avs', 'evc'].includes(codecSet)) throw new Error(`Unknown media codec set: ${codecSet}`)
  const fixtures = require(`../../../docs/linux-windows-parity/${codecSet}-fixtures.json`)
  const work = await mkdtemp(join(tmpdir(), `ledger-${codecSet}-`))
  const failures = []
  const ffmpeg = env.FLYINGMOUSE_FFMPEG_PATH
  const probe = (file, frameCount = false) => JSON.parse(execFileSync(join(dirname(ffmpeg), 'ffprobe'),
    ['-v', 'error', '-show_entries', `stream=codec_name,codec_type,width,height${frameCount ? ',nb_frames' : ''}:format=duration`,
      '-of', 'json', file], { encoding: 'utf8' }))
  const decode = (file, args) => execFileSync(ffmpeg,
    ['-v', 'error', '-i', file, ...args, 'pipe:1'], { maxBuffer: 32 * 1024 ** 2, timeout: 120000 })
  const record = (args) => execFileSync(process.execPath,
    [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'), ...args])
  try {
    for (const fixture of fixtures) {
      const input = join(process.env.CONVERSION_FIXTURE_ROOT, codecSet, fixture.name)
      const inputExtension = extname(fixture.name).slice(1).toLowerCase()
      const bytes = await readFile(input)
      if (createHash('sha256').update(bytes).digest('hex') !== fixture.sha256)
        throw new Error(`${codecSet.toUpperCase()} fixture hash mismatch: ${fixture.name}`)
      const original = probe(input, codecSet === 'evc')
      const video = original.streams.find((stream) => stream.codec_type === 'video')
      const hasAudio = original.streams.some((stream) => stream.codec_type === 'audio')
      const duration = Number(original.format.duration)
      if (!video || video.codec_name !== fixture.codec ||
        `${video.width}x${video.height}` !== fixture.dimensions || !Number.isFinite(duration) || duration < 3 ||
        (fixture.durationSeconds && Math.abs(duration - fixture.durationSeconds) > 0.03) ||
        (fixture.frames && Number(video.nb_frames) !== fixture.frames) ||
        (fixture.hasAudio !== undefined && hasAudio !== fixture.hasAudio))
        throw new Error(`Invalid ${codecSet.toUpperCase()} source streams: ${fixture.name}`)
      for (const target of codecSet === 'evc' ? ['mov', 'mkv', 'webm', 'gif'] : ['mp4', 'mov', 'webm', 'gif']) {
        let stage = 'backend'
        try {
          const backend = await convert(`convert:${target}`, [[fixture.name, bytes]])
          const backendPath = join(work, `backend.${target}`)
          const directPath = join(work, `direct.${target}`)
          await writeFile(backendPath, backend.bytes)
          stage = 'original'
          await rm(directPath, { force: true })
          execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
            '--to', target, '--output', directPath, '--json'], { env, timeout: 600000 })
          stage = 'quality'
          const first = probe(backendPath)
          const second = probe(directPath)
          const expectedWidth = target === 'gif' ? Math.min(720, video.width) : video.width
          const expectedHeight = target === 'gif'
            ? Math.round(video.height * expectedWidth / video.width / 2) * 2 : video.height
          const outputVideo = first.streams.find((stream) => stream.codec_type === 'video')
          if (!outputVideo || outputVideo.width !== expectedWidth || outputVideo.height !== expectedHeight ||
            JSON.stringify(first.streams) !== JSON.stringify(second.streams) ||
            Math.abs(Number(first.format.duration) - duration) > 0.25 ||
            Math.abs(Number(first.format.duration) - Number(second.format.duration)) > 0.03)
            throw new Error('Video streams, dimensions or duration differ from source/original')
          const frameArgs = ['-map', '0:v:0', '-vf',
            codecSet === 'evc' ? `fps=1/${duration / 3}` : 'fps=1',
            '-frames:v', '3', '-pix_fmt', 'rgb24', '-f', 'rawvideo']
          if (codecSet === 'evc' && decode(input, frameArgs).length !== 3 * video.width * video.height * 3)
            throw new Error('Source video frames are incomplete')
          const frames = decode(backendPath, frameArgs)
          if (frames.length !== 3 * expectedWidth * expectedHeight * 3 ||
            !frames.equals(decode(directPath, frameArgs))) throw new Error('Decoded frames differ or are incomplete')
          const outputAudio = first.streams.some((stream) => stream.codec_type === 'audio')
          if (outputAudio !== (target !== 'gif' && hasAudio)) throw new Error('Audio track lost or unexpectedly added')
          if (outputAudio) {
            const audioArgs = ['-map', '0:a:0', '-ac', '1', '-ar', '16000', '-f', 's16le']
            const pcm = decode(backendPath, audioArgs)
            if (pcm.length < (duration - 0.25) * 32000 || !pcm.equals(decode(directPath, audioArgs)))
              throw new Error('Decoded audio differs or is truncated')
          }
          record(['--record', inputExtension, target, fixture.sha256,
            `${fixture.name}: real ${codecSet.toUpperCase()} source, authenticated upload/download; dimensions, duration, frames and audio match original CLI`])
          console.log(`PASS ${fixture.name}:${target}`)
        } catch (error) {
          failures.push(`${fixture.name}:${target}: ${error.message}`)
          record(['--fail', inputExtension, target, stage, fixture.sha256, failures.at(-1)])
          console.error(`FAIL ${failures.at(-1)}`)
        }
      }
    }
    if (failures.length) throw new Error(`${failures.length} ${codecSet.toUpperCase()} cases failed; see pair evidence`)
  } finally { await rm(work, { recursive: true, force: true }) }
}
