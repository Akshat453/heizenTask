import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { IsBusinessDate } from '../../business-time/business-date.validator.js';
import { DeliveryDropStatus } from '../../generated/prisma/enums.js';

export class DispatchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsBusinessDate()
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
