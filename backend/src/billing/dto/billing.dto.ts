import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { InvoiceStatus } from '../../generated/prisma/enums.js';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsUUID()
  companyId: string;

  @IsArray()
  @IsUUID('all', { each: true })
  orderIds: string[];
}

export class InvoiceQueryDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
