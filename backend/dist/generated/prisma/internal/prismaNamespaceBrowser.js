import * as runtime from "@prisma/client/runtime/index-browser";
export const Decimal = runtime.Decimal;
export const NullTypes = {
    DbNull: runtime.NullTypes.DbNull,
    JsonNull: runtime.NullTypes.JsonNull,
    AnyNull: runtime.NullTypes.AnyNull,
};
export const DbNull = runtime.DbNull;
export const JsonNull = runtime.JsonNull;
export const AnyNull = runtime.AnyNull;
export const ModelName = {
    StaffUser: 'StaffUser',
    Role: 'Role',
    Permission: 'Permission',
    RolePermission: 'RolePermission',
    Dish: 'Dish',
    Option: 'Option',
    KitchenStation: 'KitchenStation',
    Allergen: 'Allergen',
    DietaryTag: 'DietaryTag',
    DishAllergen: 'DishAllergen',
    OptionAllergen: 'OptionAllergen',
    DishDietaryTag: 'DishDietaryTag',
    OptionDietaryTag: 'OptionDietaryTag',
    OptionGroup: 'OptionGroup',
    OptionGroupOption: 'OptionGroupOption',
    PortionSize: 'PortionSize',
    OptionGroupPortion: 'OptionGroupPortion',
    MenuCategory: 'MenuCategory',
    MenuCategoryItem: 'MenuCategoryItem',
    CompanyHiddenCategory: 'CompanyHiddenCategory',
    CompanyHiddenDish: 'CompanyHiddenDish',
    PriceTier: 'PriceTier',
    DishTierPrice: 'DishTierPrice',
    OptionTierPrice: 'OptionTierPrice',
    Company: 'Company',
    CompanyDomain: 'CompanyDomain',
    CompanyAddress: 'CompanyAddress',
    CompanyWorkingDay: 'CompanyWorkingDay',
    CompanyHoliday: 'CompanyHoliday',
    PackagingType: 'PackagingType',
    Employee: 'Employee',
    EmployeeAllergen: 'EmployeeAllergen',
    EmployeeDietaryTag: 'EmployeeDietaryTag',
    Order: 'Order',
    OrderLine: 'OrderLine',
    OrderCombination: 'OrderCombination',
    OrderCombinationOption: 'OrderCombinationOption',
    OrderEvent: 'OrderEvent',
    PrepUnit: 'PrepUnit',
    DeliveryDrop: 'DeliveryDrop',
    Invoice: 'Invoice',
    InvoiceOrder: 'InvoiceOrder',
    PlatformSettings: 'PlatformSettings',
    KitchenWorkingDay: 'KitchenWorkingDay',
    KitchenHoliday: 'KitchenHoliday'
};
export const TransactionIsolationLevel = runtime.makeStrictEnum({
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
});
export const StaffUserScalarFieldEnum = {
    id: 'id',
    name: 'name',
    email: 'email',
    passwordHash: 'passwordHash',
    roleId: 'roleId',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const RoleScalarFieldEnum = {
    id: 'id',
    name: 'name',
    description: 'description'
};
export const PermissionScalarFieldEnum = {
    id: 'id',
    key: 'key',
    description: 'description'
};
export const RolePermissionScalarFieldEnum = {
    roleId: 'roleId',
    permissionId: 'permissionId'
};
export const DishScalarFieldEnum = {
    id: 'id',
    name: 'name',
    description: 'description',
    imageUrl: 'imageUrl',
    sku: 'sku',
    temperature: 'temperature',
    costCents: 'costCents',
    minimumOrderQuantity: 'minimumOrderQuantity',
    stationId: 'stationId',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const OptionScalarFieldEnum = {
    id: 'id',
    name: 'name',
    costCents: 'costCents',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const KitchenStationScalarFieldEnum = {
    id: 'id',
    name: 'name',
    displayOrder: 'displayOrder',
    isActive: 'isActive'
};
export const AllergenScalarFieldEnum = {
    id: 'id',
    name: 'name',
    isActive: 'isActive'
};
export const DietaryTagScalarFieldEnum = {
    id: 'id',
    name: 'name',
    isActive: 'isActive'
};
export const DishAllergenScalarFieldEnum = {
    dishId: 'dishId',
    allergenId: 'allergenId'
};
export const OptionAllergenScalarFieldEnum = {
    optionId: 'optionId',
    allergenId: 'allergenId'
};
export const DishDietaryTagScalarFieldEnum = {
    dishId: 'dishId',
    dietaryTagId: 'dietaryTagId'
};
export const OptionDietaryTagScalarFieldEnum = {
    optionId: 'optionId',
    dietaryTagId: 'dietaryTagId'
};
export const OptionGroupScalarFieldEnum = {
    id: 'id',
    dishId: 'dishId',
    name: 'name',
    isRequired: 'isRequired',
    usesPortions: 'usesPortions',
    displayOrder: 'displayOrder'
};
export const OptionGroupOptionScalarFieldEnum = {
    optionGroupId: 'optionGroupId',
    optionId: 'optionId',
    displayOrder: 'displayOrder'
};
export const PortionSizeScalarFieldEnum = {
    id: 'id',
    name: 'name',
    displayOrder: 'displayOrder',
    isActive: 'isActive'
};
export const OptionGroupPortionScalarFieldEnum = {
    optionGroupId: 'optionGroupId',
    portionSizeId: 'portionSizeId',
    extraChargeCents: 'extraChargeCents',
    displayOrder: 'displayOrder'
};
export const MenuCategoryScalarFieldEnum = {
    id: 'id',
    name: 'name',
    slug: 'slug',
    displayOrder: 'displayOrder',
    isActive: 'isActive',
    isSecret: 'isSecret'
};
export const MenuCategoryItemScalarFieldEnum = {
    categoryId: 'categoryId',
    dishId: 'dishId',
    displayOrder: 'displayOrder',
    isActive: 'isActive'
};
export const CompanyHiddenCategoryScalarFieldEnum = {
    companyId: 'companyId',
    categoryId: 'categoryId'
};
export const CompanyHiddenDishScalarFieldEnum = {
    companyId: 'companyId',
    dishId: 'dishId'
};
export const PriceTierScalarFieldEnum = {
    id: 'id',
    name: 'name',
    isDefault: 'isDefault',
    strategy: 'strategy',
    sourceTierId: 'sourceTierId',
    costMultiplierBps: 'costMultiplierBps',
    sourceAdjustmentBps: 'sourceAdjustmentBps',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const DishTierPriceScalarFieldEnum = {
    dishId: 'dishId',
    priceTierId: 'priceTierId',
    priceCents: 'priceCents'
};
export const OptionTierPriceScalarFieldEnum = {
    optionId: 'optionId',
    priceTierId: 'priceTierId',
    priceCents: 'priceCents'
};
export const CompanyScalarFieldEnum = {
    id: 'id',
    name: 'name',
    billingContactName: 'billingContactName',
    billingContactEmail: 'billingContactEmail',
    billingContactPhone: 'billingContactPhone',
    ownerEmployeeId: 'ownerEmployeeId',
    priceTierId: 'priceTierId',
    defaultDeliveryTime: 'defaultDeliveryTime',
    deliveryLeadMinutes: 'deliveryLeadMinutes',
    defaultPackagingTypeId: 'defaultPackagingTypeId',
    driverInstructions: 'driverInstructions',
    defaultDriverStaffUserId: 'defaultDriverStaffUserId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const CompanyDomainScalarFieldEnum = {
    id: 'id',
    companyId: 'companyId',
    domain: 'domain'
};
export const CompanyAddressScalarFieldEnum = {
    id: 'id',
    companyId: 'companyId',
    label: 'label',
    line1: 'line1',
    line2: 'line2',
    city: 'city',
    region: 'region',
    postalCode: 'postalCode',
    country: 'country',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const CompanyWorkingDayScalarFieldEnum = {
    companyId: 'companyId',
    dayOfWeek: 'dayOfWeek'
};
export const CompanyHolidayScalarFieldEnum = {
    id: 'id',
    companyId: 'companyId',
    date: 'date',
    name: 'name'
};
export const PackagingTypeScalarFieldEnum = {
    id: 'id',
    name: 'name',
    displayOrder: 'displayOrder',
    isActive: 'isActive'
};
export const EmployeeScalarFieldEnum = {
    id: 'id',
    companyId: 'companyId',
    name: 'name',
    email: 'email',
    defaultDeliveryAddressId: 'defaultDeliveryAddressId',
    canChooseDeliveryAddress: 'canChooseDeliveryAddress',
    canChangeDeliveryTime: 'canChangeDeliveryTime',
    canChangePackaging: 'canChangePackaging',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const EmployeeAllergenScalarFieldEnum = {
    employeeId: 'employeeId',
    allergenId: 'allergenId'
};
export const EmployeeDietaryTagScalarFieldEnum = {
    employeeId: 'employeeId',
    dietaryTagId: 'dietaryTagId'
};
export const OrderScalarFieldEnum = {
    id: 'id',
    orderNumber: 'orderNumber',
    employeeId: 'employeeId',
    companyId: 'companyId',
    status: 'status',
    deliveryDate: 'deliveryDate',
    deliveryAt: 'deliveryAt',
    deliveryAddressId: 'deliveryAddressId',
    deliveryAddressLabelSnapshot: 'deliveryAddressLabelSnapshot',
    deliveryAddressLine1Snapshot: 'deliveryAddressLine1Snapshot',
    deliveryAddressLine2Snapshot: 'deliveryAddressLine2Snapshot',
    deliveryAddressCitySnapshot: 'deliveryAddressCitySnapshot',
    deliveryAddressRegionSnapshot: 'deliveryAddressRegionSnapshot',
    deliveryAddressPostalCodeSnapshot: 'deliveryAddressPostalCodeSnapshot',
    deliveryAddressCountrySnapshot: 'deliveryAddressCountrySnapshot',
    packagingTypeId: 'packagingTypeId',
    packagingNameSnapshot: 'packagingNameSnapshot',
    deliveryLeadMinutesSnapshot: 'deliveryLeadMinutesSnapshot',
    subtotalCents: 'subtotalCents',
    totalCents: 'totalCents',
    billableTotalCents: 'billableTotalCents',
    placedAt: 'placedAt',
    confirmedAt: 'confirmedAt',
    cancelledAt: 'cancelledAt',
    rejectedAt: 'rejectedAt',
    rejectionReason: 'rejectionReason',
    kitchenStartedAt: 'kitchenStartedAt',
    kitchenReadyAt: 'kitchenReadyAt',
    deliveryDropId: 'deliveryDropId',
    createdByStaffUserId: 'createdByStaffUserId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const OrderLineScalarFieldEnum = {
    id: 'id',
    orderId: 'orderId',
    dishId: 'dishId',
    dishNameSnapshot: 'dishNameSnapshot',
    dishSkuSnapshot: 'dishSkuSnapshot',
    quantity: 'quantity',
    dishUnitPriceCents: 'dishUnitPriceCents',
    lineTotalCents: 'lineTotalCents',
    createdAt: 'createdAt'
};
export const OrderCombinationScalarFieldEnum = {
    id: 'id',
    orderLineId: 'orderLineId',
    quantity: 'quantity',
    unitPriceCents: 'unitPriceCents',
    totalCents: 'totalCents'
};
export const OrderCombinationOptionScalarFieldEnum = {
    id: 'id',
    combinationId: 'combinationId',
    optionGroupId: 'optionGroupId',
    optionId: 'optionId',
    portionSizeId: 'portionSizeId',
    optionGroupNameSnapshot: 'optionGroupNameSnapshot',
    optionNameSnapshot: 'optionNameSnapshot',
    portionNameSnapshot: 'portionNameSnapshot',
    optionPriceCents: 'optionPriceCents',
    portionExtraCents: 'portionExtraCents'
};
export const OrderEventScalarFieldEnum = {
    id: 'id',
    orderId: 'orderId',
    type: 'type',
    actorStaffUserId: 'actorStaffUserId',
    occurredAt: 'occurredAt',
    message: 'message',
    metadata: 'metadata'
};
export const PrepUnitScalarFieldEnum = {
    id: 'id',
    orderId: 'orderId',
    combinationId: 'combinationId',
    stationId: 'stationId',
    stationNameSnapshot: 'stationNameSnapshot',
    quantity: 'quantity',
    startedAt: 'startedAt',
    startedByStaffUserId: 'startedByStaffUserId',
    doneAt: 'doneAt',
    doneByStaffUserId: 'doneByStaffUserId',
    createdAt: 'createdAt'
};
export const DeliveryDropScalarFieldEnum = {
    id: 'id',
    companyId: 'companyId',
    scheduledDeliveryAt: 'scheduledDeliveryAt',
    addressLabelSnapshot: 'addressLabelSnapshot',
    addressLine1Snapshot: 'addressLine1Snapshot',
    addressLine2Snapshot: 'addressLine2Snapshot',
    addressCitySnapshot: 'addressCitySnapshot',
    addressRegionSnapshot: 'addressRegionSnapshot',
    addressPostalCodeSnapshot: 'addressPostalCodeSnapshot',
    addressCountrySnapshot: 'addressCountrySnapshot',
    status: 'status',
    driverStaffUserId: 'driverStaffUserId',
    dispatchReadyAt: 'dispatchReadyAt',
    outForDeliveryAt: 'outForDeliveryAt',
    deliveredAt: 'deliveredAt',
    deliveryNote: 'deliveryNote',
    photoUrl: 'photoUrl',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const InvoiceScalarFieldEnum = {
    id: 'id',
    invoiceNumber: 'invoiceNumber',
    companyId: 'companyId',
    status: 'status',
    totalCents: 'totalCents',
    createdByStaffUserId: 'createdByStaffUserId',
    createdAt: 'createdAt',
    paidAt: 'paidAt',
    paidByStaffUserId: 'paidByStaffUserId'
};
export const InvoiceOrderScalarFieldEnum = {
    invoiceId: 'invoiceId',
    orderId: 'orderId',
    amountCents: 'amountCents'
};
export const PlatformSettingsScalarFieldEnum = {
    id: 'id',
    businessTimezone: 'businessTimezone',
    cutoffTime: 'cutoffTime',
    cutoffWorkingDayCount: 'cutoffWorkingDayCount',
    kitchenReadyBufferMinutes: 'kitchenReadyBufferMinutes',
    atRiskWindowMinutes: 'atRiskWindowMinutes',
    updatedAt: 'updatedAt'
};
export const KitchenWorkingDayScalarFieldEnum = {
    dayOfWeek: 'dayOfWeek'
};
export const KitchenHolidayScalarFieldEnum = {
    id: 'id',
    date: 'date',
    name: 'name'
};
export const SortOrder = {
    asc: 'asc',
    desc: 'desc'
};
export const NullableJsonNullValueInput = {
    DbNull: DbNull,
    JsonNull: JsonNull
};
export const QueryMode = {
    default: 'default',
    insensitive: 'insensitive'
};
export const NullsOrder = {
    first: 'first',
    last: 'last'
};
export const JsonNullValueFilter = {
    DbNull: DbNull,
    JsonNull: JsonNull,
    AnyNull: AnyNull
};
//# sourceMappingURL=prismaNamespaceBrowser.js.map