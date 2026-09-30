import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNumber, Max, Min, ValidateIf, ValidateNested } from 'class-validator'

export class GlassPaneDto {
  @IsNumber() @Min(2) @Max(25) thicknessMm!: number
  @ValidateIf((o) => o.frontEmissivity !== undefined) @IsNumber() @Min(0.01) @Max(0.84) frontEmissivity?: number
  @ValidateIf((o) => o.backEmissivity !== undefined) @IsNumber() @Min(0.01) @Max(0.84) backEmissivity?: number
}

export class GlassGapDto {
  @IsIn(['hollow', 'vacuum']) type!: 'hollow' | 'vacuum'
  @IsNumber() @Min(0.1) @Max(30) thicknessMm!: number
  @ValidateIf((o) => o.type === 'hollow') @IsIn(['air', 'argon']) gas?: 'air' | 'argon'
  @ValidateIf((o) => o.type === 'vacuum') @IsNumber() @Min(0.001) @Max(100) vacuumPressurePa?: number
  @ValidateIf((o) => o.type === 'vacuum') @IsNumber() @Min(0.1) @Max(1) pillarDiameterMm?: number
  @ValidateIf((o) => o.type === 'vacuum') @IsNumber() @Min(10) @Max(50) pillarPitchMm?: number
}

const layered = (o: GlassEstimateDto) => o.panes !== undefined || o.gaps !== undefined
const legacy = (o: GlassEstimateDto) => !layered(o)

export class GlassEstimateDto {
  @ValidateIf(layered) @IsArray() @ArrayMinSize(2) @ArrayMaxSize(20)
  @ValidateNested({ each: true }) @Type(() => GlassPaneDto) panes?: GlassPaneDto[]
  @ValidateIf(layered) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(19)
  @ValidateNested({ each: true }) @Type(() => GlassGapDto) gaps?: GlassGapDto[]

  // Keep the two-pane payload accepted by released mini-program versions.
  @ValidateIf(legacy) @IsIn(['hollow', 'vacuum']) type?: 'hollow' | 'vacuum'
  @ValidateIf(legacy) @IsNumber() @Min(2) @Max(25) outerMm?: number
  @ValidateIf(legacy) @IsNumber() @Min(2) @Max(25) innerMm?: number
  @ValidateIf(legacy) @IsNumber() @Min(0.1) @Max(30) gapMm?: number
  @ValidateIf((o) => legacy(o) && o.type === 'hollow') @IsIn(['air', 'argon']) gas?: 'air' | 'argon'
  @ValidateIf(legacy) @IsIn(['none', 'surface2', 'surface3']) coating?: 'none' | 'surface2' | 'surface3'
  @ValidateIf((o) => legacy(o) && o.coating !== 'none') @IsNumber() @Min(0.01) @Max(0.84) emissivity?: number
  @ValidateIf((o) => legacy(o) && o.type === 'vacuum') @IsNumber() @Min(0.001) @Max(100) vacuumPressurePa?: number
  @ValidateIf((o) => legacy(o) && o.type === 'vacuum') @IsNumber() @Min(0.1) @Max(1) pillarDiameterMm?: number
  @ValidateIf((o) => legacy(o) && o.type === 'vacuum') @IsNumber() @Min(10) @Max(50) pillarPitchMm?: number
  @ValidateIf((o) => o.outsideH !== undefined) @IsNumber() @Min(5) @Max(50) outsideH?: number
  @ValidateIf((o) => o.insideH !== undefined) @IsNumber() @Min(2) @Max(20) insideH?: number
}
