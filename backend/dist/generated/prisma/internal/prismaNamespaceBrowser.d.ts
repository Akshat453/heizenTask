import * as runtime from "@prisma/client/runtime/index-browser";
export type * from '../models.js';
export type * from './prismaNamespace.js';
export declare const Decimal: typeof runtime.Decimal;
export declare const NullTypes: {
    DbNull: (new (secret: never) => typeof runtime.DbNull);
    JsonNull: (new (secret: never) => typeof runtime.JsonNull);
    AnyNull: (new (secret: never) => typeof runtime.AnyNull);
};
export declare const DbNull: import("@prisma/client-runtime-utils").DbNullClass;
export declare const JsonNull: import("@prisma/client-runtime-utils").JsonNullClass;
export declare const AnyNull: import("@prisma/client-runtime-utils").AnyNullClass;
export declare const ModelName: {
    readonly StaffUser: "StaffUser";
    readonly Role: "Role";
    readonly Permission: "Permission";
    readonly RolePermission: "RolePermission";
    readonly Dish: "Dish";
    readonly Option: "Option";
    readonly KitchenStation: "KitchenStation";
    readonly Allergen: "Allergen";
    readonly DietaryTag: "DietaryTag";
    readonly DishAllergen: "DishAllergen";
    readonly OptionAllergen: "OptionAllergen";
    readonly DishDietaryTag: "DishDietaryTag";
    readonly OptionDietaryTag: "OptionDietaryTag";
    readonly OptionGroup: "OptionGroup";
    readonly OptionGroupOption: "OptionGroupOption";
    readonly PortionSize: "PortionSize";
    readonly OptionGroupPortion: "OptionGroupPortion";
    readonly MenuCategory: "MenuCategory";
    readonly MenuCategoryItem: "MenuCategoryItem";
    readonly CompanyHiddenCategory: "CompanyHiddenCategory";
    readonly CompanyHiddenDish: "CompanyHiddenDish";
    readonly PriceTier: "PriceTier";
    readonly DishTierPrice: "DishTierPrice";
    readonly OptionTierPrice: "OptionTierPrice";
    readonly Company: "Company";
    readonly CompanyDomain: "CompanyDomain";
    readonly CompanyAddress: "CompanyAddress";
    readonly CompanyWorkingDay: "CompanyWorkingDay";
    readonly CompanyHoliday: "CompanyHoliday";
    readonly PackagingType: "PackagingType";
    readonly Employee: "Employee";
    readonly EmployeeAllergen: "EmployeeAllergen";
    readonly EmployeeDietaryTag: "EmployeeDietaryTag";
    readonly Order: "Order";
    readonly OrderLine: "OrderLine";
    readonly OrderCombination: "OrderCombination";
    readonly OrderCombinationOption: "OrderCombinationOption";
    readonly OrderEvent: "OrderEvent";
    readonly PrepUnit: "PrepUnit";
    readonly DeliveryDrop: "DeliveryDrop";
    readonly Invoice: "Invoice";
    readonly InvoiceOrder: "InvoiceOrder";
    readonly PlatformSettings: "PlatformSettings";
    readonly KitchenWorkingDay: "KitchenWorkingDay";
    readonly KitchenHoliday: "KitchenHoliday";
};
export type ModelName = (typeof ModelName)[keyof typeof ModelName];
export declare const TransactionIsolationLevel: {
    readonly ReadUncommitted: "ReadUncommitted";
    readonly ReadCommitted: "ReadCommitted";
    readonly RepeatableRead: "RepeatableRead";
    readonly Serializable: "Serializable";
};
export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel];
export declare const StaffUserScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly email: "email";
    readonly passwordHash: "passwordHash";
    readonly roleId: "roleId";
    readonly isActive: "isActive";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type StaffUserScalarFieldEnum = (typeof StaffUserScalarFieldEnum)[keyof typeof StaffUserScalarFieldEnum];
