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
const VIDEO_INPUT_FORMATS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'm4s', 'wmv', 'flv']
const VIDEO_OUTPUT_FORMATS = ['mp4', 'webm', 'mkv', 'mov']
const IMAGE_OUTPUT_FORMATS = ['gif', 'avif', 'tiff', 'ico', 'bmp', 'tga', 'jp2', 'jxl', 'qoi', 'ppm']
const ADDITIONAL_IMAGE_INPUTS = ['jfif', 'jpe', 'tif', 'svg', 'heic', 'heif', 'j2k', 'psd']
const CROSS_IMAGE_INPUTS = ['gif', 'avif', 'bmp', 'tiff', 'ico', 'tga', 'jp2', 'jxl', 'qoi', 'ppm']
const VERIFIED_RAW_INPUTS = ['cr2', 'dng']
const VERIFIED_IMAGE_INPUTS = [...VERIFIED_RAW_INPUTS, 'ai']
const VERIFIED_RAW_OUTPUTS = new Set(['gif', 'tiff', 'ico', 'bmp', 'tga', 'qoi', 'ppm'])

// Extended only after the corresponding Linux fixture and quality checks pass.
export const VERIFIED_CONVERSION_OPERATIONS: ConversionOperation[] = [
  {
    id: 'convert:md',
    label: '文档/图片 → Markdown',
    inputExtensions: [
      'txt', 'docx', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif',
      'avif', 'bmp', 'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi',
      ...ADDITIONAL_IMAGE_INPUTS,
      'html', 'htm', 'json', 'csv', 'tsv', 'log', 'xml', 'yaml', 'yml', 'epub',
      'doc', 'odt', 'rtf',
      'wps',
    ],
    targetExtension: 'md',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:docx',
    label: '文档/图片/PDF → Word',
    inputExtensions: [
      'md', 'markdown', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif',
      'bmp', 'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi',
      ...ADDITIONAL_IMAGE_INPUTS,
      'txt', 'html', 'htm', 'doc', 'odt', 'rtf', 'pdf',
      'wpt', 'wps', 'ai',
    ],
    targetExtension: 'docx',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:txt',
    label: '图片/字幕 → TXT',
    inputExtensions: [
      'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp',
      'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi',
      ...ADDITIONAL_IMAGE_INPUTS,
      'srt', 'vtt', 'ass', 'ssa',
      'md', 'markdown', 'html', 'htm', 'json', 'csv', 'log',
      'xml', 'yaml', 'yml', 'epub', 'pdf', 'docx', 'doc', 'odt', 'rtf', 'tsv',
      'ai', 'wps',
    ],
    targetExtension: 'txt',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:vtt',
    label: '字幕 → VTT',
    inputExtensions: ['srt', 'ass', 'ssa'],
    targetExtension: 'vtt',
    kind: 'convert',
    options: [],
  },
  ...(['srt', 'ass', 'ssa'] as const).map((target) => ({
    id: `convert:${target}`,
    label: `字幕 → ${target.toUpperCase()}`,
    inputExtensions: ['srt', 'vtt', 'ass', 'ssa'].filter((source) => source !== target),
    targetExtension: target,
    kind: 'convert' as const,
    options: [],
  })),
  {
    id: 'convert:html',
    label: '文本/电子书 → HTML',
    inputExtensions: [
      'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'log', 'xml', 'yaml', 'yml', 'epub',
      'docx', 'doc', 'odt', 'rtf', 'xlsx', 'xls', 'ods', 'xlsm', 'pptx', 'ppt', 'odp', 'pdf',
      'et', 'ett', 'wps',
    ],
    targetExtension: 'html',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:json',
    label: '文本/表格 → JSON',
    inputExtensions: ['txt', 'md', 'markdown', 'html', 'htm', 'csv', 'tsv', 'log', 'xml', 'yaml', 'yml'],
    targetExtension: 'json',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:csv',
    label: '文本/表格 → CSV',
    inputExtensions: [
      'txt', 'md', 'markdown', 'html', 'htm', 'json', 'log', 'xml', 'yaml', 'yml',
      'xlsx', 'xls', 'ods', 'xlsm', 'tsv',
      'et',
    ],
    targetExtension: 'csv',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:epub',
    label: '文本/表格 → EPUB',
    inputExtensions: ['txt', 'md', 'markdown', 'html', 'htm', 'json', 'csv', 'tsv', 'log', 'xml', 'yaml', 'yml'],
    targetExtension: 'epub',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:xlsx',
    label: '表格/PDF → Excel',
    inputExtensions: ['csv', 'tsv', 'xls', 'ods', 'pdf', 'et', 'ett'],
    targetExtension: 'xlsx',
    kind: 'convert',
    options: [],
  },
  ...([
    ['odt', ['docx', 'doc', 'rtf', 'wps']],
    ['rtf', ['docx', 'doc', 'odt', 'wps']],
    ['xls', ['xlsx', 'ods']],
    ['ods', ['xlsx', 'xls']],
    ['pptx', ['ppt', 'odp', 'dpt']],
    ['odp', ['pptx', 'ppt']],
  ] as [string, string[]][]).map(([target, sources]) => ({
    id: `convert:${target}`,
    label: `Office 文档 → ${target.toUpperCase()}`,
    inputExtensions: sources,
    targetExtension: target,
    kind: 'convert' as const,
    options: [],
  })),
  {
    id: 'convert:jpg',
    label: '图片/PDF → JPG',
    inputExtensions: [
      'png', 'pdf', 'webp', 'gif', 'avif', 'bmp', 'tiff',
      'tga', 'ppm', 'jp2', 'jxl', 'qoi', 'ico',
      ...ADDITIONAL_IMAGE_INPUTS.filter((source) => !['jfif', 'jpe'].includes(source)),
      ...VERIFIED_IMAGE_INPUTS,
      'pptx', 'ppt', 'odp',
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
      ...ADDITIONAL_IMAGE_INPUTS,
      ...VERIFIED_IMAGE_INPUTS,
      'pptx', 'ppt', 'odp',
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
      ...ADDITIONAL_IMAGE_INPUTS,
      ...VERIFIED_IMAGE_INPUTS,
    ],
    targetExtension: 'webp',
    kind: 'convert',
    options: [],
  },
  {
    id: 'convert:pdf',
    label: '图片/文档/压缩包 → PDF',
    inputExtensions: [
      'png', 'jpg', 'jpeg', 'webp', 'md', 'docx', 'gif', 'avif',
      'bmp', 'tiff', 'tga', 'ppm', 'jp2', 'jxl', 'qoi', 'ico',
      ...ADDITIONAL_IMAGE_INPUTS,
      'ai',
      'txt', 'markdown', 'html', 'htm', 'json', 'log', 'xml', 'yaml', 'yml', 'pdf', 'zip',
      'doc', 'odt', 'rtf', 'xlsx', 'xls', 'ods', 'xlsm', 'csv', 'tsv', 'pptx', 'ppt', 'odp',
      'wps', 'wpt', 'et', 'ett', 'dpt',
    ],
    targetExtension: 'pdf',
    kind: 'convert',
    options: ['splitMode', 'groupSize'],
  },
  {
    id: 'images-to-pdf',
    label: '图片合成 PDF',
    inputExtensions: ['png', 'jpg', 'jpeg', 'webp'],
    targetExtension: 'pdf',
    kind: 'images-to-pdf',
    options: [],
  },
  {
    id: 'merge-pdfs',
    label: '合并 PDF',
    inputExtensions: ['pdf'],
    targetExtension: 'pdf',
    kind: 'merge-pdfs',
    options: [],
  },
  ...AUDIO_FORMATS.map((target) => ({
    id: `convert:${target}`,
    label: `音频/视频 → ${target.toUpperCase()}`,
    inputExtensions: [
      ...AUDIO_FORMATS.filter((source) => source !== target),
      ...VIDEO_INPUT_FORMATS,
    ],
    targetExtension: target,
    kind: 'convert' as const,
    options: [],
  })),
  ...IMAGE_OUTPUT_FORMATS.map((target) => ({
    id: `convert:${target}`,
    label: `${target === 'gif' ? '图片/视频' : '图片'} → ${target.toUpperCase()}`,
    inputExtensions: [
      ...(target === 'tiff' ? ['png', 'jpg', 'jpeg'] : ['png', 'jpg', 'jpeg', 'webp']),
      ...ADDITIONAL_IMAGE_INPUTS.filter((source) => target !== 'tiff' || source !== 'tif'),
      ...(VERIFIED_RAW_OUTPUTS.has(target) ? VERIFIED_RAW_INPUTS : []),
      'ai',
      ...CROSS_IMAGE_INPUTS.filter((source) => source !== target && (target !== 'tiff' || source !== 'gif')),
      ...(target === 'gif' ? VIDEO_INPUT_FORMATS : []),
    ],
    targetExtension: target,
    kind: 'convert' as const,
    options: [],
  })),
  ...VIDEO_OUTPUT_FORMATS.map((target) => ({
    id: `convert:${target}`,
    label: `${['mp4', 'webm'].includes(target) ? '图片/视频' : '视频'} → ${target.toUpperCase()}`,
    inputExtensions: [
      ...VIDEO_INPUT_FORMATS.filter((source) => source !== target),
      ...(['mp4', 'webm'].includes(target)
        ? [...ADDITIONAL_IMAGE_INPUTS, ...CROSS_IMAGE_INPUTS, 'png', 'jpg', 'jpeg', 'webp', 'ai']
        : []),
    ],
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
