import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class LedgerLoginDto {
  @IsString() phone!: string
  @IsString() @MinLength(6) password!: string
}

/** App 自助注册（#10）。inviteCode 选填——带上则邀请人获赠会员天数。 */
export class LedgerRegisterDto {
  @IsString() phone!: string
  @IsString() @MinLength(6) password!: string
  @IsOptional() @IsString() @MaxLength(20) nickname?: string
  @IsOptional() @IsString() @MaxLength(32) inviteCode?: string
}

export class LedgerSmsCodeDto {
  @IsString() phone!: string
}

export class LedgerSmsLoginDto {
  @IsString() phone!: string
  @IsString() code!: string
}

export class LedgerChangePasswordDto {
  @IsOptional() @IsString() oldPassword?: string
  @IsString() @MinLength(6) newPassword!: string
}

/** 微信一键登录：wx.login 拿到的 code（后端换 openid） */
export class WechatLoginDto {
  @IsString() code!: string
}

/** 绑定微信：wx.login 的 code + 登录密码确认身份 */
export class WechatBindDto {
  @IsString() code!: string
  @IsString() @MinLength(6) password!: string
}

/** 解绑微信：登录密码确认 */
export class WechatUnbindDto {
  @IsString() @MinLength(6) password!: string
}
