import { IsOptional, IsString, MinLength } from 'class-validator'

export class LedgerLoginDto {
  @IsString() phone!: string
  @IsString() @MinLength(6) password!: string
}

export class LedgerSmsCodeDto {
  @IsString() phone!: string
}

export class LedgerSmsLoginDto {
  @IsString() phone!: string
  @IsString() code!: string
}

export class LedgerChangePasswordDto {
  @IsOptional() @IsString() oldPassword?: string
  @IsString() @MinLength(6) newPassword!: string
}
