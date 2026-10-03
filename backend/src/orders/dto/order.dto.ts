import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  ValidateNested,
  IsArray,
  IsString,
  IsDateString,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../../generated/prisma/enums.js';

export class OrderCombinationOptionDto {
  @IsUUID()
  optionGroupId: string;

  @IsUUID()
  optionId: string;

  @IsOptional()
  @IsUUID()
  portionSizeId?: string;
}

export class OrderCombinationDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderCombinationOptionDto)
  options: OrderCombinationOptionDto[];
}

export class OrderLineDto {
  @IsUUID()
  dishId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderCombinationDto)
  combinations: OrderCombinationDto[];
}

export class CreateOrderDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  deliveryDate: string;

  @IsBoolean()
  placeOrder: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}

export class UpdateOrderDto {
  @IsOptional()
  @IsBoolean()
  placeOrder?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines?: OrderLineDto[];
}

export class OrderQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsDateString()
  deliveryDateFrom?: string;

  @IsOptional()
  @IsDateString()
  deliveryDateTo?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  invoiced?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

export class OverrideDeliveryDetailsDto {
  @IsOptional()
  @IsUUID()
  deliveryAddressId?: string;

  @IsOptional()
  @IsDateString()
  deliveryAt?: string;

  @IsOptional()
  @IsUUID()
  packagingTypeId?: string;
}

export class RejectOrderDto {
  @IsString()
  rejectionReason: string;
}

export class ProcessCutoffDto {
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
}
