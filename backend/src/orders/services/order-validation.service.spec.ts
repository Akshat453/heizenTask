import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderValidationService } from './order-validation.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DayOfWeek } from '../../generated/prisma/enums.js';

describe('OrderValidationService', () => {
  let service: OrderValidationService;
  let prisma: any;
  let businessTime: any;

  beforeEach(async () => {
    prisma = {
      employee: { findUnique: vi.fn() },
      companyAddress: { findUnique: vi.fn() },
      dish: { findMany: vi.fn() },
    };

    businessTime = {
      isDeliveryDateOpen: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderValidationService,
        { provide: PrismaService, useValue: prisma },
        { provide: BusinessTimeService, useValue: businessTime },
      ],
    }).compile();

    service = module.get<OrderValidationService>(OrderValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateOrderGraph', () => {
    const validEmployee = {
      id: 'emp1',
      companyId: 'comp1',
      defaultDeliveryAddressId: 'addr1',
      company: {
        id: 'comp1',
        workingDays: [{ dayOfWeek: DayOfWeek.MONDAY }],
        holidays: [],
      }
    };

    it('throws NotFoundException if employee not found', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(service.validateOrderGraph('emp1', '2025-01-06', []))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if delivery cutoff has passed', async () => {
      prisma.employee.findUnique.mockResolvedValue(validEmployee);
      businessTime.isDeliveryDateOpen.mockResolvedValue(false);
      
      await expect(service.validateOrderGraph('emp1', '2025-01-06', []))
        .rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if day of week is not a working day for the company', async () => {
      prisma.employee.findUnique.mockResolvedValue(validEmployee);
      businessTime.isDeliveryDateOpen.mockResolvedValue(true);
      // 2025-01-07 is a Tuesday, but company only works Mondays
      
      await expect(service.validateOrderGraph('emp1', '2025-01-07', []))
        .rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if no lines are provided', async () => {
      prisma.employee.findUnique.mockResolvedValue(validEmployee);
      businessTime.isDeliveryDateOpen.mockResolvedValue(true);
      prisma.companyAddress.findUnique.mockResolvedValue({ id: 'addr1', companyId: 'comp1', isActive: true });
      // 2025-01-06 is a Monday
      
      await expect(service.validateOrderGraph('emp1', '2025-01-06', []))
        .rejects.toThrow(BadRequestException);
    });

    it('validates a correct order successfully', async () => {
      prisma.employee.findUnique.mockResolvedValue(validEmployee);
      businessTime.isDeliveryDateOpen.mockResolvedValue(true);
      prisma.companyAddress.findUnique.mockResolvedValue({ id: 'addr1', companyId: 'comp1', isActive: true });
      
      prisma.dish.findMany.mockResolvedValue([{
        id: 'dish1',
        isActive: true,
        minimumOrderQuantity: null,
        hiddenByCompanies: [],
        optionGroups: []
      }]);

      const result = await service.validateOrderGraph('emp1', '2025-01-06', [{
        dishId: 'dish1',
        combinations: [{ quantity: 1, options: [] }]
      }]);

      expect(result.employee).toEqual(validEmployee);
      expect(result.company).toEqual(validEmployee.company);
    });
  });
});
