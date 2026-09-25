import { createRequire } from 'node:module'
import { createWriteStream } from 'node:fs'
import { lstat, readdir, realpath } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { finished } from 'node:stream/promises'

interface SidecarFile {
  path: string
  zipName: string
}

export async function markdownSidecars(outputDir: string): Promise<SidecarFile[]> {
  const root = await realpath(outputDir)
  const files: SidecarFile[] = []
  for (const directory of await readdir(root, { withFileTypes: true })) {
    if (!directory.name.startsWith('fm-assets-')) continue
    const directoryPath = join(root, directory.name)
    if (!directory.isDirectory() || (await realpath(directoryPath)) !== directoryPath)
      throw new Error('Markdown 附件目录无效')
    const entries = await readdir(directoryPath, { withFileTypes: true })
    if (!entries.length) throw new Error('Markdown 附件目录为空')
    for (const entry of entries) {
      const filePath = join(directoryPath, entry.name)
      if (
        !entry.isFile() ||
        !(await lstat(filePath)).isFile() ||
        (await realpath(filePath)) !== filePath
      )
        throw new Error('Markdown 附件不是普通文件')
      files.push({ path: filePath, zipName: `${directory.name}/${entry.name}` })
    }
  }
  return files
}

export async function zipOutputs(
  outputs: { path: string; fileName: string }[],
  sidecars: SidecarFile[],
  destination: string,
  sourceDir: string,
) {
  const vendorRequire = createRequire(join(sourceDir, 'package.json'))
  const yazl = vendorRequire('yazl')
  const zip = new yazl.ZipFile()
  const used = new Set<string>()
  for (const output of outputs) {
    const original = basename(output.fileName.replaceAll('\\', '/'))
      .replace(/[\x00-\x1f\x7f]/g, '')
      .slice(0, 180)
    if (!original) throw new Error('转换引擎结果文件名无效')
    let name = original
    let suffix = 2
    while (used.has(name)) name = `${suffix++}-${original}`
    used.add(name)
    zip.addFile(output.path, name)
  }
  for (const file of sidecars) zip.addFile(file.path, file.zipName)
  zip.end()
  const stream = createWriteStream(destination)
  zip.outputStream.pipe(stream)
  await finished(stream)
}
