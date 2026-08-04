import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * 创建优惠券。服务端 createCoupon 显式构建 data 对象（无 dto 展开），
 * 按名读取以下字段，全部在此声明：
 *   name, type, validFrom, validTo, amount, discountPercent, status,
 *   threshold, stock, perUserLimit, scope, scopeIds
 *
 * 校验保持宽松：业务必填/区间校验由 service 自行抛 BizException，
 * 这里仅做类型/枚举级 whitelist，避免误 400 拒绝当前合法载荷。
 */
export class CreateCouponDto {
  @IsOptional() @IsString() @MaxLength(60) name?: string
  @IsOptional() @IsIn(['fullReduce', 'discount', 'fixed']) type?: string
  @IsOptional() @IsString() validFrom?: string
  @IsOptional() @IsString() validTo?: string
  @IsOptional() @IsNumber() amount?: number
  @IsOptional() @IsNumber() discountPercent?: number
  @IsOptional() @IsNumber() threshold?: number
  @IsOptional() @IsNumber() stock?: number
  @IsOptional() @IsNumber() perUserLimit?: number
  @IsOptional() @IsIn(['all', 'category', 'product']) scope?: string
  @IsOptional() @IsArray() scopeIds?: string[]
  @IsOptional() @IsIn(['pending', 'active', 'paused', 'ended']) status?: string
}

/**
 * 更新优惠券。updateCoupon 同样显式按名读取字段构建 data（无 dto 展开），
 * 全字段可选（仅更新传入项），字段集与创建一致。
 */
export class UpdateCouponDto {
  @IsOptional() @IsString() @MaxLength(60) name?: string
  @IsOptional() @IsIn(['fullReduce', 'discount', 'fixed']) type?: string
  @IsOptional() @IsString() validFrom?: string
  @IsOptional() @IsString() validTo?: string
  @IsOptional() @IsNumber() amount?: number
  @IsOptional() @IsNumber() discountPercent?: number
  @IsOptional() @IsNumber() threshold?: number
  @IsOptional() @IsNumber() stock?: number
  @IsOptional() @IsNumber() perUserLimit?: number
  @IsOptional() @IsIn(['all', 'category', 'product']) scope?: string
  @IsOptional() @IsArray() scopeIds?: string[]
  @IsOptional() @IsIn(['pending', 'active', 'paused', 'ended']) status?: string
}
