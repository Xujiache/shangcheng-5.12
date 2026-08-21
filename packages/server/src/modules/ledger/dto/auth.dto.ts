import { IsOptional, IsString, MaxLength } from 'class-validator'

/** 微信一键登录：wx.login 拿到的 code（后端换 openid） */
export class WechatLoginDto {
  @IsString() code!: string
  /** 分享链路携带；仅首次建立微信账号时消费。 */
  @IsOptional() @IsString() @MaxLength(32) inviteCode?: string
}
