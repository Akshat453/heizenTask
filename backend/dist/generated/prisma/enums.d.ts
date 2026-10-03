export declare const Temperature: {
    readonly HOT: "HOT";
    readonly COLD: "COLD";
};
export type Temperature = (typeof Temperature)[keyof typeof Temperature];
export declare const PriceTierStrategy: {
    readonly MANUAL: "MANUAL";
    readonly COST_MULTIPLIER: "COST_MULTIPLIER";
    readonly TIER_PERCENTAGE: "TIER_PERCENTAGE";
};
export type PriceTierStrategy = (typeof PriceTierStrategy)[keyof typeof PriceTierStrategy];
export declare const DayOfWeek: {
    readonly MONDAY: "MONDAY";
    readonly TUESDAY: "TUESDAY";
    readonly WEDNESDAY: "WEDNESDAY";
    readonly THURSDAY: "THURSDAY";
    readonly FRIDAY: "FRIDAY";
    readonly SATURDAY: "SATURDAY";
    readonly SUNDAY: "SUNDAY";
};
export type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];
export declare const OrderStatus: {
    readonly DRAFT: "DRAFT";
    readonly PLACED: "PLACED";
    readonly CONFIRMED: "CONFIRMED";
    readonly CANCELLED: "CANCELLED";
    readonly REJECTED: "REJECTED";
    readonly DELIVERED: "DELIVERED";
};
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export declare const OrderEventType: {
    readonly ORDER_CREATED: "ORDER_CREATED";
    readonly ORDER_PLACED: "ORDER_PLACED";
    readonly ORDER_CONFIRMED: "ORDER_CONFIRMED";
    readonly ORDER_REJECTED: "ORDER_REJECTED";
    readonly ORDER_CANCELLED: "ORDER_CANCELLED";
    readonly DELIVERY_DETAILS_CHANGED: "DELIVERY_DETAILS_CHANGED";
    readonly KITCHEN_STARTED: "KITCHEN_STARTED";
    readonly KITCHEN_READY: "KITCHEN_READY";
    readonly DISPATCH_READY: "DISPATCH_READY";
    readonly OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY";
    readonly DELIVERED: "DELIVERED";
};
export type OrderEventType = (typeof OrderEventType)[keyof typeof OrderEventType];
export declare const DeliveryDropStatus: {
    readonly DISPATCH_READY: "DISPATCH_READY";
    readonly OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY";
    readonly DELIVERED: "DELIVERED";
};
export type DeliveryDropStatus = (typeof DeliveryDropStatus)[keyof typeof DeliveryDropStatus];
export declare const InvoiceStatus: {
    readonly UNPAID: "UNPAID";
    readonly PAID: "PAID";
};
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
