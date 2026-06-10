import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * 创建提现申请。
 *
 * 服务端 createWithdraw 只按名读取以下字段：
 *   - dto.amount  → applyAmount（必填金额，元）
 *   - dto.method  → method（缺省 'wechat'）
 *   - dto.account → 收款账号
 * 无 dto 展开，故安全 whitelist。method/account 全可选以兼容历史调用。
 */
export class CreateWithdrawDto {
  @IsOptional() @IsNumber() amount?: number
  @IsOptional() @IsIn(['wechat', 'bank', 'alipay']) method?: string
  @IsOptional() @IsString() @MaxLength(200) account?: string
}
