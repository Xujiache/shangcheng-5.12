import catalog from './conversion.catalog.json'

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
  optionInputExtensions?: Record<string, string[]>
}

/** Original source a7b9b15; regenerate with scripts/generate-flyingmouse-operations.cjs. */
export const ORIGINAL_CONVERSION_OPERATIONS = catalog.operations as ConversionOperation[]

export function findConversionOperation(id: string, extensions: string[]) {
  const operation = ORIGINAL_CONVERSION_OPERATIONS.find((item) => item.id === id)
  if (!operation || !extensions.length || !extensions.every((ext) => operation.inputExtensions.includes(ext)))
    return null
  return operation
}
