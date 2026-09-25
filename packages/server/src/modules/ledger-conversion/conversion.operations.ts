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

const AUDIO_FORMATS = ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac', 'opus', 'wma']
const IMAGE_OUTPUT_FORMATS = ['gif', 'avif', 'tiff', 'ico', 'bmp', 'tga', 'jp2', 'jxl', 'qoi', 'ppm']

// Extended only after the corresponding Linux fixture and quality checks pass.
export const VERIFIED_CONVERSION_OPERATIONS: ConversionOperation[] = [
  {
    id: 'convert:md',
    label: '文档/图片 → Markdown',
    inputExtensions: [
      'txt', 'docx', 'png', 'jpg', 'jpeg', 'webp', 'gif',
      'avif', 'bmp', 'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi',
    ],
    targetExtension: 'md',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:docx',
    label: 'Markdown/图片 → Word',
    inputExtensions: [
      'md', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif',
      'bmp', 'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi',
    ],
    targetExtension: 'docx',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:txt',
    label: '图片文字识别',
    inputExtensions: [
      'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp',
      'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi',
    ],
    targetExtension: 'txt',
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
    label: '图片/PDF → JPG',
    inputExtensions: [
      'png', 'pdf', 'webp', 'gif', 'avif', 'bmp', 'tiff',
      'tga', 'ppm', 'jp2', 'jxl', 'qoi', 'ico',
    ],
    targetExtension: 'jpg',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:png',
    label: '图片/PDF → PNG',
    inputExtensions: [
      'jpg', 'jpeg', 'webp', 'pdf', 'gif', 'avif', 'bmp',
      'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi', 'ico',
    ],
    targetExtension: 'png',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:webp',
    label: '图片/PDF → WebP',
    inputExtensions: [
      'jpg', 'jpeg', 'png', 'pdf', 'gif', 'avif', 'bmp',
      'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi', 'ico',
    ],
    targetExtension: 'webp',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:pdf',
    label: '图片/Markdown → PDF',
    inputExtensions: [
      'png', 'jpg', 'jpeg', 'webp', 'md', 'gif', 'avif',
      'bmp', 'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi', 'ico',
    ],
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
  ...AUDIO_FORMATS.map((target) => ({
    id: `convert:${target}`,
    label: `音频 → ${target.toUpperCase()}`,
    inputExtensions: AUDIO_FORMATS.filter((source) => source !== target),
    targetExtension: target,
    kind: 'convert' as const,
    options: [],
  })),
  ...IMAGE_OUTPUT_FORMATS.map((target) => ({
    id: `convert:${target}`,
    label: `图片 → ${target.toUpperCase()}`,
    inputExtensions: target === 'tiff' ? ['png', 'jpg'] : ['png', 'jpg', 'webp'],
    targetExtension: target,
    kind: 'convert' as const,
    options: [],
  })),
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
