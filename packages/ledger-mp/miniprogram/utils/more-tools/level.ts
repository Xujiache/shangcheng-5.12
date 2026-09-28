export interface Acceleration {
  x: number
  y: number
  z: number
}

export interface LevelReading {
  horizontalDeg: number
  verticalDeg: number
  flatDeg: number
  inclineDeg: number
  bubbleX: number
  bubbleY: number
}

function valid(sample: Acceleration): boolean {
  return !!sample && [sample.x, sample.y, sample.z].every(Number.isFinite) &&
    Math.hypot(sample.x, sample.y, sample.z) >= 0.1
}

/** wx.onAccelerometerChange coordinates; angles are relative to the device screen. */
export function anglesFromAcceleration(sample: Acceleration): LevelReading | null {
  if (!valid(sample)) return null
  const { x, y, z } = sample
  const horizontalDeg = Math.atan2(x, Math.hypot(y, z)) * 180 / Math.PI
  const verticalDeg = Math.atan2(y, Math.hypot(x, z)) * 180 / Math.PI
  const flatDeg = Math.atan2(Math.hypot(x, y), Math.abs(z)) * 180 / Math.PI
  const inclineDeg = Math.atan2(y, z) * 180 / Math.PI
  return { horizontalDeg, verticalDeg, flatDeg, inclineDeg,
    bubbleX: Math.max(-1, Math.min(1, horizontalDeg / 15)),
    bubbleY: Math.max(-1, Math.min(1, verticalDeg / 15)) }
}

export function calibratedReading(sample: Acceleration, reference?: Acceleration | null): LevelReading | null {
  const raw = anglesFromAcceleration(sample)
  if (!raw) return null
  const zero = reference ? anglesFromAcceleration(reference) : null
  if (!zero) return raw
  const horizontalDeg = raw.horizontalDeg - zero.horizontalDeg
  const verticalDeg = raw.verticalDeg - zero.verticalDeg
  const inclineDeg = raw.inclineDeg - zero.inclineDeg
  return { horizontalDeg, verticalDeg, inclineDeg,
    flatDeg: Math.hypot(horizontalDeg, verticalDeg),
    bubbleX: Math.max(-1, Math.min(1, horizontalDeg / 15)),
    bubbleY: Math.max(-1, Math.min(1, verticalDeg / 15)) }
}
