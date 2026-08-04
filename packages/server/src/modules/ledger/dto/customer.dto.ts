import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateLedgerCustomerDto {
  @IsString() @MaxLength(40) name!: string
  @IsOptional() @IsString() @MaxLength(20) phone?: string
  @IsOptional() @IsString() @MaxLength(120) address?: string
  @IsOptional() @IsString() @MaxLength(200) note?: string
}

export class UpdateLedgerCustomerDto {
  @IsOptional() @IsString() @MaxLength(40) name?: string
  @IsOptional() @IsString() @MaxLength(20) phone?: string
  @IsOptional() @IsString() @MaxLength(120) address?: string
  @IsOptional() @IsString() @MaxLength(200) note?: string
}
