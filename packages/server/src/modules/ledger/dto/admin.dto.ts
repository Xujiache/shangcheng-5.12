import {
  IsArray,
  IsBoolean,
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

/** 首页广告 banner（#2）。image 为公网图片 URL。 */
export class CreateLedgerAdDto {
  @IsString() @IsNotEmpty({ message: '请填写图片地址' }) @MaxLength(500) image!: string
  @IsOptional() @IsString() @MaxLength(40) title?: string
  @IsOptional() @IsString() @MaxLength(500) link?: string
  @IsOptional() @IsInt() @Min(0) @Max(9999) sort?: number
  @IsOptional() @IsBoolean() enabled?: boolean
}

export class UpdateLedgerAdDto {
  @IsOptional() @IsString() @MaxLength(500) image?: string
  @IsOptional() @IsString() @MaxLength(40) title?: string
  @IsOptional() @IsString() @MaxLength(500) link?: string
  @IsOptional() @IsInt() @Min(0) @Max(9999) sort?: number
  @IsOptional() @IsBoolean() enabled?: boolean
}

/** ledger 全局功能配置（优化下料试用 / 邀请奖励 / 自助注册开关）。 */
export class UpdateLedgerConfigDto {
  @IsOptional() @IsBoolean() allowSelfRegister?: boolean
  @IsOptional() @IsInt() @Min(0) @Max(3650) inviteRewardDays?: number
  @IsOptional() @IsInt() @Min(0) @Max(100000) inviteMaxRewarded?: number
  @IsOptional() @IsInt() @Min(0) @Max(3650) cutTrialDays?: number
  @IsOptional() @IsBoolean() cutRequireMembership?: boolean
  // 会员套餐数组 [{key,label,days,price}]；服务端 normalizeLedgerPlans 逐项收口 + 去重
  @IsOptional() @IsArray() plans?: { key: string; label: string; days: number; price: string }[]
}

/** 后台 AI 生图（gpt-image-2）。size/quality 见聚鑫科技文档枚举。 */
export class GenAiImageDto {
  @IsString() @IsNotEmpty({ message: '请填写提示词' }) @MaxLength(2000) prompt!: string
  @IsOptional()
  @IsIn([
    'auto',
    '1024x1024',
    '1536x1024',
    '1024x1536',
    '1920x1088',
    '1088x1920',
    '1280x960',
    '960x1280',
    '2048x2048',
  ])
  size?: string
  @IsOptional() @IsIn(['auto', 'high', 'medium', 'low']) quality?: string
}
