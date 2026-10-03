import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { Temporal } from '@js-temporal/polyfill';
import { CreateOrderDto, OrderLineDto } from '../dto/order.dto.js';
import { DayOfWeek } from '../../generated/prisma/enums.js';

const ISO_TO_DAY: Record<number, DayOfWeek> = {
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
  7: DayOfWeek.SUNDAY,
};

@Injectable()
export class OrderValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
  ) {}

  async validateOrderGraph(
    employeeId: string,
    deliveryDateIso: string,
    lines: OrderLineDto[],
  ) {
    // 1. Employee & Company
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: {
          include: {
            workingDays: true,
            holidays: {
              where: { date: new Date(deliveryDateIso) },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const company = employee.company;
    const companyId = company.id;

    // 2. Delivery Date validation
    const isOpen = await this.businessTime.isDeliveryDateOpen(deliveryDateIso);
    if (!isOpen) {
      throw new ConflictException('Cutoff time for this delivery date has already passed');
    }

    const plainDate = Temporal.PlainDate.from(deliveryDateIso);
    const dayOfWeek = ISO_TO_DAY[plainDate.dayOfWeek];
    if (!dayOfWeek) {
      throw new BadRequestException('Invalid delivery date format');
    }

    const isWorkingDay = company.workingDays.some(wd => wd.dayOfWeek === dayOfWeek);
    if (!isWorkingDay) {
      throw new ConflictException('Company does not accept deliveries on this day of the week');
    }

    if (company.holidays.length > 0) {
      throw new ConflictException('Delivery date is a company holiday');
    }

    // 3. Address validation
    if (!employee.defaultDeliveryAddressId) {
      throw new ConflictException('Employee has no default delivery address');
    }

    const address = await this.prisma.companyAddress.findUnique({
      where: { id: employee.defaultDeliveryAddressId },
    });
    if (!address || address.companyId !== companyId || !address.isActive) {
      throw new ConflictException('Invalid delivery address for employee');
    }

    // 4. Lines, Quantities, Options, and Active Flags
    if (lines.length === 0) {
      throw new BadRequestException('Order must contain at least one line');
    }

    const dishIds = lines.map(l => l.dishId);
    const dishes = await this.prisma.dish.findMany({
      where: { id: { in: dishIds } },
      include: {
        optionGroups: {
          include: {
            options: true,
            portions: true,
          },
        },
        hiddenByCompanies: {
          where: { companyId },
        },
      },
    });

    const dishMap = new Map(dishes.map(d => [d.id, d]));

    for (const line of lines) {
      const dish = dishMap.get(line.dishId);
      if (!dish) throw new NotFoundException(`Dish ${line.dishId} not found`);
      if (!dish.isActive) throw new ConflictException(`Dish ${dish.name} is not active`);
      if (dish.hiddenByCompanies.length > 0) throw new ConflictException(`Dish ${dish.name} is hidden for this company`);

      if (line.combinations.length === 0) {
        throw new BadRequestException(`Dish ${dish.name} has no combinations specified`);
      }

      let totalLineQty = 0;
      for (const combo of line.combinations) {
        if (combo.quantity < 1) throw new BadRequestException('Combination quantity must be at least 1');
        totalLineQty += combo.quantity;

        // Validate options
        const providedOptionGroupIds = new Set(combo.options.map(o => o.optionGroupId));
        
        for (const og of dish.optionGroups) {
          const providedOpts = combo.options.filter(o => o.optionGroupId === og.id);
          
          if (og.isRequired && providedOpts.length === 0) {
            throw new BadRequestException(`Option group '${og.name}' is required for dish '${dish.name}'`);
          }

          if (providedOpts.length > 1) {
             throw new BadRequestException(`Multiple options selected for group '${og.name}' (choose exactly one)`);
          }

          if (providedOpts.length === 1) {
            const opt = providedOpts[0];
            const validOption = og.options.find(o => o.optionId === opt.optionId);
            if (!validOption) {
              throw new BadRequestException(`Invalid option selected for group '${og.name}'`);
            }

            if (og.usesPortions) {
              if (!opt.portionSizeId) {
                throw new BadRequestException(`Portion size is required for option group '${og.name}'`);
              }
              const validPortion = og.portions.find(p => p.portionSizeId === opt.portionSizeId);
              if (!validPortion) {
                throw new BadRequestException(`Invalid portion size selected for group '${og.name}'`);
              }
            } else {
              if (opt.portionSizeId) {
                throw new BadRequestException(`Portion size is not allowed for option group '${og.name}'`);
              }
            }
          }
        }

        // Ensure no extra option groups were provided
        const validGroupIds = new Set(dish.optionGroups.map(og => og.id));
        for (const pg of providedOptionGroupIds) {
          if (!validGroupIds.has(pg)) {
            throw new BadRequestException(`Invalid option group '${pg}' provided for dish '${dish.name}'`);
          }
        }
      }

      if (dish.minimumOrderQuantity !== null && totalLineQty < dish.minimumOrderQuantity) {
        throw new ConflictException(`Dish ${dish.name} has a minimum order quantity of ${dish.minimumOrderQuantity}`);
      }
    }

    return { employee, company, address };
  }
}

