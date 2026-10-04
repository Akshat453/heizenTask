import { IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';
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

  /** A driver's StaffUser id, or "none" for drops without a driver. */
  @IsOptional()
  @ValidateIf((dto: DispatchQueryDto) => dto.driverId !== 'none')
  @IsUUID('all', { message: 'driverId must be a UUID or "none".' })
  driverId?: string;
}

export class AssignDriverDto {
  @IsUUID()
  driverId: string;
}
