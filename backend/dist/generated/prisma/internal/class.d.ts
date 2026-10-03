import * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "./prismaNamespace.js";
export type LogOptions<ClientOptions extends Prisma.PrismaClientOptions> = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never;
export interface PrismaClientConstructor {
    new <Options extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions, LogOpts extends LogOptions<Options> = LogOptions<Options>, OmitOpts extends Prisma.PrismaClientOptions['omit'] = Options extends {
        omit: infer U;
    } ? U : Prisma.PrismaClientOptions['omit'], ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs>(options: Prisma.PrismaClientConstructorArgs<Options>): PrismaClient<LogOpts, OmitOpts, ExtArgs>;
}
export interface PrismaClient<in LogOpts extends Prisma.LogLevel = never, in out OmitOpts extends Prisma.PrismaClientOptions['omit'] = Prisma.PrismaClientOptions['omit'], in out ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['other'];
    };
    $on<V extends LogOpts>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;
    $connect(): runtime.Types.Utils.JsPromise<void>;
    $disconnect(): runtime.Types.Utils.JsPromise<void>;
    $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;
    $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;
    $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;
    $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;
    $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
    }): runtime.Types.Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>;
    $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => runtime.Types.Utils.JsPromise<R>, options?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
    }): runtime.Types.Utils.JsPromise<R>;
    $extends: runtime.Types.Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<OmitOpts>, ExtArgs, runtime.Types.Utils.Call<Prisma.TypeMapCb<OmitOpts>, {
        extArgs: ExtArgs;
    }>>;
    get staffUser(): Prisma.StaffUserDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get role(): Prisma.RoleDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get permission(): Prisma.PermissionDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get rolePermission(): Prisma.RolePermissionDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get dish(): Prisma.DishDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get option(): Prisma.OptionDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get kitchenStation(): Prisma.KitchenStationDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get allergen(): Prisma.AllergenDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get dietaryTag(): Prisma.DietaryTagDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get dishAllergen(): Prisma.DishAllergenDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get optionAllergen(): Prisma.OptionAllergenDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get dishDietaryTag(): Prisma.DishDietaryTagDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get optionDietaryTag(): Prisma.OptionDietaryTagDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get optionGroup(): Prisma.OptionGroupDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get optionGroupOption(): Prisma.OptionGroupOptionDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get portionSize(): Prisma.PortionSizeDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get optionGroupPortion(): Prisma.OptionGroupPortionDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get menuCategory(): Prisma.MenuCategoryDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get menuCategoryItem(): Prisma.MenuCategoryItemDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get companyHiddenCategory(): Prisma.CompanyHiddenCategoryDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get companyHiddenDish(): Prisma.CompanyHiddenDishDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get priceTier(): Prisma.PriceTierDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get dishTierPrice(): Prisma.DishTierPriceDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get optionTierPrice(): Prisma.OptionTierPriceDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get company(): Prisma.CompanyDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get companyDomain(): Prisma.CompanyDomainDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get companyAddress(): Prisma.CompanyAddressDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get companyWorkingDay(): Prisma.CompanyWorkingDayDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get companyHoliday(): Prisma.CompanyHolidayDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get packagingType(): Prisma.PackagingTypeDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get employee(): Prisma.EmployeeDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get employeeAllergen(): Prisma.EmployeeAllergenDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get employeeDietaryTag(): Prisma.EmployeeDietaryTagDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get order(): Prisma.OrderDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get orderLine(): Prisma.OrderLineDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get orderCombination(): Prisma.OrderCombinationDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get orderCombinationOption(): Prisma.OrderCombinationOptionDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get orderEvent(): Prisma.OrderEventDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get prepUnit(): Prisma.PrepUnitDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get deliveryDrop(): Prisma.DeliveryDropDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get invoice(): Prisma.InvoiceDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get invoiceOrder(): Prisma.InvoiceOrderDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get platformSettings(): Prisma.PlatformSettingsDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get kitchenWorkingDay(): Prisma.KitchenWorkingDayDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    get kitchenHoliday(): Prisma.KitchenHolidayDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
}
export declare function getPrismaClientClass(): PrismaClientConstructor;