export declare const RoleScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly description: "description";
};
export type RoleScalarFieldEnum = (typeof RoleScalarFieldEnum)[keyof typeof RoleScalarFieldEnum];
export declare const PermissionScalarFieldEnum: {
    readonly id: "id";
    readonly key: "key";
    readonly description: "description";
};
export type PermissionScalarFieldEnum = (typeof PermissionScalarFieldEnum)[keyof typeof PermissionScalarFieldEnum];
export declare const RolePermissionScalarFieldEnum: {
    readonly roleId: "roleId";
    readonly permissionId: "permissionId";
};
export type RolePermissionScalarFieldEnum = (typeof RolePermissionScalarFieldEnum)[keyof typeof RolePermissionScalarFieldEnum];
export declare const DishScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly description: "description";
    readonly imageUrl: "imageUrl";
    readonly sku: "sku";
    readonly temperature: "temperature";
    readonly costCents: "costCents";
    readonly minimumOrderQuantity: "minimumOrderQuantity";
    readonly stationId: "stationId";
    readonly isActive: "isActive";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type DishScalarFieldEnum = (typeof DishScalarFieldEnum)[keyof typeof DishScalarFieldEnum];
export declare const OptionScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly costCents: "costCents";
    readonly isActive: "isActive";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type OptionScalarFieldEnum = (typeof OptionScalarFieldEnum)[keyof typeof OptionScalarFieldEnum];
export declare const KitchenStationScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly displayOrder: "displayOrder";
    readonly isActive: "isActive";
};
export type KitchenStationScalarFieldEnum = (typeof KitchenStationScalarFieldEnum)[keyof typeof KitchenStationScalarFieldEnum];
export declare const AllergenScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly isActive: "isActive";
};
export type AllergenScalarFieldEnum = (typeof AllergenScalarFieldEnum)[keyof typeof AllergenScalarFieldEnum];
export declare const DietaryTagScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly isActive: "isActive";
};
export type DietaryTagScalarFieldEnum = (typeof DietaryTagScalarFieldEnum)[keyof typeof DietaryTagScalarFieldEnum];
export declare const DishAllergenScalarFieldEnum: {
    readonly dishId: "dishId";
    readonly allergenId: "allergenId";
};
export type DishAllergenScalarFieldEnum = (typeof DishAllergenScalarFieldEnum)[keyof typeof DishAllergenScalarFieldEnum];
export declare const OptionAllergenScalarFieldEnum: {
    readonly optionId: "optionId";
    readonly allergenId: "allergenId";
};
export type OptionAllergenScalarFieldEnum = (typeof OptionAllergenScalarFieldEnum)[keyof typeof OptionAllergenScalarFieldEnum];
export declare const DishDietaryTagScalarFieldEnum: {
    readonly dishId: "dishId";
    readonly dietaryTagId: "dietaryTagId";
};
export type DishDietaryTagScalarFieldEnum = (typeof DishDietaryTagScalarFieldEnum)[keyof typeof DishDietaryTagScalarFieldEnum];
export declare const OptionDietaryTagScalarFieldEnum: {
    readonly optionId: "optionId";
    readonly dietaryTagId: "dietaryTagId";
};
export type OptionDietaryTagScalarFieldEnum = (typeof OptionDietaryTagScalarFieldEnum)[keyof typeof OptionDietaryTagScalarFieldEnum];
export declare const OptionGroupScalarFieldEnum: {
    readonly id: "id";
    readonly dishId: "dishId";
    readonly name: "name";
    readonly isRequired: "isRequired";
    readonly usesPortions: "usesPortions";
    readonly displayOrder: "displayOrder";
};
export type OptionGroupScalarFieldEnum = (typeof OptionGroupScalarFieldEnum)[keyof typeof OptionGroupScalarFieldEnum];
export declare const OptionGroupOptionScalarFieldEnum: {
    readonly optionGroupId: "optionGroupId";
    readonly optionId: "optionId";
    readonly displayOrder: "displayOrder";
};
export type OptionGroupOptionScalarFieldEnum = (typeof OptionGroupOptionScalarFieldEnum)[keyof typeof OptionGroupOptionScalarFieldEnum];
export declare const PortionSizeScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly displayOrder: "displayOrder";
    readonly isActive: "isActive";
};
export type PortionSizeScalarFieldEnum = (typeof PortionSizeScalarFieldEnum)[keyof typeof PortionSizeScalarFieldEnum];
export declare const OptionGroupPortionScalarFieldEnum: {
    readonly optionGroupId: "optionGroupId";
    readonly portionSizeId: "portionSizeId";
    readonly extraChargeCents: "extraChargeCents";
    readonly displayOrder: "displayOrder";
};
export type OptionGroupPortionScalarFieldEnum = (typeof OptionGroupPortionScalarFieldEnum)[keyof typeof OptionGroupPortionScalarFieldEnum];
export declare const MenuCategoryScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly slug: "slug";
    readonly displayOrder: "displayOrder";
    readonly isActive: "isActive";
    readonly isSecret: "isSecret";
};
export type MenuCategoryScalarFieldEnum = (typeof MenuCategoryScalarFieldEnum)[keyof typeof MenuCategoryScalarFieldEnum];
export declare const MenuCategoryItemScalarFieldEnum: {
    readonly categoryId: "categoryId";
    readonly dishId: "dishId";
    readonly displayOrder: "displayOrder";
    readonly isActive: "isActive";
};
export type MenuCategoryItemScalarFieldEnum = (typeof MenuCategoryItemScalarFieldEnum)[keyof typeof MenuCategoryItemScalarFieldEnum];
export declare const CompanyHiddenCategoryScalarFieldEnum: {
    readonly companyId: "companyId";
    readonly categoryId: "categoryId";
};
export type CompanyHiddenCategoryScalarFieldEnum = (typeof CompanyHiddenCategoryScalarFieldEnum)[keyof typeof CompanyHiddenCategoryScalarFieldEnum];
export declare const CompanyHiddenDishScalarFieldEnum: {
    readonly companyId: "companyId";
    readonly dishId: "dishId";
};
export type CompanyHiddenDishScalarFieldEnum = (typeof CompanyHiddenDishScalarFieldEnum)[keyof typeof CompanyHiddenDishScalarFieldEnum];
export declare const PriceTierScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly isDefault: "isDefault";
    readonly strategy: "strategy";
    readonly sourceTierId: "sourceTierId";
    readonly costMultiplierBps: "costMultiplierBps";
    readonly sourceAdjustmentBps: "sourceAdjustmentBps";
    readonly isActive: "isActive";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type PriceTierScalarFieldEnum = (typeof PriceTierScalarFieldEnum)[keyof typeof PriceTierScalarFieldEnum];
