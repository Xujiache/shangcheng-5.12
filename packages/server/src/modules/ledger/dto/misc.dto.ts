import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

const MONEY_MAX = 1_000_000_000_000

export class UpdateLedgerGoalDto {
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) monthly?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) yearly?: number
}

export class UpdateLedgerProfileDto {
  @IsOptional() @IsString() @MaxLength(20) nickname?: string
  @IsOptional() @IsString() @MaxLength(500) avatar?: string
}
