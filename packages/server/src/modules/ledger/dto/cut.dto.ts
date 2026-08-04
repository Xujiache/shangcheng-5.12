import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator'

/** 优化下料方案的材料类型：型材(1D) / 玻璃 / 板材(2D)。 */
export const CUT_MATERIALS = ['profile', 'glass', 'board'] as const

/**
 * 新建下料方案。input/summary 为不定形 JSON（service 再做体积上限保护）。
 * 注意：全局 ValidationPipe whitelist=true 会剥离未加装饰器的字段，故每个字段都需装饰器。
 */
export class CreateCutPlanDto {
  @IsString() @MaxLength(40) title!: string
  @IsString() @IsIn(CUT_MATERIALS) material!: string
  /** 完整可重算入参（1D/2D 两种形态），由前端继续编辑时回填 */
  @IsObject() input!: Record<string, any>
  /** 列表展示快照 {material,count,util,units} */
  @IsObject() summary!: Record<string, any>
}

/** 更新下料方案。全部可选，仅更新传入字段。 */
export class UpdateCutPlanDto {
  @IsOptional() @IsString() @MaxLength(40) title?: string
  @IsOptional() @IsString() @IsIn(CUT_MATERIALS) material?: string
  @IsOptional() @IsObject() input?: Record<string, any>
  @IsOptional() @IsObject() summary?: Record<string, any>
}
