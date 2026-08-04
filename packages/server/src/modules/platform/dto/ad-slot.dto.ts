import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * 广告位 DTO —— 字段白名单
 *
 * 背景：全局 ValidationPipe 配置为 `{ whitelist: true, transform: true }`，
 * 任何「未在 DTO 上声明的字段」都会被静默剥离（forbidNonWhitelisted:false，不报 400）。
 * 因此本 DTO 必须覆盖 service 真正消费的字段集合，否则会被静默剥离成 undefined。
 *
 * 之所以安全：service.createAdSlot()/updateAdSlot() 都先经过 `sanitizeAdSlotDto(dto)`，
 * 该函数只读取固定白名单 AD_SLOT_FIELDS：
 *   code / name / scene / target / position / size / sort
 *   / unitPrice / enabled / status / preview / startAt / endAt
 * service 已做「字段白名单」（出口防御），本 DTO 与之完全镜像（入口防御），
 * 只要 DTO 覆盖 AD_SLOT_FIELDS，pipe 的剥离行为不会改变现有可用 payload 的语义。
 *
 * 校验宽松度：
 *   - 仅 code/name 设为必填（service 缺失时会抛 INVALID_PARAMS）
 *   - 其余字段一律 @IsOptional，避免 400 拒绝当前合法请求
 *   - startAt/endAt 服务端用 `new Date(dto[k])` 解析，允许 ISO 字符串/时间戳，
 *     故只做 @IsOptional 不强约束格式，避免误拒合法时间值
 */
export class CreateAdSlotDto {
  // service.createAdSlot() 要求 code 必填（sanitize 后 !data.code 抛错）
  @IsString()
  @MaxLength(64)
  code!: string

  // service.createAdSlot() 要求 name 必填
  @IsString()
  @MaxLength(128)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  scene?: string

  // customer / factory / store / all（默认 all），保持宽松不强枚举
  @IsOptional()
  @IsString()
  @IsIn(['customer', 'factory', 'store', 'all'])
  target?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  position?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  size?: string

  @IsOptional()
  @IsInt()
  sort?: number

  @IsOptional()
  @IsNumber()
  unitPrice?: number

  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string

  @IsOptional()
  @IsString()
  preview?: string

  // service 用 new Date(dto.startAt) 解析，允许任意可解析的时间值
  @IsOptional()
  startAt?: string

  // service 用 new Date(dto.endAt) 解析，允许任意可解析的时间值
  @IsOptional()
  endAt?: string
}

/**
 * 广告位更新 DTO —— 全部字段可选
 *
 * service.updateAdSlot() 同样经过 sanitizeAdSlotDto；更新时无必填字段，
 * 但要求 sanitize 后至少有一个可更新字段（否则抛「没有可更新的字段」）。
 * 字段集合与 CreateAdSlotDto 完全一致，仅 code/name 改为可选。
 */
export class UpdateAdSlotDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  scene?: string

  @IsOptional()
  @IsString()
  @IsIn(['customer', 'factory', 'store', 'all'])
  target?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  position?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  size?: string

  @IsOptional()
  @IsInt()
  sort?: number

  @IsOptional()
  @IsNumber()
  unitPrice?: number

  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string

  @IsOptional()
  @IsString()
  preview?: string

  @IsOptional()
  startAt?: string

  @IsOptional()
  endAt?: string
}
