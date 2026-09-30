import { ArrayMaxSize, ArrayMinSize, IsArray, IsNumber, Max, Min } from 'class-validator'

export class GlassWeightDto {
  @IsNumber() @Min(0.001) @Max(100000) heightMm!: number
  @IsNumber() @Min(0.001) @Max(100000) widthMm!: number
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20)
  @IsNumber({}, { each: true }) @Min(0.1, { each: true }) @Max(100, { each: true }) thicknessesMm!: number[]
}
