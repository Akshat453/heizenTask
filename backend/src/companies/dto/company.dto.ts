import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { DayOfWeek } from '../../generated/prisma/enums.js';

export class CompanyQueryDto extends PaginationQueryDto {}

export class CompanyAddressInputDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @MaxLength(120) label!: string;
  @IsString() @MaxLength(200) line1!: string;
  @IsOptional() @IsString() @MaxLength(200) line2?: string | null;
  @IsString() @MaxLength(120) city!: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string | null;
  @IsOptional() @IsString() @MaxLength(32) postalCode?: string | null;
  @IsString() @MaxLength(120) country!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CompanyHolidayInputDto {
  @IsOptional() @IsUUID() id?: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string | null;
}

export class OwnerEmployeeInputDto {
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string | null;
  @IsOptional() @IsBoolean() canChooseDeliveryAddress?: boolean;
  @IsOptional() @IsBoolean() canChangeDeliveryTime?: boolean;
  @IsOptional() @IsBoolean() canChangePackaging?: boolean;
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  allergenIds!: string[];
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  dietaryTagIds!: string[];
}

export class CreateCompanyDto {
  @IsString() @MaxLength(180) name!: string;
  @IsString() @MaxLength(160) billingContactName!: string;
  @IsEmail() @MaxLength(320) billingContactEmail!: string;
  @IsOptional() @IsString() @MaxLength(40) billingContactPhone?: string | null;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  domains!: string[];
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompanyAddressInputDto)
  addresses!: CompanyAddressInputDto[];
  @ValidateNested()
  @Type(() => OwnerEmployeeInputDto)
  owner!: OwnerEmployeeInputDto;
  @IsOptional() @IsUUID() priceTierId?: string | null;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) defaultDeliveryTime!: string;
  @Type(() => Number) @IsInt() @Min(0) deliveryLeadMinutes!: number;
  @IsUUID() defaultPackagingTypeId!: string;
  @IsOptional() @IsString() @MaxLength(1_000) driverInstructions?:
    string | null;
  @IsOptional() @IsUUID() defaultDriverStaffUserId?: string | null;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(DayOfWeek, { each: true })
  workingDays!: DayOfWeek[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyHolidayInputDto)
  holidays!: CompanyHolidayInputDto[];
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  hiddenCategoryIds!: string[];
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  hiddenDishIds!: string[];
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsString() @MaxLength(160) billingContactName?: string;
  @IsOptional() @IsEmail() @MaxLength(320) billingContactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) billingContactPhone?: string | null;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  domains?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompanyAddressInputDto)
  addresses?: CompanyAddressInputDto[];
  @IsOptional() @IsUUID() ownerEmployeeId?: string;
  @IsOptional() @IsUUID() priceTierId?: string | null;
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  defaultDeliveryTime?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryLeadMinutes?: number;
  @IsOptional() @IsUUID() defaultPackagingTypeId?: string;
  @IsOptional() @IsString() @MaxLength(1_000) driverInstructions?:
    string | null;
  @IsOptional() @IsUUID() defaultDriverStaffUserId?: string | null;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(DayOfWeek, { each: true })
  workingDays?: DayOfWeek[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyHolidayInputDto)
  holidays?: CompanyHolidayInputDto[];
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  hiddenCategoryIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  hiddenDishIds?: string[];
}
