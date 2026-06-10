import { IsArray, IsIn, IsNumber, IsOptional, IsString } from 'class-validator'

/**
 * POST /u/orders/:id/refund
 * service refundOrder(userId, id, dto) 读取：
 *   - dto.reason       必填（trim 后为空即抛 INVALID_PARAMS）
 *   - dto.amount       可选 number（缺省取订单实付金额）
 *   - dto.orderItemId  可选（指定退某一行）
 *   - dto.description  可选（slice(0,500) 落库）
 *   - dto.evidence     可选 string[]（过滤后取前 9 条）
 *   - dto.type         可选 'refund_only' | 'refund_with_return'（其它值兜底为 refund_with_return）
 */
export class RefundOrderDto {
  @IsString() reason!: string
  @IsOptional() @IsNumber() amount?: number
  @IsOptional() @IsString() orderItemId?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsArray() @IsString({ each: true }) evidence?: string[]
  @IsOptional() @IsIn(['refund_only', 'refund_with_return']) type?:
    | 'refund_only'
    | 'refund_with_return'
}
