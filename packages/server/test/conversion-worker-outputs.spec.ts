import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { markdownSidecars, zipOutputs } from '../src/workers/conversion.outputs'

const sourceDir = resolve(__dirname, '../../../vendor/flyingmouse-format/v0.7.10')
const archiveTest = existsSync(join(sourceDir, 'node_modules/yazl')) ? test : test.skip

describe('conversion worker Markdown results', () => {
  archiveTest(
    'keeps Markdown references and image files together in the download ZIP',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'conversion-output-'))
      try {
        const outputDir = join(root, 'outputs')
        const assetDir = join(outputDir, 'fm-assets-example')
        await mkdir(assetDir, { recursive: true })
        const markdown = '![图](fm-assets-example/image.png)\n'
        await writeFile(join(outputDir, 'result.md'), markdown)
        await writeFile(join(assetDir, 'image.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
        const sidecars = await markdownSidecars(outputDir)
        const zipPath = join(root, 'result.zip')
        await zipOutputs(
          [{ path: join(outputDir, 'result.md'), fileName: 'result.md' }],
          sidecars,
          zipPath,
          sourceDir,
        )
        const entries = execFileSync('unzip', ['-Z', '-1', zipPath], { encoding: 'utf8' })
          .trim()
          .split('\n')
        expect(entries).toEqual(['result.md', 'fm-assets-example/image.png'])
        expect(execFileSync('unzip', ['-p', zipPath, 'result.md'], { encoding: 'utf8' })).toBe(
          markdown,
        )
        expect(execFileSync('unzip', ['-p', zipPath, 'fm-assets-example/image.png'])).toEqual(
          await readFile(join(assetDir, 'image.png')),
        )
      } finally {
        await rm(root, { recursive: true, force: true })
      }
    },
  )

  test('rejects a symlinked attachment', async () => {
    const root = await mkdtemp(join(tmpdir(), 'conversion-output-'))
    try {
      const assetDir = join(root, 'fm-assets-example')
      await mkdir(assetDir)
      await writeFile(join(root, 'outside.png'), 'outside')
      await symlink(join(root, 'outside.png'), join(assetDir, 'image.png'))
      await expect(markdownSidecars(root)).rejects.toThrow('不是普通文件')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
