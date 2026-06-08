import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

const MONEY_MAX = 1_000_000_000_000 // 1 万亿元上限，避免 JS number 精度溢出

/**
 * 新增订单。成本各项可选（按需开启），缺省 0。
 * extras 为其他开销数组 [{type,amount}]，服务端 sanitizeExtras 清洗后落库。
 */
export class CreateLedgerOrderDto {
  @IsOptional() @IsString() customerId?: string
  @IsString() @MaxLength(40) customerName!: string
  /** ISO 日期字符串（YYYY-MM-DD 或完整 ISO） */
  @IsDateString() date!: string
  @IsInt() @Min(0) @Max(MONEY_MAX) total!: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) extraIncome?: number

  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costProfile?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costGlass?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costHardware?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costLabor?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costScreen?: number

  @IsOptional() @IsArray() extras?: { type: string; amount: number }[]
  @IsOptional() @IsString() @MaxLength(200) note?: string
}

export class UpdateLedgerOrderDto {
  @IsOptional() @IsString() customerId?: string
  @IsOptional() @IsString() @MaxLength(40) customerName?: string
  @IsOptional() @IsDateString() date?: string
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) total?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) extraIncome?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costProfile?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costGlass?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costHardware?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costLabor?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costScreen?: number
  @IsOptional() @IsArray() extras?: { type: string; amount: number }[]
  @IsOptional() @IsString() @MaxLength(200) note?: string
}

export class OrderQueryDto {
  @IsOptional() @IsString() customer?: string
  @IsOptional() @IsDateString() dateFrom?: string
  @IsOptional() @IsDateString() dateTo?: string
  @IsOptional() @IsString() profitMin?: string
  @IsOptional() @IsString() profitMax?: string
  @IsOptional() @IsString() sort?: string // 'date' | 'profit'
  @IsOptional() @IsString() page?: string
  @IsOptional() @IsString() pageSize?: string
}
