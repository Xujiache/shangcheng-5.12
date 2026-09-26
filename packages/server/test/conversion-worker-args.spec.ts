import { operationArgs } from '../src/workers/conversion.args'

describe('conversion worker CLI arguments', () => {
  test('passes supported video and PDF options to the engine', () => {
    expect(
      operationArgs(
        'convert:pdf',
        ['/tmp/source.pdf'],
        {
          alphaBackground: 'white',
          splitMode: 'group',
          groupSize: '2',
        },
        '/tmp/output',
      ),
    ).toEqual([
      'convert',
      '/tmp/source.pdf',
      '--to',
      'pdf',
      '--output-dir',
      '/tmp/output',
      '--json',
      '--alpha-background',
      'white',
      '--split-mode',
      'group',
      '--group-size',
      '2',
    ])
  })

  test('does not pass conversion options to merge and rejects invalid targets', () => {
    expect(
      operationArgs(
        'merge-pdfs',
        ['/tmp/a.pdf', '/tmp/b.pdf'],
        { splitMode: 'group' },
        '/tmp/output',
      ),
    ).toEqual(['merge-pdfs', '/tmp/a.pdf', '/tmp/b.pdf', '--output-dir', '/tmp/output', '--json'])
    expect(() => operationArgs('convert:../../pdf', [], {}, '/tmp/output')).toThrow(
      '目标格式不正确',
    )
  })
})
