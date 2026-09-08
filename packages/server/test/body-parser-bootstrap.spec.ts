import { Body, Controller, Module, Post, Req, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { configureWorkbookBodyParser } from '../src/common/workbook-body-parser'
import { SmsCodeDto } from '../src/modules/auth/dto/login.dto'

@Controller()
class ProbeController {
  @Post('auth/sms-code')
  sms(@Body() dto: SmsCodeDto) { return { phone: dto.phone } }

  @Post('l/workbook/sync')
  workbook(@Body() body: { data: string }) { return { length: body.data.length } }

  @Post('payment/notify')
  payment(@Req() req: { rawBody?: Buffer }, @Body() body: { value: string }) {
    return { value: body.value, raw: req.rawBody?.toString('utf8') }
  }
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('production JSON parser registration', () => {
  let app: NestExpressApplication
  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(ProbeModule, { rawBody: true, logger: false })
    configureWorkbookBodyParser(app)
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })
  afterAll(async () => { await app.close() })

  it('parses a valid SMS JSON body before DTO validation without sending SMS', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/sms-code')
      .send({ phone: '13800000000', scene: 'login' }).expect(201)
    expect(response.body).toEqual({ phone: '13800000000' })
  })
  it('continues to reject numeric phone fields', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/sms-code').send({ phone: 13800000000 }).expect(400)
  })
  it('preserves exact payment rawBody bytes', async () => {
    const raw = '{ "value" : "signed-content" }'
    const response = await request(app.getHttpServer()).post('/api/v1/payment/notify')
      .set('Content-Type', 'application/json').send(raw).expect(201)
    expect(response.body).toEqual({ value: 'signed-content', raw })
  })
  it('allows large workbook imports but retains the normal route body limit', async () => {
    const data = 'x'.repeat(150 * 1024)
    const response = await request(app.getHttpServer()).post('/api/v1/l/workbook/sync').send({ data }).expect(201)
    expect(response.body.length).toBe(data.length)
    await request(app.getHttpServer()).post('/api/v1/auth/sms-code').send({ data }).expect(413)
  })
})
