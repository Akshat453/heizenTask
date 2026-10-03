import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class EmployeeQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() companyId?: string;
}

export class CreateEmployeeDto {
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string | null;
  @IsOptional() @IsUUID() defaultDeliveryAddressId?: string | null;
  @IsBoolean() canChooseDeliveryAddress!: boolean;
  @IsBoolean() canChangeDeliveryTime!: boolean;
  @IsBoolean() canChangePackaging!: boolean;
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) allergenIds!: string[];
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) dietaryTagIds!: string[];
}

export class UpdateEmployeeDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string | null;
  @IsOptional() @IsUUID() defaultDeliveryAddressId?: string | null;
  @IsOptional() @IsBoolean() canChooseDeliveryAddress?: boolean;
  @IsOptional() @IsBoolean() canChangeDeliveryTime?: boolean;
  @IsOptional() @IsBoolean() canChangePackaging?: boolean;
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) allergenIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) dietaryTagIds?: string[];
}
