import { IsArray, IsOptional, IsString } from 'class-validator'

/**
 * POST /u/booking
 * service submitBooking(userId, dto) 读取（含别名，每个变体都必须保留）：
 *   - dto.name      || dto.contactName  → contactName
 *   - dto.phone     || dto.contactPhone → contactPhone
 *   - dto.address
 *   - dto.appointAt || dto.scheduledAt  → new Date(...)
 *   - dto.space     (单个) / dto.spaceTypes (数组)
 *   - dto.remark
 *
 * 服务端不抛缺失校验（除 Prisma 非空约束外），故全部 @IsOptional，仅做类型约束。
 */
export class SubmitBookingDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() contactName?: string

  @IsOptional() @IsString() phone?: string
  @IsOptional() @IsString() contactPhone?: string

  @IsOptional() @IsString() address?: string

  @IsOptional() @IsString() appointAt?: string
  @IsOptional() @IsString() scheduledAt?: string

  @IsOptional() @IsString() space?: string
  @IsOptional() @IsArray() spaceTypes?: string[]

  @IsOptional() @IsString() remark?: string
}
