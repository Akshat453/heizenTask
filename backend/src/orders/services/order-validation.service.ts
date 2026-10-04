import { ConflictException, Injectable } from '@nestjs/common';
import {
  businessLocalDateTimeToInstant,
  dbDateFromIsoDate,
  formatLocalTime,
  instantToBusinessLocalTime,
  localTimeFromDbTime,
  parseIsoDate,
} from '../../business-time/business-time.utils.js';
import { DayOfWeek } from '../../generated/prisma/enums.js';
import type { OrderableMenu } from '../../menu/orderability.service.js';
import type { PrismaDb } from '../../pricing/price-resolver.service.js';

const ISO_TO_DAY: Record<number, DayOfWeek> = {
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
  7: DayOfWeek.SUNDAY,
};

export type DeliveryRequest = {
  deliveryAddressId?: string;
  deliveryTime?: string;
  packagingTypeId?: string;
};
export type ExistingDelivery = {
  deliveryAddressId: string | null;
  deliveryAt: Date;
  packagingTypeId: string;
};

/** Order delivery columns to write; omitted keys are left unchanged on update. */
export type DeliveryData = {
  deliveryAddressId?: string;
  deliveryAddressLabelSnapshot?: string;
  deliveryAddressLine1Snapshot?: string;
  deliveryAddressLine2Snapshot?: string | null;
  deliveryAddressCitySnapshot?: string;
  deliveryAddressRegionSnapshot?: string | null;
  deliveryAddressPostalCodeSnapshot?: string | null;
  deliveryAddressCountrySnapshot?: string;
  deliveryAt?: Date;
  packagingTypeId?: string;
  packagingNameSnapshot?: string;
};

export type ResolvedDelivery = {
  data: DeliveryData;
  deliveryLeadMinutes: number;
};

/**
 * Server-side delivery rules for Order create/edit:
 * - delivery date must be a Company working day and not a Company holiday;
 * - CREATE: omitted address/time/packaging resolve to Employee/Company defaults;
 * - UPDATE: omitted (or unchanged) fields keep the Order's current selection,
 *   so an existing valid choice or admin override is never silently reset;
 * - a changed non-default value requires the matching Employee flag;
 * - addresses must be active and belong to the Employee's current Company;
 * - packaging must be active.
 */
@Injectable()
export class OrderValidationService {
  async resolveDelivery(
    db: PrismaDb,
    params: {
      menu: OrderableMenu;
      deliveryDate: string;
      timezone: string;
      request: DeliveryRequest;
      existing?: ExistingDelivery;
    },
  ): Promise<ResolvedDelivery> {
    const { menu, deliveryDate, timezone, request, existing } = params;
    const employee = menu.employee;
    const company = await this.assertCompanyDeliveryDate(
      db,
      employee.companyId,
      deliveryDate,
    );

    const data: DeliveryData = {};

    // Address
    const addressId = this.chooseValue({
      requested: request.deliveryAddressId,
      current: existing?.deliveryAddressId ?? undefined,
      isUpdate: Boolean(existing),
      fallback: employee.defaultDeliveryAddressId,
      allowedNonDefault: employee.canChooseDeliveryAddress,
      notAllowedMessage:
        'Employee is not allowed to choose a non-default delivery address.',
      missingMessage: 'Employee has no default delivery address.',
    });
    if (addressId) {
      const address = await db.companyAddress.findUnique({
        where: { id: addressId },
      });
      if (
        !address ||
        address.companyId !== employee.companyId ||
        !address.isActive
      ) {
        throw new ConflictException(
          'Delivery address must be an active address of the employee’s company.',
        );
      }
      Object.assign(data, {
        deliveryAddressId: address.id,
        deliveryAddressLabelSnapshot: address.label,
        deliveryAddressLine1Snapshot: address.line1,
        deliveryAddressLine2Snapshot: address.line2,
        deliveryAddressCitySnapshot: address.city,
        deliveryAddressRegionSnapshot: address.region,
        deliveryAddressPostalCodeSnapshot: address.postalCode,
        deliveryAddressCountrySnapshot: address.country,
      } satisfies DeliveryData);
    }

    // Time (business-local HH:mm in the configured timezone)
    const deliveryTime = this.chooseValue({
      requested: request.deliveryTime,
      current: existing
        ? formatLocalTime(
            instantToBusinessLocalTime(existing.deliveryAt, timezone),
          )
        : undefined,
      isUpdate: Boolean(existing),
      fallback: formatLocalTime(
        localTimeFromDbTime(company.defaultDeliveryTime),
      ),
      allowedNonDefault: employee.canChangeDeliveryTime,
      notAllowedMessage:
        'Employee is not allowed to choose a non-default delivery time.',
      missingMessage: 'Company has no default delivery time.',
    });
    if (deliveryTime)
      data.deliveryAt = businessLocalDateTimeToInstant(
        deliveryDate,
        deliveryTime,
        timezone,
      );

    // Packaging
    const packagingTypeId = this.chooseValue({
      requested: request.packagingTypeId,
      current: existing?.packagingTypeId,
      isUpdate: Boolean(existing),
      fallback: company.defaultPackagingTypeId,
      allowedNonDefault: employee.canChangePackaging,
      notAllowedMessage:
        'Employee is not allowed to choose non-default packaging.',
      missingMessage: 'Company has no default packaging.',
    });
    if (packagingTypeId) {
      const packaging = await db.packagingType.findFirst({
        where: { id: packagingTypeId, isActive: true },
      });
      if (!packaging)
        throw new ConflictException('Packaging type must be active.');
      data.packagingTypeId = packaging.id;
      data.packagingNameSnapshot = packaging.name;
    }

    return { data, deliveryLeadMinutes: company.deliveryLeadMinutes };
  }

  /** Company delivery calendar: the date must be a Company working day and not a Company holiday. */
  async assertCompanyDeliveryDate(
    db: PrismaDb,
    companyId: string,
    deliveryDate: string,
  ) {
    const company = await db.company.findUniqueOrThrow({
      where: { id: companyId },
      include: {
        workingDays: true,
        holidays: { where: { date: dbDateFromIsoDate(deliveryDate) } },
      },
    });
    const dayOfWeek = ISO_TO_DAY[parseIsoDate(deliveryDate).dayOfWeek]!;
    if (
      !company.workingDays.some(
        (workingDay) => workingDay.dayOfWeek === dayOfWeek,
      )
    ) {
      throw new ConflictException(
        'Company does not accept deliveries on this day of the week.',
      );
    }
    if (company.holidays.length > 0)
      throw new ConflictException('Delivery date is a company holiday.');
    return company;
  }

  /**
   * Returns the value to (re)write, or null to keep the current selection.
   * Non-default changes require the Employee permission flag.
   */
  private chooseValue(input: {
    requested: string | undefined;
    current: string | undefined;
    isUpdate: boolean;
    fallback: string | null;
    allowedNonDefault: boolean;
    notAllowedMessage: string;
    missingMessage: string;
  }): string | null {
    const { requested, current, isUpdate, fallback, allowedNonDefault } = input;
    if (requested === undefined || (isUpdate && requested === current)) {
      if (isUpdate) return null;
      if (!fallback) throw new ConflictException(input.missingMessage);
      return fallback;
    }
    if (requested !== fallback && !allowedNonDefault)
      throw new ConflictException(input.notAllowedMessage);
    return requested;
  }
}
