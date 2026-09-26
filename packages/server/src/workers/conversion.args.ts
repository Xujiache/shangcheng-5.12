export function operationArgs(
  operationId: string,
  files: string[],
  options: Record<string, string>,
  outputDir: string,
) {
  if (operationId === 'images-to-pdf')
    return ['images-to-pdf', ...files, '--output-dir', outputDir, '--json']
  if (operationId === 'merge-pdfs')
    return ['merge-pdfs', ...files, '--output-dir', outputDir, '--json']
  if (!operationId.startsWith('convert:')) throw new Error('未知转换操作')
  const target = operationId.slice('convert:'.length)
  if (!/^[a-z0-9]{2,8}$/.test(target)) throw new Error('目标格式不正确')
  const args = ['convert', ...files, '--to', target, '--output-dir', outputDir, '--json']
  for (const [key, flag] of Object.entries({
    videoCodec: '--video-codec',
    alphaBackground: '--alpha-background',
    textEncoding: '--text-encoding',
    pdfAction: '--pdf-action',
    splitMode: '--split-mode',
    groupSize: '--group-size',
  })) {
    if (options[key]) args.push(flag, options[key])
  }
  return args
}
