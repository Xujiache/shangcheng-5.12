import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

/**
 * 商家入驻申请。
 *
 * password 保持可选：线上 1.0.0/100 仍会提交不带密码的旧请求；新版仅在当前
 * 手机号账号尚未设置密码时携带它。confirmPassword 永远只在客户端校验。
 */
export class MerchantApplyDto {
  @IsOptional()
  @IsString()
  @IsIn(['factory', 'store'])
  type?: string

  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() legalName?: string
  @IsOptional() @IsString() creditCode?: string
  @IsOptional() @IsString() legalRep?: string
  @IsOptional() @IsString() contact?: string
  @IsOptional() @IsString() contactPhone?: string
  @IsOptional() @IsString() phone?: string
  @IsOptional() @IsString() region?: string
  @IsOptional() @IsString() address?: string
  @IsOptional() @IsString() businessLicense?: string

  @IsOptional() @IsArray() @IsString({ each: true }) qualifications?: string[]
  @IsOptional() @IsArray() @IsString({ each: true }) categories?: string[]

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password?: string
}
