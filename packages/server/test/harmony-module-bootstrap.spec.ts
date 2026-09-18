import { Test } from '@nestjs/testing'

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'module-bootstrap-test-id',
}))

import { AppModule } from '../src/app.module'

describe('Harmony merchant application module', () => {
  it('compiles inside the real production application graph', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()

    expect(module.get(AppModule)).toBeInstanceOf(AppModule)
    await module.close()
  })
})
