import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

const MAINLAND_PHONE_PATTERN = /^1[3-9]\d{9}$/

export class WechatLoginDto {
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() encryptedData?: string
  @IsOptional() @IsString() iv?: string
}

export class PhoneLoginDto {
  @IsString()
  @Matches(MAINLAND_PHONE_PATTERN, { message: '手机号格式不正确' })
  phone!: string
  // 兼容 code 与 smsCode
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() smsCode?: string
}

export class SmsCodeDto {
  @IsString()
  @Matches(MAINLAND_PHONE_PATTERN, { message: '手机号格式不正确' })
  phone!: string
  @IsOptional() @IsString() scene?: string
}

export class MerchantPasswordLoginDto {
  @IsString()
  @Matches(MAINLAND_PHONE_PATTERN, { message: '手机号格式不正确' })
  phone!: string

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password!: string
}

export class MerchantSmsLoginDto {
  @IsString()
  @Matches(MAINLAND_PHONE_PATTERN, { message: '手机号格式不正确' })
  phone!: string

  @IsString()
  code!: string
}

export class AdminLoginDto {
  // 兼容 username / userName
  @IsOptional() @IsString() username?: string
  @IsOptional() @IsString() userName?: string
  @IsString() @MinLength(6) password!: string
  @IsOptional() @IsString() captcha?: string
}

export class RefreshDto {
  @IsString() refreshToken!: string
}
