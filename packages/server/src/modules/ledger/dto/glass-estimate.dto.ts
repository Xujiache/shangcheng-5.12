import { IsIn, IsNumber, IsOptional, Max, Min, ValidateIf } from 'class-validator'

export class GlassEstimateDto {
  @IsIn(['hollow', 'vacuum']) type!: 'hollow' | 'vacuum'
  @IsNumber() @Min(2) @Max(25) outerMm!: number
  @IsNumber() @Min(2) @Max(25) innerMm!: number
  @IsNumber() @Min(0.1) @Max(30) gapMm!: number
  @ValidateIf((o) => o.type === 'hollow') @IsIn(['air', 'argon']) gas?: 'air' | 'argon'
  @IsIn(['none', 'surface2', 'surface3']) coating!: 'none' | 'surface2' | 'surface3'
  @ValidateIf((o) => o.coating !== 'none') @IsNumber() @Min(0.01) @Max(0.84) emissivity?: number
  @ValidateIf((o) => o.type === 'vacuum') @IsNumber() @Min(0.001) @Max(100) vacuumPressurePa?: number
  @ValidateIf((o) => o.type === 'vacuum') @IsNumber() @Min(0.1) @Max(1) pillarDiameterMm?: number
  @ValidateIf((o) => o.type === 'vacuum') @IsNumber() @Min(10) @Max(50) pillarPitchMm?: number
  @IsOptional() @IsNumber() @Min(5) @Max(50) outsideH?: number
  @IsOptional() @IsNumber() @Min(2) @Max(20) insideH?: number
}
