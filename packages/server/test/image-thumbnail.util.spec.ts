import sharp from 'sharp'
import {
  createSquareThumbnail,
  objectKeyFromPublicUrl,
  thumbnailKeyForObjectKey,
  thumbnailUrlFor,
} from '../src/modules/files/image-thumbnail.util'

describe('image thumbnail paths', () => {
  const base = 'https://ewsn.top/oss'

  it('builds a stable v1 webp key', () => {
    expect(thumbnailKeyForObjectKey('product/2026/08/a.png')).toBe(
      'thumb/v1/product/2026/08/a.png.webp',
    )
    expect(thumbnailUrlFor(`${base}/product/2026/08/a.png`, base)).toBe(
      `${base}/thumb/v1/product/2026/08/a.png.webp`,
    )
  })

  it('rejects traversal, foreign hosts and thumbnail recursion', () => {
    expect(thumbnailKeyForObjectKey('../secret.png')).toBeNull()
    expect(thumbnailKeyForObjectKey('thumb/v1/a.webp')).toBeNull()
    expect(objectKeyFromPublicUrl('https://attacker.invalid/a.png', base)).toBeNull()
  })

  it('creates an exact 480px webp thumbnail', async () => {
    const input = await sharp({
      create: { width: 40, height: 80, channels: 3, background: '#ff5a36' },
    })
      .png()
      .toBuffer()
    const result = await createSquareThumbnail(input)
    const metadata = await sharp(result).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(480)
    expect(metadata.height).toBe(480)
  })
})
