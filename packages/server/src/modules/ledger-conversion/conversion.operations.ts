/** Linux smoke-observed candidates exposed only while the worker is healthy. */
export const CONVERSION_CHUNK_BYTES = 8 * 1024 * 1024
export const CONVERSION_FILE_LIMIT = 16 * 1024 ** 3
export const CONVERSION_BATCH_LIMIT = 32 * 1024 ** 3
export const CONVERSION_COUNT_LIMIT = 1000
export const CONVERSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
export const CONVERSION_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000

export interface ConversionOperation {
  id: string
  label: string
  inputExtensions: string[]
  targetExtension: string
  kind: 'convert' | 'images-to-pdf' | 'merge-pdfs'
  options: string[]
}

// Extended only after the corresponding Linux fixture and quality checks pass.
export const VERIFIED_CONVERSION_OPERATIONS: ConversionOperation[] = [
  {
    id: 'convert:md',
    label: 'TXT/DOCX → Markdown',
    inputExtensions: ['txt', 'docx'],
    targetExtension: 'md',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:vtt',
    label: 'SRT → VTT',
    inputExtensions: ['srt'],
    targetExtension: 'vtt',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:jpg',
    label: 'PNG → JPG',
    inputExtensions: ['png'],
    targetExtension: 'jpg',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:png',
    label: 'JPG/JPEG/WebP → PNG',
    inputExtensions: ['jpg', 'jpeg', 'webp'],
    targetExtension: 'png',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:webp',
    label: 'JPG/JPEG/PNG → WebP',
    inputExtensions: ['jpg', 'jpeg', 'png'],
    targetExtension: 'webp',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:pdf',
    label: '图片 → PDF',
    inputExtensions: ['png', 'jpg', 'jpeg', 'webp'],
    targetExtension: 'pdf',
    kind: 'convert',
    options: [],
  },
  {
    id: 'images-to-pdf',
    label: '图片合成 PDF',
    inputExtensions: ['png', 'jpg', 'jpeg', 'webp'],
    targetExtension: 'pdf',
    kind: 'images-to-pdf',
    options: [],
  },
]

export function findConversionOperation(id: string, extensions: string[]) {
  const operation = VERIFIED_CONVERSION_OPERATIONS.find((item) => item.id === id)
  if (
    !operation ||
    !extensions.length ||
    !extensions.every((ext) => operation.inputExtensions.includes(ext))
  ) {
    return null
  }
  return operation
}
