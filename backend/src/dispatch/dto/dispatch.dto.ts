import { IsOptional, IsString, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { DeliveryDropStatus } from '../../generated/prisma/enums.js';
import { Type } from 'class-transformer';

export class DispatchQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(DeliveryDropStatus)
  status?: DeliveryDropStatus;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export class AssignDriverDto {
  @IsUUID()
  driverId: string;
}