export declare const DishTierPriceScalarFieldEnum: {
    readonly dishId: "dishId";
    readonly priceTierId: "priceTierId";
    readonly priceCents: "priceCents";
};
export type DishTierPriceScalarFieldEnum = (typeof DishTierPriceScalarFieldEnum)[keyof typeof DishTierPriceScalarFieldEnum];
export declare const OptionTierPriceScalarFieldEnum: {
    readonly optionId: "optionId";
    readonly priceTierId: "priceTierId";
    readonly priceCents: "priceCents";
};
export type OptionTierPriceScalarFieldEnum = (typeof OptionTierPriceScalarFieldEnum)[keyof typeof OptionTierPriceScalarFieldEnum];
export declare const CompanyScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly billingContactName: "billingContactName";
    readonly billingContactEmail: "billingContactEmail";
    readonly billingContactPhone: "billingContactPhone";
    readonly ownerEmployeeId: "ownerEmployeeId";
    readonly priceTierId: "priceTierId";
    readonly defaultDeliveryTime: "defaultDeliveryTime";
    readonly deliveryLeadMinutes: "deliveryLeadMinutes";
    readonly defaultPackagingTypeId: "defaultPackagingTypeId";
    readonly driverInstructions: "driverInstructions";
    readonly defaultDriverStaffUserId: "defaultDriverStaffUserId";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type CompanyScalarFieldEnum = (typeof CompanyScalarFieldEnum)[keyof typeof CompanyScalarFieldEnum];
