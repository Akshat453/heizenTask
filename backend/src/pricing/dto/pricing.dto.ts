import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PriceTierStrategy } from '../../generated/prisma/enums.js';

export class CreatePriceTierDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsEnum(PriceTierStrategy) strategy!: PriceTierStrategy;
  @IsOptional() @IsUUID() sourceTierId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) costMultiplierBps?:
    number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(-9_999) sourceAdjustmentBps?:
    number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdatePriceTierDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsEnum(PriceTierStrategy) strategy?: PriceTierStrategy;
  @IsOptional() @IsUUID() sourceTierId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) costMultiplierBps?:
    number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(-9_999) sourceAdjustmentBps?:
    number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class PriceOverrideDto {
  @IsUUID() itemId!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) priceCents!: number | null;
}

export class UpdateTierPricesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceOverrideDto)
  dishOverrides!: PriceOverrideDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceOverrideDto)
  optionOverrides!: PriceOverrideDto[];
}
