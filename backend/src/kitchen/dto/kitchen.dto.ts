import { IsDateString, IsOptional, IsString } from 'class-validator';

export class KitchenQueryDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  stationId?: string;
}
