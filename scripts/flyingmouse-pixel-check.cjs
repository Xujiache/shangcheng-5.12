const { createHash } = require('node:crypto')
const { spawn } = require('node:child_process')

// Hash every decoded RGB byte without retaining entire image buffers in Node.
function hashRgbOutput(command, args, expectedBytes, timeoutMs = 300000) {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 3 || expectedBytes % 3)
    return Promise.reject(new Error('Invalid RGB frame length'))
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const hash = createHash('sha256')
    let bytes = 0, nonzero = false, stderr = '', settled = false
    const finish = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) { child.kill('SIGKILL'); reject(error) }
      else resolve({ bytes, sha256: hash.digest('hex') })
    }
    const timer = setTimeout(() => finish(new Error('RGB decoder timed out')), timeoutMs)
    child.once('error', finish)
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-4000) })
    child.stdout.on('data', (chunk) => {
      if (settled) return
      bytes += chunk.length
      if (bytes > expectedBytes) return finish(new Error('RGB decoder returned extra pixels'))
      hash.update(chunk)
      if (!nonzero) nonzero = chunk.some((value) => value !== 0)
    })
    child.once('close', (code, signal) => {
      if (code !== 0) finish(new Error(`RGB decoder exited ${code ?? signal}: ${stderr}`))
      else if (bytes !== expectedBytes || !nonzero)
        finish(new Error('Decoded image is blank or truncated'))
      else finish()
    })
  })
}

module.exports = { hashRgbOutput }
