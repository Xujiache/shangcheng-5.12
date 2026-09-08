import { Transform } from 'class-transformer'
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

/**
 * 商家客服发送消息。
 *
 * product/order 仅为旧客户端兼容保留；新版商家 APP 暂不展示未完成的卡片发送入口。
 * system 永远只能由服务端产生，客户端不得伪造。
 */
export class SendChatMessageDto {
  @IsOptional()
  @IsIn(['text', 'image', 'quick', 'product', 'order'])
  type?: 'text' | 'image' | 'quick' | 'product' | 'order'

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MinLength(1, { message: '消息内容不能为空' })
  @MaxLength(1000, { message: '消息不能超过1000个字符' })
  content!: string
}
