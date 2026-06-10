import { IsBoolean, IsOptional, IsString } from 'class-validator'

/**
 * POST /u/addresses (createAddress) 与 PUT /u/addresses/:id (updateAddress)
 * 二者都走 service.sanitizeAddressDto(dto)，该方法按名读取（非 spread）：
 *   - dto.name、dto.phone、dto.region、dto.detail（缺失/空串/手机号格式错 → 服务端抛 INVALID_PARAMS）
 *   - dto.isDefault（Boolean(dto.isDefault) 读取）
 *
 * 必填/格式由服务端 sanitizeAddressDto 用业务友好文案兜底，DTO 仅保留字段 + 类型，
 * 全部 @IsOptional 以免 whitelist 提前 400 抢在服务端校验之前。
 */
export class AddressDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() phone?: string
  @IsOptional() @IsString() region?: string
  @IsOptional() @IsString() detail?: string
  @IsOptional() @IsBoolean() isDefault?: boolean
}
