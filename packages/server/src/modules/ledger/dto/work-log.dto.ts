import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

const MONEY_MAX = 1_000_000_000_000
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** 独立日工明细；金额由服务端用 quantity × unitPrice 计算。 */
export class CreateLedgerWorkLogDto {
  @IsDateString() workDate!: string
  @IsString() @MaxLength(30) workerName!: string
  @IsOptional() @IsString() @MaxLength(30) jobType?: string
  @IsIn(['day', 'hour']) unit!: 'day' | 'hour'
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100000) quantity!: number
  @IsInt() @Min(0) @Max(MONEY_MAX) unitPrice!: number
  @IsOptional() @IsString() @MaxLength(200) note?: string
}

export class UpdateLedgerWorkLogDto {
  @IsOptional() @IsDateString() workDate?: string
  @IsOptional() @IsString() @MaxLength(30) workerName?: string
  @IsOptional() @IsString() @MaxLength(30) jobType?: string
  @IsOptional() @IsIn(['day', 'hour']) unit?: 'day' | 'hour'
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100000) quantity?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) unitPrice?: number
  @IsOptional() @IsString() @MaxLength(200) note?: string
}

export class WorkLogQueryDto {
  @Matches(MONTH, { message: 'month 需为 YYYY-MM' }) month!: string
}
