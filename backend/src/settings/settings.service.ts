import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateKitchenHolidayDto, UpdatePlatformSettingsDto, UpsertKitchenWorkingDaysDto } from './dto/settings.dto.js';
import { DayOfWeek } from '../generated/prisma/enums.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const [settings, workingDays, holidays] = await Promise.all([
      this.prisma.platformSettings.findUnique({ where: { id: 1 } }),
      this.prisma.kitchenWorkingDay.findMany({ orderBy: { dayOfWeek: 'asc' } }),
      this.prisma.kitchenHoliday.findMany({ orderBy: { date: 'asc' } }),
    ]);
    if (!settings) throw new NotFoundException('Platform settings are not initialised.');
    return { settings, workingDays: workingDays.map((d) => d.dayOfWeek), holidays };
  }

  async updateSettings(dto: UpdatePlatformSettingsDto) {
    const data: Record<string, unknown> = {};
    if (dto.businessTimezone !== undefined) {
      this.assertValidTimezone(dto.businessTimezone);
      data.businessTimezone = dto.businessTimezone;
    }
    if (dto.cutoffTime !== undefined) {
      data.cutoffTime = new Date(`1970-01-01T${dto.cutoffTime}:00.000Z`);
    }
    if (dto.cutoffWorkingDayCount !== undefined) data.cutoffWorkingDayCount = dto.cutoffWorkingDayCount;
    if (dto.kitchenReadyBufferMinutes !== undefined) data.kitchenReadyBufferMinutes = dto.kitchenReadyBufferMinutes;

    return this.prisma.platformSettings.update({ where: { id: 1 }, data });
  }

  async upsertWorkingDays(dto: UpsertKitchenWorkingDaysDto) {
    if (dto.days.length === 0) throw new BadRequestException('At least one kitchen working day is required.');
    const uniqueDays = [...new Set(dto.days)];
    await this.prisma.$transaction([
      this.prisma.kitchenWorkingDay.deleteMany({}),
      this.prisma.kitchenWorkingDay.createMany({ data: uniqueDays.map((dayOfWeek) => ({ dayOfWeek })) }),
    ]);
    return this.prisma.kitchenWorkingDay.findMany({ orderBy: { dayOfWeek: 'asc' } });
  }

  async listHolidays() {
    return this.prisma.kitchenHoliday.findMany({ orderBy: { date: 'asc' } });
  }

  async createHoliday(dto: CreateKitchenHolidayDto) {
    const date = new Date(`${dto.date}T00:00:00.000Z`);
    try {
      return await this.prisma.kitchenHoliday.create({
        data: { date, name: dto.name?.trim() || null },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
        throw new ConflictException('A kitchen holiday already exists on that date.');
      }
      throw error;
    }
  }

  async deleteHoliday(id: string) {
    try {
      return await this.prisma.kitchenHoliday.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Kitchen holiday not found.');
    }
  }

  /** Load settings once and expose them for the BusinessTime module. */
  async loadForBusinessTime() {
    const settings = await this.prisma.platformSettings.findUnique({ where: { id: 1 } });
    if (!settings) throw new NotFoundException('Platform settings are not initialised.');
    const workingDays = await this.prisma.kitchenWorkingDay.findMany({ select: { dayOfWeek: true } });
    const holidays = await this.prisma.kitchenHoliday.findMany({ select: { date: true } });
    return {
      timezone: settings.businessTimezone,
      cutoffTime: settings.cutoffTime,
      cutoffWorkingDayCount: settings.cutoffWorkingDayCount,
      kitchenReadyBufferMinutes: settings.kitchenReadyBufferMinutes,
      workingDays: workingDays.map((d) => d.dayOfWeek as DayOfWeek),
      holidayDates: holidays.map((h) => h.date),
    };
  }

  private assertValidTimezone(tz: string) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      throw new BadRequestException(`'${tz}' is not a valid IANA time zone.`);
    }
  }
}
