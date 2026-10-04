import { IsOptional, IsString } from 'class-validator';
import { IsBusinessDate } from '../../business-time/business-date.validator.js';

export class KitchenQueryDto {
  @IsBusinessDate()
  date: string;

  @IsOptional()
  @IsString()
  stationId?: string;
}
