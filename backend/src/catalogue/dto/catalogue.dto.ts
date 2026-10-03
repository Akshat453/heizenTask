import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Temperature } from '../../generated/prisma/enums.js';

export class DishQueryDto extends PaginationQueryDto {
  @IsOptional() @IsBoolean() @Type(() => Boolean) isActive?: boolean;
  @IsOptional() @IsEnum(Temperature) temperature?: Temperature;
  @IsOptional() @IsUUID() stationId?: string;
}

export class OptionGroupOptionInputDto {
  @IsUUID() optionId!: string;
  @Type(() => Number) @IsInt() @Min(0) displayOrder!: number;
}

export class OptionGroupPortionInputDto {
  @IsUUID() portionSizeId!: string;
  @Type(() => Number) @IsInt() @Min(0) extraChargeCents!: number;
  @Type(() => Number) @IsInt() @Min(0) displayOrder!: number;
}

export class OptionGroupInputDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @MaxLength(120) name!: string;
  @IsBoolean() isRequired!: boolean;
  @IsBoolean() usesPortions!: boolean;
  @Type(() => Number) @IsInt() @Min(0) displayOrder!: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OptionGroupOptionInputDto) options!: OptionGroupOptionInputDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => OptionGroupPortionInputDto) portions!: OptionGroupPortionInputDto[];
}

export class CreateDishDto {
  @IsString() @MaxLength(160) name!: string;
  @IsString() @MaxLength(2_000) description!: string;
  @IsUrl({ require_protocol: true }) @MaxLength(1_000) imageUrl!: string;
  @IsString() @MaxLength(80) sku!: string;
  @IsEnum(Temperature) temperature!: Temperature;
  @Type(() => Number) @IsInt() @Min(0) costCents!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) minimumOrderQuantity?: number | null;
  @IsOptional() @IsUUID() stationId?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) allergenIds!: string[];
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) dietaryTagIds!: string[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => OptionGroupInputDto) optionGroups!: OptionGroupInputDto[];
}

export class UpdateDishDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(2_000) description?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(1_000) imageUrl?: string;
  @IsOptional() @IsString() @MaxLength(80) sku?: string;
  @IsOptional() @IsEnum(Temperature) temperature?: Temperature;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) costCents?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) minimumOrderQuantity?: number | null;
  @IsOptional() @IsUUID() stationId?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) allergenIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) dietaryTagIds?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OptionGroupInputDto) optionGroups?: OptionGroupInputDto[];
}

export class CreateOptionDto {
  @IsString() @MaxLength(160) name!: string;
  @Type(() => Number) @IsInt() @Min(0) costCents!: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) allergenIds!: string[];
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) dietaryTagIds!: string[];
}

export class UpdateOptionDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) costCents?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) allergenIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) dietaryTagIds?: string[];
}
