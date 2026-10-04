import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

/**
 * Same strength as the seeded reviewer passwords (e.g. Test@1234): 8-72
 * characters (bcrypt's limit) with an upper-case letter, a lower-case letter,
 * a digit and a symbol.
 */
export const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
export const PASSWORD_POLICY_MESSAGE =
  'password must be 8-72 characters and include an upper-case letter, a lower-case letter, a digit and a symbol.';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class StaffQueryDto extends PaginationQueryDto {}

export class CreateStaffDto {
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsUUID('all')
  roleId!: string;

  @IsString()
  @Matches(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsUUID('all')
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
