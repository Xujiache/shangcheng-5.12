import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

/** 后台建号。password 缺省则系统生成随机初始密码并回传。 */
export class CreateLedgerUserDto {
  @IsString() phone!: string
  @IsOptional() @IsString() @MinLength(6) @MaxLength(64) password?: string
  @IsOptional() @IsString() @MaxLength(20) nickname?: string
}

export class UpdateLedgerUserDto {
  @IsOptional() @IsString() @MaxLength(20) nickname?: string
  @IsOptional() @IsString() status?: string // active / disabled
}

/**
 * 增加会员时长。planKey 与 days 二选一（同传则 days 优先）：
 * - planKey ∈ day/week/month/quarter/year（按 LEDGER_PLAN_DAYS 取天数）
 * - days 自定义天数（可正可负；负数=扣减/纠错）
 */
export class GrantMembershipDto {
  @IsOptional() @IsString() planKey?: string
  @IsOptional() @IsInt() @Min(-3650) @Max(3650) days?: number
  @IsOptional() @IsString() note?: string
}

/** 后台向某记账账号推送一条应用内通知。 */
export class PushNotificationDto {
  @IsString() @IsNotEmpty({ message: '请填写标题' }) @MaxLength(40) title!: string
  @IsString() @IsNotEmpty({ message: '请填写内容' }) @MaxLength(500) body!: string
  @IsOptional() @IsString() @MaxLength(20) type?: string
}

/** 后台处理反馈：标记状态 / 填写回复备注。 */
export class UpdateLedgerFeedbackDto {
  @IsOptional() @IsIn(['open', 'resolved']) status?: string
  @IsOptional() @IsString() @MaxLength(500) reply?: string
}
