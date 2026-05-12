import { IsOptional, IsString, MinLength } from 'class-validator'

export class WechatLoginDto {
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() encryptedData?: string
  @IsOptional() @IsString() iv?: string
}

export class PhoneLoginDto {
  @IsString() phone!: string
  // 兼容 code 与 smsCode
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() smsCode?: string
}

export class SmsCodeDto {
  @IsString() phone!: string
  @IsOptional() @IsString() scene?: string
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
