import {
  ArrayMaxSize,
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
  /** 有明细(items)时由服务端按 金额−优惠 计算；无明细时必填 */
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) total?: number
  /** 收款（元）：定金之外后续已收金额，仅影响未收，不计入利润 */
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) received?: number

  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costProfile?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costGlass?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costHardware?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costLabor?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costScreen?: number

  // 数组上限与服务端 sanitize* 截断一致（超限直接 400，截断仅作兜底）
  @IsOptional() @IsArray() @ArrayMaxSize(50) extras?: { type: string; amount: number }[]
  @IsOptional() @IsArray() @ArrayMaxSize(20) customCosts?: { name: string; amount: number }[]
  @IsOptional() @IsArray() @ArrayMaxSize(100) items?: any[]
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) discount?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) recycle?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) deposit?: number
  @IsOptional() @IsString() @MaxLength(200) note?: string
}

export class UpdateLedgerOrderDto {
  @IsOptional() @IsString() customerId?: string
  @IsOptional() @IsString() @MaxLength(40) customerName?: string
  @IsOptional() @IsDateString() date?: string
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) total?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) received?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costProfile?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costGlass?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costHardware?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costLabor?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) costScreen?: number
  @IsOptional() @IsArray() @ArrayMaxSize(50) extras?: { type: string; amount: number }[]
  @IsOptional() @IsArray() @ArrayMaxSize(20) customCosts?: { name: string; amount: number }[]
  @IsOptional() @IsArray() @ArrayMaxSize(100) items?: any[]
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) discount?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) recycle?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) deposit?: number
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
