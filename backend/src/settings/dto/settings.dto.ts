import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DayOfWeek } from '../../generated/prisma/enums.js';

export class UpdatePlatformSettingsDto {
  /** HH:MM in 24-hour format */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'cutoffTime must be HH:MM (24-hour).',
  })
  cutoffTime?: string;

  /** 0 means the cutoff falls on the delivery date itself. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  cutoffWorkingDayCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessTimezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  kitchenReadyBufferMinutes?: number;

  /** 0 is valid: work is never "at risk", only on track or late. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  atRiskWindowMinutes?: number;
}

export class UpsertKitchenWorkingDaysDto {
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  days!: DayOfWeek[];
}

export class CreateKitchenHolidayDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD.' })
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}
