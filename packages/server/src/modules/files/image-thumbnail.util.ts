import sharp from 'sharp'

export const THUMBNAIL_WIDTH = 480
export const THUMBNAIL_QUALITY = 82
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export function thumbnailKeyForObjectKey(key: string): string | null {
  const normalized = key.replace(/^\/+/, '')
  if (!normalized || normalized.includes('..') || normalized.includes('\\')) return null
  if (normalized.startsWith('thumb/')) return null
  return `thumb/v1/${normalized}.webp`
}

export function objectKeyFromPublicUrl(url: string, publicUrl: string): string | null {
  if (!url || !publicUrl) return null
  const base = publicUrl.replace(/\/+$/, '')
  if (!url.startsWith(`${base}/`)) return null
  const key = url.slice(base.length + 1)
  return thumbnailKeyForObjectKey(key) ? key : null
}

export function thumbnailUrlFor(url: string, publicUrl: string): string | undefined {
  const key = objectKeyFromPublicUrl(url, publicUrl)
  const thumbKey = key ? thumbnailKeyForObjectKey(key) : null
  return thumbKey ? `${publicUrl.replace(/\/+$/, '')}/${thumbKey}` : undefined
}

export async function createSquareThumbnail(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: 'error', animated: false })
    .rotate()
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_WIDTH, {
      fit: 'cover',
      position: 'attention',
    })
    .webp({ quality: THUMBNAIL_QUALITY, effort: 4 })
    .toBuffer()
}
