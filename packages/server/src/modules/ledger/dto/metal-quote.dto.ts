import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator'

const CATEGORIES = ['plate', 'section', 'squareTube', 'flatBar', 'roundTube', 'roundBar'] as const

export class MetalQuoteItemDto {
  @IsString() @MaxLength(80) materialId!: string
  @IsIn(CATEGORIES) category!: typeof CATEGORIES[number]
  @IsObject() spec!: Record<string, number | string>
  @IsNumber() @Min(0.01) @Max(30) density!: number
  @IsNumber() @Min(0.01) @Max(100) quoteFactor!: number
  @IsInt() @Min(0) @Max(999_999_900) processingFeeFen!: number
  @IsOptional() @IsString() @IsIn(['angle', 'channel', 'ibeam', 'hbeam', 'cpurlin', 'aluminum']) sectionShape?: string
  @IsOptional() @IsBoolean() estimateSection?: boolean
}

export class CreateMetalQuoteDto {
  @IsString() @MaxLength(60) title!: string
  @IsOptional() @IsString() @MaxLength(80) customerId?: string
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200)
  @ValidateNested({ each: true }) @Type(() => MetalQuoteItemDto)
  items!: MetalQuoteItemDto[]
}

export class MetalQuoteQueryDto {
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) @Max(100_000) skip?: number
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(50) take?: number
}
