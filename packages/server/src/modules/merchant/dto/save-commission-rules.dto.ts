import { IsArray, IsObject, IsOptional } from 'class-validator'

/**
 * 保存佣金规则。saveCommissionRules 按名读取：
 *   - dto.default.{ level1Percent, level2Percent, visibleToPromoter, allowOffline, enabled }
 *   - dto.productRules[].{ productId, level1Percent, level2Percent,
 *                          visibleToPromoter, allowOffline, enabled }
 *
 * 这两个顶层属性是普通对象/数组（非嵌套 DTO 类），service 内部已对每个
 * 子字段做显式 Number()/!! 清洗并只写真实存在的列，故无需也不应在此做
 * @ValidateNested 深层 whitelist —— 那会反而剥离 service 实际读取的子字段。
 *
 * 仅声明这两个顶层属性即可让 whitelist 放行它们及其内部对象内容。
 */
export class SaveCommissionRulesDto {
  @IsOptional() @IsObject() default?: Record<string, any>
  @IsOptional() @IsArray() productRules?: Record<string, any>[]
}
