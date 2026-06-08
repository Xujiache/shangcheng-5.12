import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

const MONEY_MAX = 1_000_000_000_000

export class UpdateLedgerGoalDto {
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) monthly?: number
  @IsOptional() @IsInt() @Min(0) @Max(MONEY_MAX) yearly?: number
}

export class UpdateLedgerProfileDto {
  @IsOptional() @IsString() @MaxLength(20) nickname?: string
  @IsOptional() @IsString() @MaxLength(500) avatar?: string
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** 偏好设置（通知开关 / 免打扰 / 隐私），全部可选，仅更新传入字段。 */
export class UpdateLedgerSettingDto {
  @IsOptional() @IsBoolean() notifyOrder?: boolean
  @IsOptional() @IsBoolean() notifyReport?: boolean
  @IsOptional() @IsBoolean() notifyGoal?: boolean
  @IsOptional() @IsBoolean() notifySystem?: boolean
  @IsOptional() @IsBoolean() dndEnabled?: boolean
  @IsOptional() @Matches(HHMM, { message: 'dndStart 需为 HH:mm' }) dndStart?: string
  @IsOptional() @Matches(HHMM, { message: 'dndEnd 需为 HH:mm' }) dndEnd?: string
  @IsOptional() @IsBoolean() hideAmount?: boolean
  @IsOptional() @IsBoolean() bioLock?: boolean
  @IsOptional() @IsBoolean() encBackup?: boolean
}

/** 提交意见反馈（含注销/换号申请）。 */
export class CreateLedgerFeedbackDto {
  @IsString() @IsNotEmpty({ message: '请填写反馈内容' }) @MaxLength(1000) content!: string
  @IsOptional() @IsString() @MaxLength(40) contact?: string
  @IsOptional() @IsIn(['general', 'delete_account', 'phone_change']) type?: string
}
