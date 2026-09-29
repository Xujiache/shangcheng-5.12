// Additional real-codec cases; successful execution alone is not Windows parity.
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { readFileSync, rmSync } = require('node:fs')
const { copyFile, mkdir, mkdtemp, readFile, writeFile, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { dirname, extname, join } = require('node:path')

function parseProbe(output) {
  const result = { streams: [], format: {} }
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    if (/^libuavs3d\(\d+\): [\w.-]+,\s*$/.test(line)) continue
    const match = /^(streams\.stream\.(\d+)\.(codec_name|codec_type|width|height|nb_frames|channels|duration|tags\.DURATION)|format\.duration)=(.+)$/.exec(line)
    if (!match) throw new Error(`Unexpected ffprobe output: ${line.slice(0, 160)}`)
    const value = JSON.parse(match[4])
    const target = match[2] === undefined ? result.format :
      (result.streams[Number(match[2])] ||= {})
    const field = match[3] || 'duration'
    if (Object.hasOwn(target, field)) throw new Error(`Duplicate ffprobe field: ${match[1]}`)
    target[field] = value
  }
  if (!result.streams.length || result.streams.some((stream) => !stream) || !result.format.duration)
    throw new Error('Incomplete ffprobe output')
  return result
}

function mediaTiming(info) {
  const seconds = (stream) => {
    if (!stream) return 0
    if (Number(stream.duration) > 0 && Number.isFinite(Number(stream.duration))) return Number(stream.duration)
    const clock = /^(\d+):([0-5]\d):([0-5]\d(?:\.\d+)?)$/.exec(stream['tags.DURATION'] || '')
    if (!clock) throw new Error(`Missing ${stream.codec_type} stream duration`)
    return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3])
  }
  const video = info.streams.find((stream) => stream.codec_type === 'video')
  // These frozen fixtures use FFmpeg's default highest-channel audio selection.
  const audio = info.streams.filter((stream) => stream.codec_type === 'audio')
    .sort((a, b) => b.channels - a.channels)[0]
  if (!video) throw new Error('Missing video stream')
  return { video: seconds(video), audio: seconds(audio) }
}

function checkMediaTiming(source, output, target) {
  const expected = mediaTiming(source)
  const actual = mediaTiming(output)
  if (Math.abs(actual.video - expected.video) > 0.25 ||
    (target !== 'gif' && Math.abs(actual.audio - expected.audio) > 0.25) ||
    Math.abs(Number(output.format.duration) - Math.max(expected.video, target === 'gif' ? 0 : expected.audio)) > 0.25)
    throw new Error(`Media duration differs: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  return expected
}

module.exports = async function verifyMediaCodec(convert, source, env, codecSet = 'avs') {
  if (!['avs', 'evc'].includes(codecSet)) throw new Error(`Unknown media codec set: ${codecSet}`)
  const fixtures = require(`../../../docs/linux-windows-parity/${codecSet}-fixtures.json`)
  const work = await mkdtemp(join(tmpdir(), `ledger-${codecSet}-`))
  const failures = []
  const ffmpeg = env.FLYINGMOUSE_FFMPEG_PATH
  const probe = (file, frameCount = false) => parseProbe(execFileSync(join(dirname(ffmpeg), 'ffprobe'),
    ['-v', 'error', '-show_entries', `stream=codec_name,codec_type,width,height,channels,duration${frameCount ? ',nb_frames' : ''}:stream_tags=DURATION:format=duration`,
      '-of', 'flat', file], { encoding: 'utf8' }))
  const decode = (file, args) => {
    const output = join(work, 'decoded.bin')
    try {
      execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', file, ...args, output],
        { maxBuffer: 32 * 1024 ** 2, timeout: 120000 })
      return readFileSync(output)
    } finally { rmSync(output, { force: true }) }
  }
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
        const backendPath = join(work, `backend.${target}`)
        const directPath = join(work, `direct.${target}`)
        const inspection = { input: fixture.name, target, source: original }
        await Promise.all([rm(backendPath, { force: true }), rm(directPath, { force: true })])
        try {
          const backend = await convert(`convert:${target}`, [[fixture.name, bytes]])
          await writeFile(backendPath, backend.bytes)
          stage = 'original'
          await rm(directPath, { force: true })
          execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
            '--to', target, '--output', directPath, '--json'], { env, timeout: 600000 })
          stage = 'quality'
          const first = probe(backendPath)
          const second = probe(directPath)
          inspection.backend = first
          inspection.direct = second
          const expectedWidth = target === 'gif' ? Math.min(720, video.width) : video.width
          const expectedHeight = target === 'gif'
            ? Math.round(video.height * expectedWidth / video.width / 2) * 2 : video.height
          const outputVideo = first.streams.find((stream) => stream.codec_type === 'video')
          if (!outputVideo || outputVideo.width !== expectedWidth || outputVideo.height !== expectedHeight ||
            JSON.stringify(first.streams) !== JSON.stringify(second.streams) ||
            Math.abs(Number(first.format.duration) - Number(second.format.duration)) > 0.03)
            throw new Error('Video streams, dimensions or duration differ from source/original')
          const expectedTiming = checkMediaTiming(original, first, target)
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
            if (pcm.length < (expectedTiming.audio - 0.25) * 32000 || !pcm.equals(decode(directPath, audioArgs)))
              throw new Error('Decoded audio differs or is truncated')
          }
          record(['--record', inputExtension, target, fixture.sha256,
            `${fixture.name}: real ${codecSet.toUpperCase()} source, authenticated upload/download; dimensions, duration, frames and audio match original CLI`])
          console.log(`PASS ${fixture.name}:${target}`)
        } catch (error) {
          inspection.error = error.message
          failures.push(`${fixture.name}:${target}: ${error.message}`)
          record(['--fail', inputExtension, target, stage, fixture.sha256, failures.at(-1)])
          console.error(`FAIL ${failures.at(-1)}`)
        } finally {
          if (process.env.CONVERSION_PAIR_EVIDENCE) {
            const directory = process.env.CONVERSION_PAIR_EVIDENCE.replace(/\.jsonl$/, '') + '-media'
            await mkdir(directory, { recursive: true })
            const name = `${fixture.name}-${target}`
            await writeFile(join(directory, `${name}.json`), JSON.stringify(inspection, null, 2) + '\n', { flag: 'wx' })
            if (inspection.error) for (const [label, file] of [['backend', backendPath], ['direct', directPath]]) {
              try { await copyFile(file, join(directory, `${name}-${label}.${target}`)) }
              catch (error) { if (error.code !== 'ENOENT') throw error }
            }
          }
        }
      }
    }
    if (failures.length) throw new Error(`${failures.length} ${codecSet.toUpperCase()} cases failed; see pair evidence`)
  } finally { await rm(work, { recursive: true, force: true }) }
}

module.exports.parseProbe = parseProbe
module.exports.mediaTiming = mediaTiming
module.exports.checkMediaTiming = checkMediaTiming
