import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateMenuCategoryDto {
  @IsString() @MaxLength(120) name!: string;
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
  @Type(() => Number) @IsInt() @Min(0) displayOrder!: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isSecret?: boolean;
}

export class UpdateMenuCategoryDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isSecret?: boolean;
}

export class MenuCategoryItemDto {
  @IsUUID() dishId!: string;
  @Type(() => Number) @IsInt() @Min(0) displayOrder!: number;
  @IsBoolean() isActive!: boolean;
}

export class ReplaceMenuItemsDto {
  @IsArray()
  @ArrayUnique((item: MenuCategoryItemDto) => item.dishId)
  @ValidateNested({ each: true })
  @Type(() => MenuCategoryItemDto)
  items!: MenuCategoryItemDto[];
}
