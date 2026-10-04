import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  ValidateNested,
  IsArray,
  IsString,
  IsBoolean,
  IsEnum,
  IsISO8601,
  Matches,
  ArrayNotEmpty,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BooleanQuery } from '../../common/decorators/boolean-query.decorator.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { LOCAL_TIME_PATTERN } from '../../business-time/business-time.utils.js';
import { IsBusinessDate } from '../../business-time/business-date.validator.js';

const DELIVERY_TIME_MESSAGE =
  'deliveryTime must be HH:mm (24-hour, business-local).';

/** Optional delivery choices; omitted fields keep defaults (create) or the current selection (update). */
class DeliveryChoicesDto {
  @IsOptional()
  @IsUUID()
  deliveryAddressId?: string;

  @IsOptional()
  @IsString()
  @Matches(LOCAL_TIME_PATTERN, { message: DELIVERY_TIME_MESSAGE })
  deliveryTime?: string;

  @IsOptional()
  @IsUUID()
  packagingTypeId?: string;
}

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

  /** Must equal the sum of the combination quantities. */
  @IsInt()
  @Min(1)
  quantity: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderCombinationDto)
  combinations: OrderCombinationDto[];
}

export class CreateOrderDto extends DeliveryChoicesDto {
  @IsUUID()
  employeeId: string;

  @IsBusinessDate()
  deliveryDate: string;

  @IsBoolean()
  placeOrder: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}

export class UpdateOrderDto extends DeliveryChoicesDto {
  /** true places a DRAFT. Never reverts a PLACED Order to DRAFT. */
  @IsOptional()
  @IsBoolean()
  placeOrder?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
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
  @IsBusinessDate()
  deliveryDateFrom?: string;

  @IsOptional()
  @IsBusinessDate()
  deliveryDateTo?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @BooleanQuery()
  invoiced?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  /** Orders attached to one Delivery Drop. */
  @IsOptional()
  @IsUUID('all')
  deliveryDropId?: string;
}

export class OverrideDeliveryDetailsDto {
  @IsOptional()
  @IsUUID()
  deliveryAddressId?: string;

  /** Exact delivery instant with an explicit offset (e.g. 2026-10-05T13:00:00+05:30 or ...Z). */
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message: 'deliveryAt must include an explicit UTC offset (Z or ±HH:mm).',
  })
  deliveryAt?: string;

  @IsOptional()
  @IsUUID()
  packagingTypeId?: string;
}

export class RejectOrderDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}

export class ProcessCutoffDto {
  @IsOptional()
  @IsBusinessDate()
  deliveryDate?: string;
}
