import { IsString } from 'class-validator'

/**
 * POST /u/bind-phone
 * service bindPhone(dto) 读取：dto.phone、dto.code（两者都做格式校验，缺失即拒）
 */
export class BindPhoneDto {
  @IsString() phone!: string
  @IsString() code!: string
}

/**
 * POST /u/bind-wechat
 * service bindWechat(dto) 读取：dto.code（缺失即抛 INVALID_PARAMS）
 */
export class BindWechatDto {
  @IsString() code!: string
}