export declare const CompanyDomainScalarFieldEnum: {
    readonly id: "id";
    readonly companyId: "companyId";
    readonly domain: "domain";
};
export type CompanyDomainScalarFieldEnum = (typeof CompanyDomainScalarFieldEnum)[keyof typeof CompanyDomainScalarFieldEnum];
export declare const CompanyAddressScalarFieldEnum: {
    readonly id: "id";
    readonly companyId: "companyId";
    readonly label: "label";
    readonly line1: "line1";
    readonly line2: "line2";
    readonly city: "city";
    readonly region: "region";
    readonly postalCode: "postalCode";
    readonly country: "country";
    readonly isActive: "isActive";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type CompanyAddressScalarFieldEnum = (typeof CompanyAddressScalarFieldEnum)[keyof typeof CompanyAddressScalarFieldEnum];
export declare const CompanyWorkingDayScalarFieldEnum: {
    readonly companyId: "companyId";
    readonly dayOfWeek: "dayOfWeek";
};
export type CompanyWorkingDayScalarFieldEnum = (typeof CompanyWorkingDayScalarFieldEnum)[keyof typeof CompanyWorkingDayScalarFieldEnum];
export declare const CompanyHolidayScalarFieldEnum: {
    readonly id: "id";
    readonly companyId: "companyId";
    readonly date: "date";
    readonly name: "name";
};
export type CompanyHolidayScalarFieldEnum = (typeof CompanyHolidayScalarFieldEnum)[keyof typeof CompanyHolidayScalarFieldEnum];
export declare const PackagingTypeScalarFieldEnum: {
    readonly id: "id";
    readonly name: "name";
    readonly displayOrder: "displayOrder";
    readonly isActive: "isActive";
};
export type PackagingTypeScalarFieldEnum = (typeof PackagingTypeScalarFieldEnum)[keyof typeof PackagingTypeScalarFieldEnum];
export declare const EmployeeScalarFieldEnum: {
    readonly id: "id";
    readonly companyId: "companyId";
    readonly name: "name";
    readonly email: "email";
    readonly defaultDeliveryAddressId: "defaultDeliveryAddressId";
    readonly canChooseDeliveryAddress: "canChooseDeliveryAddress";
    readonly canChangeDeliveryTime: "canChangeDeliveryTime";
    readonly canChangePackaging: "canChangePackaging";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type EmployeeScalarFieldEnum = (typeof EmployeeScalarFieldEnum)[keyof typeof EmployeeScalarFieldEnum];
export declare const EmployeeAllergenScalarFieldEnum: {
    readonly employeeId: "employeeId";
    readonly allergenId: "allergenId";
};
export type EmployeeAllergenScalarFieldEnum = (typeof EmployeeAllergenScalarFieldEnum)[keyof typeof EmployeeAllergenScalarFieldEnum];
export declare const EmployeeDietaryTagScalarFieldEnum: {
    readonly employeeId: "employeeId";
    readonly dietaryTagId: "dietaryTagId";
};
export type EmployeeDietaryTagScalarFieldEnum = (typeof EmployeeDietaryTagScalarFieldEnum)[keyof typeof EmployeeDietaryTagScalarFieldEnum];
export declare const OrderScalarFieldEnum: {
    readonly id: "id";
    readonly orderNumber: "orderNumber";
    readonly employeeId: "employeeId";
    readonly companyId: "companyId";
    readonly status: "status";
    readonly deliveryDate: "deliveryDate";
    readonly deliveryAt: "deliveryAt";
    readonly deliveryAddressId: "deliveryAddressId";
    readonly deliveryAddressLabelSnapshot: "deliveryAddressLabelSnapshot";
    readonly deliveryAddressLine1Snapshot: "deliveryAddressLine1Snapshot";
    readonly deliveryAddressLine2Snapshot: "deliveryAddressLine2Snapshot";
    readonly deliveryAddressCitySnapshot: "deliveryAddressCitySnapshot";
    readonly deliveryAddressRegionSnapshot: "deliveryAddressRegionSnapshot";
    readonly deliveryAddressPostalCodeSnapshot: "deliveryAddressPostalCodeSnapshot";
    readonly deliveryAddressCountrySnapshot: "deliveryAddressCountrySnapshot";
    readonly packagingTypeId: "packagingTypeId";
    readonly packagingNameSnapshot: "packagingNameSnapshot";
    readonly deliveryLeadMinutesSnapshot: "deliveryLeadMinutesSnapshot";
    readonly subtotalCents: "subtotalCents";
    readonly totalCents: "totalCents";
    readonly billableTotalCents: "billableTotalCents";
    readonly placedAt: "placedAt";
    readonly confirmedAt: "confirmedAt";
    readonly cancelledAt: "cancelledAt";
    readonly rejectedAt: "rejectedAt";
    readonly rejectionReason: "rejectionReason";
    readonly kitchenStartedAt: "kitchenStartedAt";
    readonly kitchenReadyAt: "kitchenReadyAt";
    readonly deliveryDropId: "deliveryDropId";
    readonly createdByStaffUserId: "createdByStaffUserId";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type OrderScalarFieldEnum = (typeof OrderScalarFieldEnum)[keyof typeof OrderScalarFieldEnum];
export declare const OrderLineScalarFieldEnum: {
    readonly id: "id";
    readonly orderId: "orderId";
    readonly dishId: "dishId";
    readonly dishNameSnapshot: "dishNameSnapshot";
    readonly dishSkuSnapshot: "dishSkuSnapshot";
    readonly quantity: "quantity";
    readonly dishUnitPriceCents: "dishUnitPriceCents";
    readonly lineTotalCents: "lineTotalCents";
    readonly createdAt: "createdAt";
};
export type OrderLineScalarFieldEnum = (typeof OrderLineScalarFieldEnum)[keyof typeof OrderLineScalarFieldEnum];
export declare const OrderCombinationScalarFieldEnum: {
    readonly id: "id";
    readonly orderLineId: "orderLineId";
    readonly quantity: "quantity";
    readonly unitPriceCents: "unitPriceCents";
    readonly totalCents: "totalCents";
};
export type OrderCombinationScalarFieldEnum = (typeof OrderCombinationScalarFieldEnum)[keyof typeof OrderCombinationScalarFieldEnum];
export declare const OrderCombinationOptionScalarFieldEnum: {
    readonly id: "id";
    readonly combinationId: "combinationId";
    readonly optionGroupId: "optionGroupId";
    readonly optionId: "optionId";
    readonly portionSizeId: "portionSizeId";
    readonly optionGroupNameSnapshot: "optionGroupNameSnapshot";
    readonly optionNameSnapshot: "optionNameSnapshot";
    readonly portionNameSnapshot: "portionNameSnapshot";
    readonly optionPriceCents: "optionPriceCents";
    readonly portionExtraCents: "portionExtraCents";
};
export type OrderCombinationOptionScalarFieldEnum = (typeof OrderCombinationOptionScalarFieldEnum)[keyof typeof OrderCombinationOptionScalarFieldEnum];
export declare const OrderEventScalarFieldEnum: {
    readonly id: "id";
    readonly orderId: "orderId";
    readonly type: "type";
    readonly actorStaffUserId: "actorStaffUserId";
    readonly occurredAt: "occurredAt";
    readonly message: "message";
    readonly metadata: "metadata";
};
export type OrderEventScalarFieldEnum = (typeof OrderEventScalarFieldEnum)[keyof typeof OrderEventScalarFieldEnum];
export declare const PrepUnitScalarFieldEnum: {
    readonly id: "id";
    readonly orderId: "orderId";
    readonly combinationId: "combinationId";
    readonly stationId: "stationId";
    readonly stationNameSnapshot: "stationNameSnapshot";
    readonly quantity: "quantity";
    readonly startedAt: "startedAt";
    readonly startedByStaffUserId: "startedByStaffUserId";
    readonly doneAt: "doneAt";
    readonly doneByStaffUserId: "doneByStaffUserId";
    readonly createdAt: "createdAt";
};
export type PrepUnitScalarFieldEnum = (typeof PrepUnitScalarFieldEnum)[keyof typeof PrepUnitScalarFieldEnum];
export declare const DeliveryDropScalarFieldEnum: {
    readonly id: "id";
    readonly companyId: "companyId";
    readonly scheduledDeliveryAt: "scheduledDeliveryAt";
    readonly addressLabelSnapshot: "addressLabelSnapshot";
    readonly addressLine1Snapshot: "addressLine1Snapshot";
    readonly addressLine2Snapshot: "addressLine2Snapshot";
    readonly addressCitySnapshot: "addressCitySnapshot";
    readonly addressRegionSnapshot: "addressRegionSnapshot";
    readonly addressPostalCodeSnapshot: "addressPostalCodeSnapshot";
    readonly addressCountrySnapshot: "addressCountrySnapshot";
    readonly status: "status";
    readonly driverStaffUserId: "driverStaffUserId";
    readonly dispatchReadyAt: "dispatchReadyAt";
    readonly outForDeliveryAt: "outForDeliveryAt";
    readonly deliveredAt: "deliveredAt";
    readonly deliveryNote: "deliveryNote";
    readonly photoUrl: "photoUrl";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type DeliveryDropScalarFieldEnum = (typeof DeliveryDropScalarFieldEnum)[keyof typeof DeliveryDropScalarFieldEnum];
export declare const InvoiceScalarFieldEnum: {
    readonly id: "id";
    readonly invoiceNumber: "invoiceNumber";
    readonly companyId: "companyId";
    readonly status: "status";
    readonly totalCents: "totalCents";
    readonly createdByStaffUserId: "createdByStaffUserId";
    readonly createdAt: "createdAt";
    readonly paidAt: "paidAt";
    readonly paidByStaffUserId: "paidByStaffUserId";
};
export type InvoiceScalarFieldEnum = (typeof InvoiceScalarFieldEnum)[keyof typeof InvoiceScalarFieldEnum];
export declare const InvoiceOrderScalarFieldEnum: {
    readonly invoiceId: "invoiceId";
    readonly orderId: "orderId";
    readonly amountCents: "amountCents";
};
export type InvoiceOrderScalarFieldEnum = (typeof InvoiceOrderScalarFieldEnum)[keyof typeof InvoiceOrderScalarFieldEnum];
export declare const PlatformSettingsScalarFieldEnum: {
    readonly id: "id";
    readonly businessTimezone: "businessTimezone";
    readonly cutoffTime: "cutoffTime";
    readonly cutoffWorkingDayCount: "cutoffWorkingDayCount";
    readonly kitchenReadyBufferMinutes: "kitchenReadyBufferMinutes";
    readonly atRiskWindowMinutes: "atRiskWindowMinutes";
    readonly updatedAt: "updatedAt";
};
export type PlatformSettingsScalarFieldEnum = (typeof PlatformSettingsScalarFieldEnum)[keyof typeof PlatformSettingsScalarFieldEnum];
export declare const KitchenWorkingDayScalarFieldEnum: {
    readonly dayOfWeek: "dayOfWeek";
};
export type KitchenWorkingDayScalarFieldEnum = (typeof KitchenWorkingDayScalarFieldEnum)[keyof typeof KitchenWorkingDayScalarFieldEnum];
export declare const KitchenHolidayScalarFieldEnum: {
    readonly id: "id";
    readonly date: "date";
    readonly name: "name";
};
export type KitchenHolidayScalarFieldEnum = (typeof KitchenHolidayScalarFieldEnum)[keyof typeof KitchenHolidayScalarFieldEnum];
export declare const SortOrder: {
    readonly asc: "asc";
    readonly desc: "desc";
};
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
export declare const NullableJsonNullValueInput: {
    readonly DbNull: import("@prisma/client-runtime-utils").DbNullClass;
    readonly JsonNull: import("@prisma/client-runtime-utils").JsonNullClass;
};
export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput];
export declare const QueryMode: {
    readonly default: "default";
    readonly insensitive: "insensitive";
};
export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];
export declare const NullsOrder: {
    readonly first: "first";
    readonly last: "last";
};
export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder];
export declare const JsonNullValueFilter: {
    readonly DbNull: import("@prisma/client-runtime-utils").DbNullClass;
    readonly JsonNull: import("@prisma/client-runtime-utils").JsonNullClass;
    readonly AnyNull: import("@prisma/client-runtime-utils").AnyNullClass;
};
export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter];
