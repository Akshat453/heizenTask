import * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../models.js";
import { type PrismaClient } from "./class.js";
export type * from '../models.js';
export type DMMF = typeof runtime.DMMF;
export type PrismaPromise<T> = runtime.Types.Public.PrismaPromise<T>;
export declare const PrismaClientKnownRequestError: typeof runtime.PrismaClientKnownRequestError;
export type PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError;
export declare const PrismaClientUnknownRequestError: typeof runtime.PrismaClientUnknownRequestError;
export type PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError;
export declare const PrismaClientRustPanicError: typeof runtime.PrismaClientRustPanicError;
export type PrismaClientRustPanicError = runtime.PrismaClientRustPanicError;
export declare const PrismaClientInitializationError: typeof runtime.PrismaClientInitializationError;
export type PrismaClientInitializationError = runtime.PrismaClientInitializationError;
export declare const PrismaClientValidationError: typeof runtime.PrismaClientValidationError;
export type PrismaClientValidationError = runtime.PrismaClientValidationError;
export declare const sql: typeof runtime.sqltag;
export declare const empty: runtime.Sql;
export declare const join: typeof runtime.join;
export declare const raw: typeof runtime.raw;
export declare const Sql: typeof runtime.Sql;
export type Sql = runtime.Sql;
export declare const Decimal: typeof runtime.Decimal;
export type Decimal = runtime.Decimal;
export type DecimalJsLike = runtime.DecimalJsLike;
export type Extension = runtime.Types.Extensions.UserArgs;
export declare const getExtensionContext: typeof runtime.Extensions.getExtensionContext;
export type Args<T, F extends runtime.Operation> = runtime.Types.Public.Args<T, F>;
export type Payload<T, F extends runtime.Operation = never> = runtime.Types.Public.Payload<T, F>;
export type Result<T, A, F extends runtime.Operation> = runtime.Types.Public.Result<T, A, F>;
export type Exact<A, W> = runtime.Types.Public.Exact<A, W>;
export type PrismaVersion = {
    client: string;
    engine: string;
};
export declare const prismaVersion: PrismaVersion;
export type Bytes = runtime.Bytes;
export type JsonObject = runtime.JsonObject;
export type JsonArray = runtime.JsonArray;
export type JsonValue = runtime.JsonValue;
export type InputJsonObject = runtime.InputJsonObject;
export type InputJsonArray = runtime.InputJsonArray;
export type InputJsonValue = runtime.InputJsonValue;
export declare const NullTypes: {
    DbNull: (new (secret: never) => typeof runtime.DbNull);
    JsonNull: (new (secret: never) => typeof runtime.JsonNull);
    AnyNull: (new (secret: never) => typeof runtime.AnyNull);
};
export declare const DbNull: runtime.DbNullClass;
export declare const JsonNull: runtime.JsonNullClass;
export declare const AnyNull: runtime.AnyNullClass;
type SelectAndInclude = {
    select: any;
    include: any;
};
type SelectAndOmit = {
    select: any;
    omit: any;
};
type Prisma__Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};
export type Enumerable<T> = T | Array<T>;
export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
};
export type PrismaClientConstructorArgs<Options extends PrismaClientOptions> = [
    PrismaClientOptions
] extends [Options] ? PrismaClientOptions : Subset<Options, PrismaClientOptions>;
export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
} & (T extends SelectAndInclude ? 'Please either choose `select` or `include`.' : T extends SelectAndOmit ? 'Please either choose `select` or `omit`.' : {});
export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
} & K;
type Without<T, U> = {
    [P in Exclude<keyof T, keyof U>]?: never;
};
export type XOR<T, U> = T extends object ? U extends object ? ((Without<T, U> & U) | (Without<U, T> & T)) & object : U : T;
type IsObject<T extends any> = T extends Array<any> ? False : T extends Date ? False : T extends Uint8Array ? False : T extends BigInt ? False : T extends object ? True : False;
export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T;
type __Either<O extends object, K extends Key> = Omit<O, K> & {
    [P in K]: Prisma__Pick<O, P & keyof O>;
}[K];
type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>;
type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>;
type _Either<O extends object, K extends Key, strict extends Boolean> = {
    1: EitherStrict<O, K>;
    0: EitherLoose<O, K>;
}[strict];
export type Either<O extends object, K extends Key, strict extends Boolean = 1> = O extends unknown ? _Either<O, K, strict> : never;
export type Union = any;
export type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K];
} & {};
export type IntersectOf<U extends Union> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export type Overwrite<O extends object, O1 extends object> = {
    [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
} & {};
type _Merge<U extends object> = IntersectOf<Overwrite<U, {
    [K in keyof U]-?: At<U, K>;
}>>;
type Key = string | number | symbol;
type AtStrict<O extends object, K extends Key> = O[K & keyof O];
type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
    1: AtStrict<O, K>;
    0: AtLoose<O, K>;
}[strict];
export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
} & {};
export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
} & {};
type _Record<K extends keyof any, T> = {
    [P in K]: T;
};
type NoExpand<T> = T extends unknown ? T : never;
export type AtLeast<O extends object, K extends string> = NoExpand<O extends unknown ? (K extends keyof O ? {
    [P in K]: O[P];
} & O : O) | {
    [P in keyof O as P extends K ? P : never]-?: O[P];
} & O : never>;
type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;
export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;
export type Boolean = True | False;
export type True = 1;
export type False = 0;
export type Not<B extends Boolean> = {
    0: 1;
    1: 0;
}[B];
export type Extends<A1 extends any, A2 extends any> = [A1] extends [never] ? 0 : A1 extends A2 ? 1 : 0;
export type Has<U extends Union, U1 extends Union> = Not<Extends<Exclude<U1, U>, U1>>;
export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
        0: 0;
        1: 1;
    };
    1: {
        0: 1;
        1: 1;
    };
}[B1][B2];
export type Keys<U extends Union> = U extends unknown ? keyof U : never;
export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O ? O[P] : never;
} : never;
type FieldPaths<T, U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>> = IsObject<T> extends True ? U : T;
export type GetHavingFields<T> = {
    [K in keyof T]: Or<Or<Extends<'OR', K>, Extends<'AND', K>>, Extends<'NOT', K>> extends True ? T[K] extends infer TK ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never> : never : {} extends FieldPaths<T[K]> ? never : K;
}[keyof T];
type _TupleToUnion<T> = T extends (infer E)[] ? E : never;
type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>;
export type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T;
export type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>;
export type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T;
export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>;
type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>;
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
export interface TypeMapCb<GlobalOmitOptions = {}> extends runtime.Types.Utils.Fn<{
    extArgs: runtime.Types.Extensions.InternalArgs;
}, runtime.Types.Utils.Record<string, any>> {
    returns: TypeMap<this['params']['extArgs'], GlobalOmitOptions>;
}
export type TypeMap<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
        omit: GlobalOmitOptions;
    };
    meta: {
        modelProps: "staffUser" | "role" | "permission" | "rolePermission" | "dish" | "option" | "kitchenStation" | "allergen" | "dietaryTag" | "dishAllergen" | "optionAllergen" | "dishDietaryTag" | "optionDietaryTag" | "optionGroup" | "optionGroupOption" | "portionSize" | "optionGroupPortion" | "menuCategory" | "menuCategoryItem" | "companyHiddenCategory" | "companyHiddenDish" | "priceTier" | "dishTierPrice" | "optionTierPrice" | "company" | "companyDomain" | "companyAddress" | "companyWorkingDay" | "companyHoliday" | "packagingType" | "employee" | "employeeAllergen" | "employeeDietaryTag" | "order" | "orderLine" | "orderCombination" | "orderCombinationOption" | "orderEvent" | "prepUnit" | "deliveryDrop" | "invoice" | "invoiceOrder" | "platformSettings" | "kitchenWorkingDay" | "kitchenHoliday";
        txIsolationLevel: TransactionIsolationLevel;
    };
    model: {
        StaffUser: {
            payload: Prisma.$StaffUserPayload<ExtArgs>;
            fields: Prisma.StaffUserFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.StaffUserFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.StaffUserFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload>;
                };
                findFirst: {
                    args: Prisma.StaffUserFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.StaffUserFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload>;
                };
                findMany: {
                    args: Prisma.StaffUserFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload>[];
                };
                create: {
                    args: Prisma.StaffUserCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload>;
                };
                createMany: {
                    args: Prisma.StaffUserCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.StaffUserCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload>[];
                };
                delete: {
                    args: Prisma.StaffUserDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload>;
                };
                update: {
                    args: Prisma.StaffUserUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload>;
                };
                deleteMany: {
                    args: Prisma.StaffUserDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.StaffUserUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.StaffUserUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload>[];
                };
                upsert: {
                    args: Prisma.StaffUserUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$StaffUserPayload>;
                };
                aggregate: {
                    args: Prisma.StaffUserAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateStaffUser>;
                };
                groupBy: {
                    args: Prisma.StaffUserGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.StaffUserGroupByOutputType>[];
                };
                count: {
                    args: Prisma.StaffUserCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.StaffUserCountAggregateOutputType> | number;
                };
            };
        };
        Role: {
            payload: Prisma.$RolePayload<ExtArgs>;
            fields: Prisma.RoleFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.RoleFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.RoleFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload>;
                };
                findFirst: {
                    args: Prisma.RoleFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.RoleFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload>;
                };
                findMany: {
                    args: Prisma.RoleFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload>[];
                };
                create: {
                    args: Prisma.RoleCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload>;
                };
                createMany: {
                    args: Prisma.RoleCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.RoleCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload>[];
                };
                delete: {
                    args: Prisma.RoleDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload>;
                };
                update: {
                    args: Prisma.RoleUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload>;
                };
                deleteMany: {
                    args: Prisma.RoleDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.RoleUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.RoleUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload>[];
                };
                upsert: {
                    args: Prisma.RoleUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePayload>;
                };
                aggregate: {
                    args: Prisma.RoleAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateRole>;
                };
                groupBy: {
                    args: Prisma.RoleGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.RoleGroupByOutputType>[];
                };
                count: {
                    args: Prisma.RoleCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.RoleCountAggregateOutputType> | number;
                };
            };
        };
        Permission: {
            payload: Prisma.$PermissionPayload<ExtArgs>;
            fields: Prisma.PermissionFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PermissionFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PermissionFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload>;
                };
                findFirst: {
                    args: Prisma.PermissionFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PermissionFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload>;
                };
                findMany: {
                    args: Prisma.PermissionFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload>[];
                };
                create: {
                    args: Prisma.PermissionCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload>;
                };
                createMany: {
                    args: Prisma.PermissionCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PermissionCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload>[];
                };
                delete: {
                    args: Prisma.PermissionDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload>;
                };
                update: {
                    args: Prisma.PermissionUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload>;
                };
                deleteMany: {
                    args: Prisma.PermissionDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PermissionUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PermissionUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload>[];
                };
                upsert: {
                    args: Prisma.PermissionUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PermissionPayload>;
                };
                aggregate: {
                    args: Prisma.PermissionAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePermission>;
                };
                groupBy: {
                    args: Prisma.PermissionGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PermissionGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PermissionCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PermissionCountAggregateOutputType> | number;
                };
            };
        };
        RolePermission: {
            payload: Prisma.$RolePermissionPayload<ExtArgs>;
            fields: Prisma.RolePermissionFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.RolePermissionFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.RolePermissionFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload>;
                };
                findFirst: {
                    args: Prisma.RolePermissionFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.RolePermissionFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload>;
                };
                findMany: {
                    args: Prisma.RolePermissionFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload>[];
                };
                create: {
                    args: Prisma.RolePermissionCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload>;
                };
                createMany: {
                    args: Prisma.RolePermissionCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.RolePermissionCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload>[];
                };
                delete: {
                    args: Prisma.RolePermissionDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload>;
                };
                update: {
                    args: Prisma.RolePermissionUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload>;
                };
                deleteMany: {
                    args: Prisma.RolePermissionDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.RolePermissionUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.RolePermissionUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload>[];
                };
                upsert: {
                    args: Prisma.RolePermissionUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$RolePermissionPayload>;
                };
                aggregate: {
                    args: Prisma.RolePermissionAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateRolePermission>;
                };
                groupBy: {
                    args: Prisma.RolePermissionGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.RolePermissionGroupByOutputType>[];
                };
                count: {
                    args: Prisma.RolePermissionCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.RolePermissionCountAggregateOutputType> | number;
                };
            };
        };
        Dish: {
            payload: Prisma.$DishPayload<ExtArgs>;
            fields: Prisma.DishFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.DishFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.DishFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload>;
                };
                findFirst: {
                    args: Prisma.DishFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.DishFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload>;
                };
                findMany: {
                    args: Prisma.DishFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload>[];
                };
                create: {
                    args: Prisma.DishCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload>;
                };
                createMany: {
                    args: Prisma.DishCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.DishCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload>[];
                };
                delete: {
                    args: Prisma.DishDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload>;
                };
                update: {
                    args: Prisma.DishUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload>;
                };
                deleteMany: {
                    args: Prisma.DishDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.DishUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.DishUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload>[];
                };
                upsert: {
                    args: Prisma.DishUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishPayload>;
                };
                aggregate: {
                    args: Prisma.DishAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateDish>;
                };
                groupBy: {
                    args: Prisma.DishGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DishGroupByOutputType>[];
                };
                count: {
                    args: Prisma.DishCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DishCountAggregateOutputType> | number;
                };
            };
        };
        Option: {
            payload: Prisma.$OptionPayload<ExtArgs>;
            fields: Prisma.OptionFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OptionFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OptionFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload>;
                };
                findFirst: {
                    args: Prisma.OptionFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OptionFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload>;
                };
                findMany: {
                    args: Prisma.OptionFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload>[];
                };
                create: {
                    args: Prisma.OptionCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload>;
                };
                createMany: {
                    args: Prisma.OptionCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OptionCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload>[];
                };
                delete: {
                    args: Prisma.OptionDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload>;
                };
                update: {
                    args: Prisma.OptionUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload>;
                };
                deleteMany: {
                    args: Prisma.OptionDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OptionUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OptionUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload>[];
                };
                upsert: {
                    args: Prisma.OptionUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionPayload>;
                };
                aggregate: {
                    args: Prisma.OptionAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOption>;
                };
                groupBy: {
                    args: Prisma.OptionGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OptionCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionCountAggregateOutputType> | number;
                };
            };
        };
        KitchenStation: {
            payload: Prisma.$KitchenStationPayload<ExtArgs>;
            fields: Prisma.KitchenStationFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.KitchenStationFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.KitchenStationFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload>;
                };
                findFirst: {
                    args: Prisma.KitchenStationFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.KitchenStationFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload>;
                };
                findMany: {
                    args: Prisma.KitchenStationFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload>[];
                };
                create: {
                    args: Prisma.KitchenStationCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload>;
                };
                createMany: {
                    args: Prisma.KitchenStationCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.KitchenStationCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload>[];
                };
                delete: {
                    args: Prisma.KitchenStationDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload>;
                };
                update: {
                    args: Prisma.KitchenStationUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload>;
                };
                deleteMany: {
                    args: Prisma.KitchenStationDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.KitchenStationUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.KitchenStationUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload>[];
                };
                upsert: {
                    args: Prisma.KitchenStationUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenStationPayload>;
                };
                aggregate: {
                    args: Prisma.KitchenStationAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateKitchenStation>;
                };
                groupBy: {
                    args: Prisma.KitchenStationGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.KitchenStationGroupByOutputType>[];
                };
                count: {
                    args: Prisma.KitchenStationCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.KitchenStationCountAggregateOutputType> | number;
                };
            };
        };
        Allergen: {
            payload: Prisma.$AllergenPayload<ExtArgs>;
            fields: Prisma.AllergenFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.AllergenFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.AllergenFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload>;
                };
                findFirst: {
                    args: Prisma.AllergenFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.AllergenFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload>;
                };
                findMany: {
                    args: Prisma.AllergenFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload>[];
                };
                create: {
                    args: Prisma.AllergenCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload>;
                };
                createMany: {
                    args: Prisma.AllergenCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.AllergenCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload>[];
                };
                delete: {
                    args: Prisma.AllergenDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload>;
                };
                update: {
                    args: Prisma.AllergenUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload>;
                };
                deleteMany: {
                    args: Prisma.AllergenDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.AllergenUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.AllergenUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload>[];
                };
                upsert: {
                    args: Prisma.AllergenUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AllergenPayload>;
                };
                aggregate: {
                    args: Prisma.AllergenAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateAllergen>;
                };
                groupBy: {
                    args: Prisma.AllergenGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AllergenGroupByOutputType>[];
                };
                count: {
                    args: Prisma.AllergenCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AllergenCountAggregateOutputType> | number;
                };
            };
        };
        DietaryTag: {
            payload: Prisma.$DietaryTagPayload<ExtArgs>;
            fields: Prisma.DietaryTagFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.DietaryTagFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.DietaryTagFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload>;
                };
                findFirst: {
                    args: Prisma.DietaryTagFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.DietaryTagFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload>;
                };
                findMany: {
                    args: Prisma.DietaryTagFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload>[];
                };
                create: {
                    args: Prisma.DietaryTagCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload>;
                };
                createMany: {
                    args: Prisma.DietaryTagCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.DietaryTagCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload>[];
                };
                delete: {
                    args: Prisma.DietaryTagDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload>;
                };
                update: {
                    args: Prisma.DietaryTagUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload>;
                };
                deleteMany: {
                    args: Prisma.DietaryTagDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.DietaryTagUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.DietaryTagUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload>[];
                };
                upsert: {
                    args: Prisma.DietaryTagUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DietaryTagPayload>;
                };
                aggregate: {
                    args: Prisma.DietaryTagAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateDietaryTag>;
                };
                groupBy: {
                    args: Prisma.DietaryTagGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DietaryTagGroupByOutputType>[];
                };
                count: {
                    args: Prisma.DietaryTagCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DietaryTagCountAggregateOutputType> | number;
                };
            };
        };
        DishAllergen: {
            payload: Prisma.$DishAllergenPayload<ExtArgs>;
            fields: Prisma.DishAllergenFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.DishAllergenFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.DishAllergenFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload>;
                };
                findFirst: {
                    args: Prisma.DishAllergenFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.DishAllergenFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload>;
                };
                findMany: {
                    args: Prisma.DishAllergenFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload>[];
                };
                create: {
                    args: Prisma.DishAllergenCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload>;
                };
                createMany: {
                    args: Prisma.DishAllergenCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.DishAllergenCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload>[];
                };
                delete: {
                    args: Prisma.DishAllergenDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload>;
                };
                update: {
                    args: Prisma.DishAllergenUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload>;
                };
                deleteMany: {
                    args: Prisma.DishAllergenDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.DishAllergenUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.DishAllergenUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload>[];
                };
                upsert: {
                    args: Prisma.DishAllergenUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishAllergenPayload>;
                };
                aggregate: {
                    args: Prisma.DishAllergenAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateDishAllergen>;
                };
                groupBy: {
                    args: Prisma.DishAllergenGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DishAllergenGroupByOutputType>[];
                };
                count: {
                    args: Prisma.DishAllergenCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DishAllergenCountAggregateOutputType> | number;
                };
            };
        };
        OptionAllergen: {
            payload: Prisma.$OptionAllergenPayload<ExtArgs>;
            fields: Prisma.OptionAllergenFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OptionAllergenFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OptionAllergenFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload>;
                };
                findFirst: {
                    args: Prisma.OptionAllergenFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OptionAllergenFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload>;
                };
                findMany: {
                    args: Prisma.OptionAllergenFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload>[];
                };
                create: {
                    args: Prisma.OptionAllergenCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload>;
                };
                createMany: {
                    args: Prisma.OptionAllergenCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OptionAllergenCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload>[];
                };
                delete: {
                    args: Prisma.OptionAllergenDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload>;
                };
                update: {
                    args: Prisma.OptionAllergenUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload>;
                };
                deleteMany: {
                    args: Prisma.OptionAllergenDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OptionAllergenUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OptionAllergenUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload>[];
                };
                upsert: {
                    args: Prisma.OptionAllergenUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionAllergenPayload>;
                };
                aggregate: {
                    args: Prisma.OptionAllergenAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOptionAllergen>;
                };
                groupBy: {
                    args: Prisma.OptionAllergenGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionAllergenGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OptionAllergenCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionAllergenCountAggregateOutputType> | number;
                };
            };
        };
        DishDietaryTag: {
            payload: Prisma.$DishDietaryTagPayload<ExtArgs>;
            fields: Prisma.DishDietaryTagFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.DishDietaryTagFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.DishDietaryTagFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload>;
                };
                findFirst: {
                    args: Prisma.DishDietaryTagFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.DishDietaryTagFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload>;
                };
                findMany: {
                    args: Prisma.DishDietaryTagFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload>[];
                };
                create: {
                    args: Prisma.DishDietaryTagCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload>;
                };
                createMany: {
                    args: Prisma.DishDietaryTagCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.DishDietaryTagCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload>[];
                };
                delete: {
                    args: Prisma.DishDietaryTagDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload>;
                };
                update: {
                    args: Prisma.DishDietaryTagUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload>;
                };
                deleteMany: {
                    args: Prisma.DishDietaryTagDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.DishDietaryTagUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.DishDietaryTagUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload>[];
                };
                upsert: {
                    args: Prisma.DishDietaryTagUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishDietaryTagPayload>;
                };
                aggregate: {
                    args: Prisma.DishDietaryTagAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateDishDietaryTag>;
                };
                groupBy: {
                    args: Prisma.DishDietaryTagGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DishDietaryTagGroupByOutputType>[];
                };
                count: {
                    args: Prisma.DishDietaryTagCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DishDietaryTagCountAggregateOutputType> | number;
                };
            };
        };
        OptionDietaryTag: {
            payload: Prisma.$OptionDietaryTagPayload<ExtArgs>;
            fields: Prisma.OptionDietaryTagFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OptionDietaryTagFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OptionDietaryTagFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload>;
                };
                findFirst: {
                    args: Prisma.OptionDietaryTagFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OptionDietaryTagFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload>;
                };
                findMany: {
                    args: Prisma.OptionDietaryTagFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload>[];
                };
                create: {
                    args: Prisma.OptionDietaryTagCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload>;
                };
                createMany: {
                    args: Prisma.OptionDietaryTagCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OptionDietaryTagCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload>[];
                };
                delete: {
                    args: Prisma.OptionDietaryTagDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload>;
                };
                update: {
                    args: Prisma.OptionDietaryTagUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload>;
                };
                deleteMany: {
                    args: Prisma.OptionDietaryTagDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OptionDietaryTagUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OptionDietaryTagUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload>[];
                };
                upsert: {
                    args: Prisma.OptionDietaryTagUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionDietaryTagPayload>;
                };
                aggregate: {
                    args: Prisma.OptionDietaryTagAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOptionDietaryTag>;
                };
                groupBy: {
                    args: Prisma.OptionDietaryTagGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionDietaryTagGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OptionDietaryTagCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionDietaryTagCountAggregateOutputType> | number;
                };
            };
        };
        OptionGroup: {
            payload: Prisma.$OptionGroupPayload<ExtArgs>;
            fields: Prisma.OptionGroupFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OptionGroupFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OptionGroupFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload>;
                };
                findFirst: {
                    args: Prisma.OptionGroupFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OptionGroupFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload>;
                };
                findMany: {
                    args: Prisma.OptionGroupFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload>[];
                };
                create: {
                    args: Prisma.OptionGroupCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload>;
                };
                createMany: {
                    args: Prisma.OptionGroupCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OptionGroupCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload>[];
                };
                delete: {
                    args: Prisma.OptionGroupDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload>;
                };
                update: {
                    args: Prisma.OptionGroupUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload>;
                };
                deleteMany: {
                    args: Prisma.OptionGroupDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OptionGroupUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OptionGroupUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload>[];
                };
                upsert: {
                    args: Prisma.OptionGroupUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPayload>;
                };
                aggregate: {
                    args: Prisma.OptionGroupAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOptionGroup>;
                };
                groupBy: {
                    args: Prisma.OptionGroupGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionGroupGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OptionGroupCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionGroupCountAggregateOutputType> | number;
                };
            };
        };
        OptionGroupOption: {
            payload: Prisma.$OptionGroupOptionPayload<ExtArgs>;
            fields: Prisma.OptionGroupOptionFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OptionGroupOptionFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OptionGroupOptionFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload>;
                };
                findFirst: {
                    args: Prisma.OptionGroupOptionFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OptionGroupOptionFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload>;
                };
                findMany: {
                    args: Prisma.OptionGroupOptionFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload>[];
                };
                create: {
                    args: Prisma.OptionGroupOptionCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload>;
                };
                createMany: {
                    args: Prisma.OptionGroupOptionCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OptionGroupOptionCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload>[];
                };
                delete: {
                    args: Prisma.OptionGroupOptionDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload>;
                };
                update: {
                    args: Prisma.OptionGroupOptionUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload>;
                };
                deleteMany: {
                    args: Prisma.OptionGroupOptionDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OptionGroupOptionUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OptionGroupOptionUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload>[];
                };
                upsert: {
                    args: Prisma.OptionGroupOptionUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupOptionPayload>;
                };
                aggregate: {
                    args: Prisma.OptionGroupOptionAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOptionGroupOption>;
                };
                groupBy: {
                    args: Prisma.OptionGroupOptionGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionGroupOptionGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OptionGroupOptionCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionGroupOptionCountAggregateOutputType> | number;
                };
            };
        };
        PortionSize: {
            payload: Prisma.$PortionSizePayload<ExtArgs>;
            fields: Prisma.PortionSizeFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PortionSizeFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PortionSizeFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload>;
                };
                findFirst: {
                    args: Prisma.PortionSizeFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PortionSizeFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload>;
                };
                findMany: {
                    args: Prisma.PortionSizeFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload>[];
                };
                create: {
                    args: Prisma.PortionSizeCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload>;
                };
                createMany: {
                    args: Prisma.PortionSizeCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PortionSizeCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload>[];
                };
                delete: {
                    args: Prisma.PortionSizeDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload>;
                };
                update: {
                    args: Prisma.PortionSizeUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload>;
                };
                deleteMany: {
                    args: Prisma.PortionSizeDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PortionSizeUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PortionSizeUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload>[];
                };
                upsert: {
                    args: Prisma.PortionSizeUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PortionSizePayload>;
                };
                aggregate: {
                    args: Prisma.PortionSizeAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePortionSize>;
                };
                groupBy: {
                    args: Prisma.PortionSizeGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PortionSizeGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PortionSizeCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PortionSizeCountAggregateOutputType> | number;
                };
            };
        };
        OptionGroupPortion: {
            payload: Prisma.$OptionGroupPortionPayload<ExtArgs>;
            fields: Prisma.OptionGroupPortionFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OptionGroupPortionFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OptionGroupPortionFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload>;
                };
                findFirst: {
                    args: Prisma.OptionGroupPortionFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OptionGroupPortionFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload>;
                };
                findMany: {
                    args: Prisma.OptionGroupPortionFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload>[];
                };
                create: {
                    args: Prisma.OptionGroupPortionCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload>;
                };
                createMany: {
                    args: Prisma.OptionGroupPortionCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OptionGroupPortionCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload>[];
                };
                delete: {
                    args: Prisma.OptionGroupPortionDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload>;
                };
                update: {
                    args: Prisma.OptionGroupPortionUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload>;
                };
                deleteMany: {
                    args: Prisma.OptionGroupPortionDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OptionGroupPortionUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OptionGroupPortionUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload>[];
                };
                upsert: {
                    args: Prisma.OptionGroupPortionUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionGroupPortionPayload>;
                };
                aggregate: {
                    args: Prisma.OptionGroupPortionAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOptionGroupPortion>;
                };
                groupBy: {
                    args: Prisma.OptionGroupPortionGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionGroupPortionGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OptionGroupPortionCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionGroupPortionCountAggregateOutputType> | number;
                };
            };
        };
        MenuCategory: {
            payload: Prisma.$MenuCategoryPayload<ExtArgs>;
            fields: Prisma.MenuCategoryFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.MenuCategoryFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.MenuCategoryFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload>;
                };
                findFirst: {
                    args: Prisma.MenuCategoryFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.MenuCategoryFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload>;
                };
                findMany: {
                    args: Prisma.MenuCategoryFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload>[];
                };
                create: {
                    args: Prisma.MenuCategoryCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload>;
                };
                createMany: {
                    args: Prisma.MenuCategoryCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.MenuCategoryCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload>[];
                };
                delete: {
                    args: Prisma.MenuCategoryDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload>;
                };
                update: {
                    args: Prisma.MenuCategoryUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload>;
                };
                deleteMany: {
                    args: Prisma.MenuCategoryDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.MenuCategoryUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.MenuCategoryUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload>[];
                };
                upsert: {
                    args: Prisma.MenuCategoryUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryPayload>;
                };
                aggregate: {
                    args: Prisma.MenuCategoryAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateMenuCategory>;
                };
                groupBy: {
                    args: Prisma.MenuCategoryGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.MenuCategoryGroupByOutputType>[];
                };
                count: {
                    args: Prisma.MenuCategoryCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.MenuCategoryCountAggregateOutputType> | number;
                };
            };
        };
        MenuCategoryItem: {
            payload: Prisma.$MenuCategoryItemPayload<ExtArgs>;
            fields: Prisma.MenuCategoryItemFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.MenuCategoryItemFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.MenuCategoryItemFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload>;
                };
                findFirst: {
                    args: Prisma.MenuCategoryItemFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.MenuCategoryItemFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload>;
                };
                findMany: {
                    args: Prisma.MenuCategoryItemFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload>[];
                };
                create: {
                    args: Prisma.MenuCategoryItemCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload>;
                };
                createMany: {
                    args: Prisma.MenuCategoryItemCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.MenuCategoryItemCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload>[];
                };
                delete: {
                    args: Prisma.MenuCategoryItemDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload>;
                };
                update: {
                    args: Prisma.MenuCategoryItemUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload>;
                };
                deleteMany: {
                    args: Prisma.MenuCategoryItemDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.MenuCategoryItemUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.MenuCategoryItemUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload>[];
                };
                upsert: {
                    args: Prisma.MenuCategoryItemUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MenuCategoryItemPayload>;
                };
                aggregate: {
                    args: Prisma.MenuCategoryItemAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateMenuCategoryItem>;
                };
                groupBy: {
                    args: Prisma.MenuCategoryItemGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.MenuCategoryItemGroupByOutputType>[];
                };
                count: {
                    args: Prisma.MenuCategoryItemCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.MenuCategoryItemCountAggregateOutputType> | number;
                };
            };
        };
        CompanyHiddenCategory: {
            payload: Prisma.$CompanyHiddenCategoryPayload<ExtArgs>;
            fields: Prisma.CompanyHiddenCategoryFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.CompanyHiddenCategoryFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.CompanyHiddenCategoryFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload>;
                };
                findFirst: {
                    args: Prisma.CompanyHiddenCategoryFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.CompanyHiddenCategoryFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload>;
                };
                findMany: {
                    args: Prisma.CompanyHiddenCategoryFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload>[];
                };
                create: {
                    args: Prisma.CompanyHiddenCategoryCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload>;
                };
                createMany: {
                    args: Prisma.CompanyHiddenCategoryCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.CompanyHiddenCategoryCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload>[];
                };
                delete: {
                    args: Prisma.CompanyHiddenCategoryDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload>;
                };
                update: {
                    args: Prisma.CompanyHiddenCategoryUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload>;
                };
                deleteMany: {
                    args: Prisma.CompanyHiddenCategoryDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.CompanyHiddenCategoryUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.CompanyHiddenCategoryUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload>[];
                };
                upsert: {
                    args: Prisma.CompanyHiddenCategoryUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenCategoryPayload>;
                };
                aggregate: {
                    args: Prisma.CompanyHiddenCategoryAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateCompanyHiddenCategory>;
                };
                groupBy: {
                    args: Prisma.CompanyHiddenCategoryGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyHiddenCategoryGroupByOutputType>[];
                };
                count: {
                    args: Prisma.CompanyHiddenCategoryCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyHiddenCategoryCountAggregateOutputType> | number;
                };
            };
        };
        CompanyHiddenDish: {
            payload: Prisma.$CompanyHiddenDishPayload<ExtArgs>;
            fields: Prisma.CompanyHiddenDishFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.CompanyHiddenDishFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.CompanyHiddenDishFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload>;
                };
                findFirst: {
                    args: Prisma.CompanyHiddenDishFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.CompanyHiddenDishFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload>;
                };
                findMany: {
                    args: Prisma.CompanyHiddenDishFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload>[];
                };
                create: {
                    args: Prisma.CompanyHiddenDishCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload>;
                };
                createMany: {
                    args: Prisma.CompanyHiddenDishCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.CompanyHiddenDishCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload>[];
                };
                delete: {
                    args: Prisma.CompanyHiddenDishDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload>;
                };
                update: {
                    args: Prisma.CompanyHiddenDishUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload>;
                };
                deleteMany: {
                    args: Prisma.CompanyHiddenDishDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.CompanyHiddenDishUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.CompanyHiddenDishUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload>[];
                };
                upsert: {
                    args: Prisma.CompanyHiddenDishUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHiddenDishPayload>;
                };
                aggregate: {
                    args: Prisma.CompanyHiddenDishAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateCompanyHiddenDish>;
                };
                groupBy: {
                    args: Prisma.CompanyHiddenDishGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyHiddenDishGroupByOutputType>[];
                };
                count: {
                    args: Prisma.CompanyHiddenDishCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyHiddenDishCountAggregateOutputType> | number;
                };
            };
        };
        PriceTier: {
            payload: Prisma.$PriceTierPayload<ExtArgs>;
            fields: Prisma.PriceTierFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PriceTierFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PriceTierFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload>;
                };
                findFirst: {
                    args: Prisma.PriceTierFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PriceTierFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload>;
                };
                findMany: {
                    args: Prisma.PriceTierFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload>[];
                };
                create: {
                    args: Prisma.PriceTierCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload>;
                };
                createMany: {
                    args: Prisma.PriceTierCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PriceTierCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload>[];
                };
                delete: {
                    args: Prisma.PriceTierDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload>;
                };
                update: {
                    args: Prisma.PriceTierUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload>;
                };
                deleteMany: {
                    args: Prisma.PriceTierDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PriceTierUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PriceTierUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload>[];
                };
                upsert: {
                    args: Prisma.PriceTierUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PriceTierPayload>;
                };
                aggregate: {
                    args: Prisma.PriceTierAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePriceTier>;
                };
                groupBy: {
                    args: Prisma.PriceTierGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PriceTierGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PriceTierCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PriceTierCountAggregateOutputType> | number;
                };
            };
        };
        DishTierPrice: {
            payload: Prisma.$DishTierPricePayload<ExtArgs>;
            fields: Prisma.DishTierPriceFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.DishTierPriceFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.DishTierPriceFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload>;
                };
                findFirst: {
                    args: Prisma.DishTierPriceFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.DishTierPriceFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload>;
                };
                findMany: {
                    args: Prisma.DishTierPriceFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload>[];
                };
                create: {
                    args: Prisma.DishTierPriceCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload>;
                };
                createMany: {
                    args: Prisma.DishTierPriceCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.DishTierPriceCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload>[];
                };
                delete: {
                    args: Prisma.DishTierPriceDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload>;
                };
                update: {
                    args: Prisma.DishTierPriceUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload>;
                };
                deleteMany: {
                    args: Prisma.DishTierPriceDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.DishTierPriceUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.DishTierPriceUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload>[];
                };
                upsert: {
                    args: Prisma.DishTierPriceUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DishTierPricePayload>;
                };
                aggregate: {
                    args: Prisma.DishTierPriceAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateDishTierPrice>;
                };
                groupBy: {
                    args: Prisma.DishTierPriceGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DishTierPriceGroupByOutputType>[];
                };
                count: {
                    args: Prisma.DishTierPriceCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DishTierPriceCountAggregateOutputType> | number;
                };
            };
        };
        OptionTierPrice: {
            payload: Prisma.$OptionTierPricePayload<ExtArgs>;
            fields: Prisma.OptionTierPriceFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OptionTierPriceFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OptionTierPriceFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload>;
                };
                findFirst: {
                    args: Prisma.OptionTierPriceFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OptionTierPriceFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload>;
                };
                findMany: {
                    args: Prisma.OptionTierPriceFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload>[];
                };
                create: {
                    args: Prisma.OptionTierPriceCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload>;
                };
                createMany: {
                    args: Prisma.OptionTierPriceCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OptionTierPriceCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload>[];
                };
                delete: {
                    args: Prisma.OptionTierPriceDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload>;
                };
                update: {
                    args: Prisma.OptionTierPriceUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload>;
                };
                deleteMany: {
                    args: Prisma.OptionTierPriceDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OptionTierPriceUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OptionTierPriceUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload>[];
                };
                upsert: {
                    args: Prisma.OptionTierPriceUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OptionTierPricePayload>;
                };
                aggregate: {
                    args: Prisma.OptionTierPriceAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOptionTierPrice>;
                };
                groupBy: {
                    args: Prisma.OptionTierPriceGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionTierPriceGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OptionTierPriceCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OptionTierPriceCountAggregateOutputType> | number;
                };
            };
        };
        Company: {
            payload: Prisma.$CompanyPayload<ExtArgs>;
            fields: Prisma.CompanyFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.CompanyFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.CompanyFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload>;
                };
                findFirst: {
                    args: Prisma.CompanyFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.CompanyFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload>;
                };
                findMany: {
                    args: Prisma.CompanyFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload>[];
                };
                create: {
                    args: Prisma.CompanyCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload>;
                };
                createMany: {
                    args: Prisma.CompanyCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.CompanyCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload>[];
                };
                delete: {
                    args: Prisma.CompanyDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload>;
                };
                update: {
                    args: Prisma.CompanyUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload>;
                };
                deleteMany: {
                    args: Prisma.CompanyDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.CompanyUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.CompanyUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload>[];
                };
                upsert: {
                    args: Prisma.CompanyUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyPayload>;
                };
                aggregate: {
                    args: Prisma.CompanyAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateCompany>;
                };
                groupBy: {
                    args: Prisma.CompanyGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyGroupByOutputType>[];
                };
                count: {
                    args: Prisma.CompanyCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyCountAggregateOutputType> | number;
                };
            };
        };
        CompanyDomain: {
            payload: Prisma.$CompanyDomainPayload<ExtArgs>;
            fields: Prisma.CompanyDomainFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.CompanyDomainFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.CompanyDomainFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload>;
                };
                findFirst: {
                    args: Prisma.CompanyDomainFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.CompanyDomainFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload>;
                };
                findMany: {
                    args: Prisma.CompanyDomainFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload>[];
                };
                create: {
                    args: Prisma.CompanyDomainCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload>;
                };
                createMany: {
                    args: Prisma.CompanyDomainCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.CompanyDomainCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload>[];
                };
                delete: {
                    args: Prisma.CompanyDomainDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload>;
                };
                update: {
                    args: Prisma.CompanyDomainUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload>;
                };
                deleteMany: {
                    args: Prisma.CompanyDomainDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.CompanyDomainUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.CompanyDomainUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload>[];
                };
                upsert: {
                    args: Prisma.CompanyDomainUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyDomainPayload>;
                };
                aggregate: {
                    args: Prisma.CompanyDomainAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateCompanyDomain>;
                };
                groupBy: {
                    args: Prisma.CompanyDomainGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyDomainGroupByOutputType>[];
                };
                count: {
                    args: Prisma.CompanyDomainCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyDomainCountAggregateOutputType> | number;
                };
            };
        };
        CompanyAddress: {
            payload: Prisma.$CompanyAddressPayload<ExtArgs>;
            fields: Prisma.CompanyAddressFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.CompanyAddressFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.CompanyAddressFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload>;
                };
                findFirst: {
                    args: Prisma.CompanyAddressFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.CompanyAddressFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload>;
                };
                findMany: {
                    args: Prisma.CompanyAddressFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload>[];
                };
                create: {
                    args: Prisma.CompanyAddressCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload>;
                };
                createMany: {
                    args: Prisma.CompanyAddressCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.CompanyAddressCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload>[];
                };
                delete: {
                    args: Prisma.CompanyAddressDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload>;
                };
                update: {
                    args: Prisma.CompanyAddressUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload>;
                };
                deleteMany: {
                    args: Prisma.CompanyAddressDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.CompanyAddressUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.CompanyAddressUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload>[];
                };
                upsert: {
                    args: Prisma.CompanyAddressUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyAddressPayload>;
                };
                aggregate: {
                    args: Prisma.CompanyAddressAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateCompanyAddress>;
                };
                groupBy: {
                    args: Prisma.CompanyAddressGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyAddressGroupByOutputType>[];
                };
                count: {
                    args: Prisma.CompanyAddressCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyAddressCountAggregateOutputType> | number;
                };
            };
        };
        CompanyWorkingDay: {
            payload: Prisma.$CompanyWorkingDayPayload<ExtArgs>;
            fields: Prisma.CompanyWorkingDayFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.CompanyWorkingDayFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.CompanyWorkingDayFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload>;
                };
                findFirst: {
                    args: Prisma.CompanyWorkingDayFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.CompanyWorkingDayFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload>;
                };
                findMany: {
                    args: Prisma.CompanyWorkingDayFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload>[];
                };
                create: {
                    args: Prisma.CompanyWorkingDayCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload>;
                };
                createMany: {
                    args: Prisma.CompanyWorkingDayCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.CompanyWorkingDayCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload>[];
                };
                delete: {
                    args: Prisma.CompanyWorkingDayDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload>;
                };
                update: {
                    args: Prisma.CompanyWorkingDayUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload>;
                };
                deleteMany: {
                    args: Prisma.CompanyWorkingDayDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.CompanyWorkingDayUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.CompanyWorkingDayUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload>[];
                };
                upsert: {
                    args: Prisma.CompanyWorkingDayUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyWorkingDayPayload>;
                };
                aggregate: {
                    args: Prisma.CompanyWorkingDayAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateCompanyWorkingDay>;
                };
                groupBy: {
                    args: Prisma.CompanyWorkingDayGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyWorkingDayGroupByOutputType>[];
                };
                count: {
                    args: Prisma.CompanyWorkingDayCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyWorkingDayCountAggregateOutputType> | number;
                };
            };
        };
        CompanyHoliday: {
            payload: Prisma.$CompanyHolidayPayload<ExtArgs>;
            fields: Prisma.CompanyHolidayFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.CompanyHolidayFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.CompanyHolidayFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload>;
                };
                findFirst: {
                    args: Prisma.CompanyHolidayFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.CompanyHolidayFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload>;
                };
                findMany: {
                    args: Prisma.CompanyHolidayFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload>[];
                };
                create: {
                    args: Prisma.CompanyHolidayCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload>;
                };
                createMany: {
                    args: Prisma.CompanyHolidayCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.CompanyHolidayCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload>[];
                };
                delete: {
                    args: Prisma.CompanyHolidayDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload>;
                };
                update: {
                    args: Prisma.CompanyHolidayUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload>;
                };
                deleteMany: {
                    args: Prisma.CompanyHolidayDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.CompanyHolidayUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.CompanyHolidayUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload>[];
                };
                upsert: {
                    args: Prisma.CompanyHolidayUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CompanyHolidayPayload>;
                };
                aggregate: {
                    args: Prisma.CompanyHolidayAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateCompanyHoliday>;
                };
                groupBy: {
                    args: Prisma.CompanyHolidayGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyHolidayGroupByOutputType>[];
                };
                count: {
                    args: Prisma.CompanyHolidayCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CompanyHolidayCountAggregateOutputType> | number;
                };
            };
        };
        PackagingType: {
            payload: Prisma.$PackagingTypePayload<ExtArgs>;
            fields: Prisma.PackagingTypeFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PackagingTypeFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PackagingTypeFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload>;
                };
                findFirst: {
                    args: Prisma.PackagingTypeFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PackagingTypeFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload>;
                };
                findMany: {
                    args: Prisma.PackagingTypeFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload>[];
                };
                create: {
                    args: Prisma.PackagingTypeCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload>;
                };
                createMany: {
                    args: Prisma.PackagingTypeCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PackagingTypeCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload>[];
                };
                delete: {
                    args: Prisma.PackagingTypeDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload>;
                };
                update: {
                    args: Prisma.PackagingTypeUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload>;
                };
                deleteMany: {
                    args: Prisma.PackagingTypeDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PackagingTypeUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PackagingTypeUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload>[];
                };
                upsert: {
                    args: Prisma.PackagingTypeUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PackagingTypePayload>;
                };
                aggregate: {
                    args: Prisma.PackagingTypeAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePackagingType>;
                };
                groupBy: {
                    args: Prisma.PackagingTypeGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PackagingTypeGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PackagingTypeCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PackagingTypeCountAggregateOutputType> | number;
                };
            };
        };
        Employee: {
            payload: Prisma.$EmployeePayload<ExtArgs>;
            fields: Prisma.EmployeeFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.EmployeeFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.EmployeeFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload>;
                };
                findFirst: {
                    args: Prisma.EmployeeFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.EmployeeFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload>;
                };
                findMany: {
                    args: Prisma.EmployeeFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload>[];
                };
                create: {
                    args: Prisma.EmployeeCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload>;
                };
                createMany: {
                    args: Prisma.EmployeeCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.EmployeeCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload>[];
                };
                delete: {
                    args: Prisma.EmployeeDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload>;
                };
                update: {
                    args: Prisma.EmployeeUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload>;
                };
                deleteMany: {
                    args: Prisma.EmployeeDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.EmployeeUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.EmployeeUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload>[];
                };
                upsert: {
                    args: Prisma.EmployeeUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeePayload>;
                };
                aggregate: {
                    args: Prisma.EmployeeAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateEmployee>;
                };
                groupBy: {
                    args: Prisma.EmployeeGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.EmployeeGroupByOutputType>[];
                };
                count: {
                    args: Prisma.EmployeeCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.EmployeeCountAggregateOutputType> | number;
                };
            };
        };
        EmployeeAllergen: {
            payload: Prisma.$EmployeeAllergenPayload<ExtArgs>;
            fields: Prisma.EmployeeAllergenFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.EmployeeAllergenFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.EmployeeAllergenFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload>;
                };
                findFirst: {
                    args: Prisma.EmployeeAllergenFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.EmployeeAllergenFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload>;
                };
                findMany: {
                    args: Prisma.EmployeeAllergenFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload>[];
                };
                create: {
                    args: Prisma.EmployeeAllergenCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload>;
                };
                createMany: {
                    args: Prisma.EmployeeAllergenCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.EmployeeAllergenCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload>[];
                };
                delete: {
                    args: Prisma.EmployeeAllergenDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload>;
                };
                update: {
                    args: Prisma.EmployeeAllergenUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload>;
                };
                deleteMany: {
                    args: Prisma.EmployeeAllergenDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.EmployeeAllergenUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.EmployeeAllergenUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload>[];
                };
                upsert: {
                    args: Prisma.EmployeeAllergenUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeAllergenPayload>;
                };
                aggregate: {
                    args: Prisma.EmployeeAllergenAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateEmployeeAllergen>;
                };
                groupBy: {
                    args: Prisma.EmployeeAllergenGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.EmployeeAllergenGroupByOutputType>[];
                };
                count: {
                    args: Prisma.EmployeeAllergenCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.EmployeeAllergenCountAggregateOutputType> | number;
                };
            };
        };
        EmployeeDietaryTag: {
            payload: Prisma.$EmployeeDietaryTagPayload<ExtArgs>;
            fields: Prisma.EmployeeDietaryTagFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.EmployeeDietaryTagFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.EmployeeDietaryTagFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload>;
                };
                findFirst: {
                    args: Prisma.EmployeeDietaryTagFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.EmployeeDietaryTagFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload>;
                };
                findMany: {
                    args: Prisma.EmployeeDietaryTagFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload>[];
                };
                create: {
                    args: Prisma.EmployeeDietaryTagCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload>;
                };
                createMany: {
                    args: Prisma.EmployeeDietaryTagCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.EmployeeDietaryTagCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload>[];
                };
                delete: {
                    args: Prisma.EmployeeDietaryTagDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload>;
                };
                update: {
                    args: Prisma.EmployeeDietaryTagUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload>;
                };
                deleteMany: {
                    args: Prisma.EmployeeDietaryTagDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.EmployeeDietaryTagUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.EmployeeDietaryTagUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload>[];
                };
                upsert: {
                    args: Prisma.EmployeeDietaryTagUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$EmployeeDietaryTagPayload>;
                };
                aggregate: {
                    args: Prisma.EmployeeDietaryTagAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateEmployeeDietaryTag>;
                };
                groupBy: {
                    args: Prisma.EmployeeDietaryTagGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.EmployeeDietaryTagGroupByOutputType>[];
                };
                count: {
                    args: Prisma.EmployeeDietaryTagCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.EmployeeDietaryTagCountAggregateOutputType> | number;
                };
            };
        };
        Order: {
            payload: Prisma.$OrderPayload<ExtArgs>;
            fields: Prisma.OrderFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OrderFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OrderFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload>;
                };
                findFirst: {
                    args: Prisma.OrderFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OrderFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload>;
                };
                findMany: {
                    args: Prisma.OrderFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload>[];
                };
                create: {
                    args: Prisma.OrderCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload>;
                };
                createMany: {
                    args: Prisma.OrderCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OrderCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload>[];
                };
                delete: {
                    args: Prisma.OrderDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload>;
                };
                update: {
                    args: Prisma.OrderUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload>;
                };
                deleteMany: {
                    args: Prisma.OrderDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OrderUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OrderUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload>[];
                };
                upsert: {
                    args: Prisma.OrderUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderPayload>;
                };
                aggregate: {
                    args: Prisma.OrderAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOrder>;
                };
                groupBy: {
                    args: Prisma.OrderGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OrderCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderCountAggregateOutputType> | number;
                };
            };
        };
        OrderLine: {
            payload: Prisma.$OrderLinePayload<ExtArgs>;
            fields: Prisma.OrderLineFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OrderLineFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OrderLineFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload>;
                };
                findFirst: {
                    args: Prisma.OrderLineFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OrderLineFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload>;
                };
                findMany: {
                    args: Prisma.OrderLineFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload>[];
                };
                create: {
                    args: Prisma.OrderLineCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload>;
                };
                createMany: {
                    args: Prisma.OrderLineCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OrderLineCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload>[];
                };
                delete: {
                    args: Prisma.OrderLineDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload>;
                };
                update: {
                    args: Prisma.OrderLineUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload>;
                };
                deleteMany: {
                    args: Prisma.OrderLineDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OrderLineUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OrderLineUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload>[];
                };
                upsert: {
                    args: Prisma.OrderLineUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderLinePayload>;
                };
                aggregate: {
                    args: Prisma.OrderLineAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOrderLine>;
                };
                groupBy: {
                    args: Prisma.OrderLineGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderLineGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OrderLineCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderLineCountAggregateOutputType> | number;
                };
            };
        };
        OrderCombination: {
            payload: Prisma.$OrderCombinationPayload<ExtArgs>;
            fields: Prisma.OrderCombinationFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OrderCombinationFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OrderCombinationFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload>;
                };
                findFirst: {
                    args: Prisma.OrderCombinationFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OrderCombinationFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload>;
                };
                findMany: {
                    args: Prisma.OrderCombinationFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload>[];
                };
                create: {
                    args: Prisma.OrderCombinationCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload>;
                };
                createMany: {
                    args: Prisma.OrderCombinationCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OrderCombinationCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload>[];
                };
                delete: {
                    args: Prisma.OrderCombinationDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload>;
                };
                update: {
                    args: Prisma.OrderCombinationUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload>;
                };
                deleteMany: {
                    args: Prisma.OrderCombinationDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OrderCombinationUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OrderCombinationUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload>[];
                };
                upsert: {
                    args: Prisma.OrderCombinationUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationPayload>;
                };
                aggregate: {
                    args: Prisma.OrderCombinationAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOrderCombination>;
                };
                groupBy: {
                    args: Prisma.OrderCombinationGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderCombinationGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OrderCombinationCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderCombinationCountAggregateOutputType> | number;
                };
            };
        };
        OrderCombinationOption: {
            payload: Prisma.$OrderCombinationOptionPayload<ExtArgs>;
            fields: Prisma.OrderCombinationOptionFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OrderCombinationOptionFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OrderCombinationOptionFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload>;
                };
                findFirst: {
                    args: Prisma.OrderCombinationOptionFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OrderCombinationOptionFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload>;
                };
                findMany: {
                    args: Prisma.OrderCombinationOptionFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload>[];
                };
                create: {
                    args: Prisma.OrderCombinationOptionCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload>;
                };
                createMany: {
                    args: Prisma.OrderCombinationOptionCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OrderCombinationOptionCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload>[];
                };
                delete: {
                    args: Prisma.OrderCombinationOptionDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload>;
                };
                update: {
                    args: Prisma.OrderCombinationOptionUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload>;
                };
                deleteMany: {
                    args: Prisma.OrderCombinationOptionDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OrderCombinationOptionUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OrderCombinationOptionUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload>[];
                };
                upsert: {
                    args: Prisma.OrderCombinationOptionUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderCombinationOptionPayload>;
                };
                aggregate: {
                    args: Prisma.OrderCombinationOptionAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOrderCombinationOption>;
                };
                groupBy: {
                    args: Prisma.OrderCombinationOptionGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderCombinationOptionGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OrderCombinationOptionCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderCombinationOptionCountAggregateOutputType> | number;
                };
            };
        };
        OrderEvent: {
            payload: Prisma.$OrderEventPayload<ExtArgs>;
            fields: Prisma.OrderEventFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.OrderEventFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.OrderEventFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload>;
                };
                findFirst: {
                    args: Prisma.OrderEventFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.OrderEventFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload>;
                };
                findMany: {
                    args: Prisma.OrderEventFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload>[];
                };
                create: {
                    args: Prisma.OrderEventCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload>;
                };
                createMany: {
                    args: Prisma.OrderEventCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.OrderEventCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload>[];
                };
                delete: {
                    args: Prisma.OrderEventDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload>;
                };
                update: {
                    args: Prisma.OrderEventUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload>;
                };
                deleteMany: {
                    args: Prisma.OrderEventDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.OrderEventUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.OrderEventUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload>[];
                };
                upsert: {
                    args: Prisma.OrderEventUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$OrderEventPayload>;
                };
                aggregate: {
                    args: Prisma.OrderEventAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateOrderEvent>;
                };
                groupBy: {
                    args: Prisma.OrderEventGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderEventGroupByOutputType>[];
                };
                count: {
                    args: Prisma.OrderEventCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.OrderEventCountAggregateOutputType> | number;
                };
            };
        };
        PrepUnit: {
            payload: Prisma.$PrepUnitPayload<ExtArgs>;
            fields: Prisma.PrepUnitFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PrepUnitFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PrepUnitFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload>;
                };
                findFirst: {
                    args: Prisma.PrepUnitFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PrepUnitFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload>;
                };
                findMany: {
                    args: Prisma.PrepUnitFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload>[];
                };
                create: {
                    args: Prisma.PrepUnitCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload>;
                };
                createMany: {
                    args: Prisma.PrepUnitCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PrepUnitCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload>[];
                };
                delete: {
                    args: Prisma.PrepUnitDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload>;
                };
                update: {
                    args: Prisma.PrepUnitUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload>;
                };
                deleteMany: {
                    args: Prisma.PrepUnitDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PrepUnitUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PrepUnitUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload>[];
                };
                upsert: {
                    args: Prisma.PrepUnitUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PrepUnitPayload>;
                };
                aggregate: {
                    args: Prisma.PrepUnitAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePrepUnit>;
                };
                groupBy: {
                    args: Prisma.PrepUnitGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PrepUnitGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PrepUnitCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PrepUnitCountAggregateOutputType> | number;
                };
            };
        };
        DeliveryDrop: {
            payload: Prisma.$DeliveryDropPayload<ExtArgs>;
            fields: Prisma.DeliveryDropFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.DeliveryDropFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.DeliveryDropFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload>;
                };
                findFirst: {
                    args: Prisma.DeliveryDropFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.DeliveryDropFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload>;
                };
                findMany: {
                    args: Prisma.DeliveryDropFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload>[];
                };
                create: {
                    args: Prisma.DeliveryDropCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload>;
                };
                createMany: {
                    args: Prisma.DeliveryDropCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.DeliveryDropCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload>[];
                };
                delete: {
                    args: Prisma.DeliveryDropDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload>;
                };
                update: {
                    args: Prisma.DeliveryDropUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload>;
                };
                deleteMany: {
                    args: Prisma.DeliveryDropDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.DeliveryDropUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.DeliveryDropUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload>[];
                };
                upsert: {
                    args: Prisma.DeliveryDropUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryDropPayload>;
                };
                aggregate: {
                    args: Prisma.DeliveryDropAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateDeliveryDrop>;
                };
                groupBy: {
                    args: Prisma.DeliveryDropGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DeliveryDropGroupByOutputType>[];
                };
                count: {
                    args: Prisma.DeliveryDropCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DeliveryDropCountAggregateOutputType> | number;
                };
            };
        };
        Invoice: {
            payload: Prisma.$InvoicePayload<ExtArgs>;
            fields: Prisma.InvoiceFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.InvoiceFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.InvoiceFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload>;
                };
                findFirst: {
                    args: Prisma.InvoiceFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.InvoiceFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload>;
                };
                findMany: {
                    args: Prisma.InvoiceFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload>[];
                };
                create: {
                    args: Prisma.InvoiceCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload>;
                };
                createMany: {
                    args: Prisma.InvoiceCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.InvoiceCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload>[];
                };
                delete: {
                    args: Prisma.InvoiceDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload>;
                };
                update: {
                    args: Prisma.InvoiceUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload>;
                };
                deleteMany: {
                    args: Prisma.InvoiceDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.InvoiceUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.InvoiceUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload>[];
                };
                upsert: {
                    args: Prisma.InvoiceUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoicePayload>;
                };
                aggregate: {
                    args: Prisma.InvoiceAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateInvoice>;
                };
                groupBy: {
                    args: Prisma.InvoiceGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.InvoiceGroupByOutputType>[];
                };
                count: {
                    args: Prisma.InvoiceCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.InvoiceCountAggregateOutputType> | number;
                };
            };
        };
        InvoiceOrder: {
            payload: Prisma.$InvoiceOrderPayload<ExtArgs>;
            fields: Prisma.InvoiceOrderFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.InvoiceOrderFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.InvoiceOrderFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload>;
                };
                findFirst: {
                    args: Prisma.InvoiceOrderFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.InvoiceOrderFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload>;
                };
                findMany: {
                    args: Prisma.InvoiceOrderFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload>[];
                };
                create: {
                    args: Prisma.InvoiceOrderCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload>;
                };
                createMany: {
                    args: Prisma.InvoiceOrderCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.InvoiceOrderCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload>[];
                };
                delete: {
                    args: Prisma.InvoiceOrderDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload>;
                };
                update: {
                    args: Prisma.InvoiceOrderUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload>;
                };
                deleteMany: {
                    args: Prisma.InvoiceOrderDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.InvoiceOrderUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.InvoiceOrderUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload>[];
                };
                upsert: {
                    args: Prisma.InvoiceOrderUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$InvoiceOrderPayload>;
                };
                aggregate: {
                    args: Prisma.InvoiceOrderAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateInvoiceOrder>;
                };
                groupBy: {
                    args: Prisma.InvoiceOrderGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.InvoiceOrderGroupByOutputType>[];
                };
                count: {
                    args: Prisma.InvoiceOrderCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.InvoiceOrderCountAggregateOutputType> | number;
                };
            };
        };
        PlatformSettings: {
            payload: Prisma.$PlatformSettingsPayload<ExtArgs>;
            fields: Prisma.PlatformSettingsFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PlatformSettingsFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PlatformSettingsFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload>;
                };
                findFirst: {
                    args: Prisma.PlatformSettingsFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PlatformSettingsFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload>;
                };
                findMany: {
                    args: Prisma.PlatformSettingsFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload>[];
                };
                create: {
                    args: Prisma.PlatformSettingsCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload>;
                };
                createMany: {
                    args: Prisma.PlatformSettingsCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PlatformSettingsCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload>[];
                };
                delete: {
                    args: Prisma.PlatformSettingsDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload>;
                };
                update: {
                    args: Prisma.PlatformSettingsUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload>;
                };
                deleteMany: {
                    args: Prisma.PlatformSettingsDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PlatformSettingsUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PlatformSettingsUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload>[];
                };
                upsert: {
                    args: Prisma.PlatformSettingsUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlatformSettingsPayload>;
                };
                aggregate: {
                    args: Prisma.PlatformSettingsAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePlatformSettings>;
                };
                groupBy: {
                    args: Prisma.PlatformSettingsGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PlatformSettingsGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PlatformSettingsCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PlatformSettingsCountAggregateOutputType> | number;
                };
            };
        };
        KitchenWorkingDay: {
            payload: Prisma.$KitchenWorkingDayPayload<ExtArgs>;
            fields: Prisma.KitchenWorkingDayFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.KitchenWorkingDayFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.KitchenWorkingDayFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload>;
                };
                findFirst: {
                    args: Prisma.KitchenWorkingDayFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.KitchenWorkingDayFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload>;
                };
                findMany: {
                    args: Prisma.KitchenWorkingDayFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload>[];
                };
                create: {
                    args: Prisma.KitchenWorkingDayCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload>;
                };
                createMany: {
                    args: Prisma.KitchenWorkingDayCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.KitchenWorkingDayCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload>[];
                };
                delete: {
                    args: Prisma.KitchenWorkingDayDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload>;
                };
                update: {
                    args: Prisma.KitchenWorkingDayUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload>;
                };
                deleteMany: {
                    args: Prisma.KitchenWorkingDayDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.KitchenWorkingDayUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.KitchenWorkingDayUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload>[];
                };
                upsert: {
                    args: Prisma.KitchenWorkingDayUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenWorkingDayPayload>;
                };
                aggregate: {
                    args: Prisma.KitchenWorkingDayAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateKitchenWorkingDay>;
                };
                groupBy: {
                    args: Prisma.KitchenWorkingDayGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.KitchenWorkingDayGroupByOutputType>[];
                };
                count: {
                    args: Prisma.KitchenWorkingDayCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.KitchenWorkingDayCountAggregateOutputType> | number;
                };
            };
        };
        KitchenHoliday: {
            payload: Prisma.$KitchenHolidayPayload<ExtArgs>;
            fields: Prisma.KitchenHolidayFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.KitchenHolidayFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.KitchenHolidayFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload>;
                };
                findFirst: {
                    args: Prisma.KitchenHolidayFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.KitchenHolidayFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload>;
                };
                findMany: {
                    args: Prisma.KitchenHolidayFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload>[];
                };
                create: {
                    args: Prisma.KitchenHolidayCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload>;
                };
                createMany: {
                    args: Prisma.KitchenHolidayCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.KitchenHolidayCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload>[];
                };
                delete: {
                    args: Prisma.KitchenHolidayDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload>;
                };
                update: {
                    args: Prisma.KitchenHolidayUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload>;
                };
                deleteMany: {
                    args: Prisma.KitchenHolidayDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.KitchenHolidayUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.KitchenHolidayUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload>[];
                };
                upsert: {
                    args: Prisma.KitchenHolidayUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$KitchenHolidayPayload>;
                };
                aggregate: {
                    args: Prisma.KitchenHolidayAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateKitchenHoliday>;
                };
                groupBy: {
                    args: Prisma.KitchenHolidayGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.KitchenHolidayGroupByOutputType>[];
                };
                count: {
                    args: Prisma.KitchenHolidayCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.KitchenHolidayCountAggregateOutputType> | number;
                };
            };
        };
    };
} & {
    other: {
        payload: any;
        operations: {
            $executeRaw: {
                args: [query: TemplateStringsArray | Sql, ...values: any[]];
                result: any;
            };
            $executeRawUnsafe: {
                args: [query: string, ...values: any[]];
                result: any;
            };
            $queryRaw: {
                args: [query: TemplateStringsArray | Sql, ...values: any[]];
                result: any;
            };
            $queryRawUnsafe: {
                args: [query: string, ...values: any[]];
                result: any;
            };
        };
    };
};
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
    readonly DbNull: runtime.DbNullClass;
    readonly JsonNull: runtime.JsonNullClass;
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
    readonly DbNull: runtime.DbNullClass;
    readonly JsonNull: runtime.JsonNullClass;
    readonly AnyNull: runtime.AnyNullClass;
};
export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter];
export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>;
export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>;
export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>;
export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>;
export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>;
export type EnumTemperatureFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Temperature'>;
export type ListEnumTemperatureFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Temperature[]'>;
export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>;
export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>;
export type EnumPriceTierStrategyFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PriceTierStrategy'>;
export type ListEnumPriceTierStrategyFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PriceTierStrategy[]'>;
export type EnumDayOfWeekFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DayOfWeek'>;
export type ListEnumDayOfWeekFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DayOfWeek[]'>;
export type EnumOrderStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrderStatus'>;
export type ListEnumOrderStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrderStatus[]'>;
export type EnumOrderEventTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrderEventType'>;
export type ListEnumOrderEventTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'OrderEventType[]'>;
export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>;
export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>;
export type EnumDeliveryDropStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DeliveryDropStatus'>;
export type ListEnumDeliveryDropStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DeliveryDropStatus[]'>;
export type EnumInvoiceStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InvoiceStatus'>;
export type ListEnumInvoiceStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InvoiceStatus[]'>;
export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>;
export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>;
export type BatchPayload = {
    count: number;
};
export declare const defineExtension: runtime.Types.Extensions.ExtendsHook<"define", TypeMapCb, runtime.Types.Extensions.DefaultArgs>;
export type DefaultPrismaClient = PrismaClient;
export type ErrorFormat = 'pretty' | 'colorless' | 'minimal';
export interface PrismaClientBaseOptions {
    errorFormat?: ErrorFormat;
    log?: (LogLevel | LogDefinition)[];
    transactionOptions?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: TransactionIsolationLevel;
    };
    omit?: GlobalOmitConfig;
    comments?: runtime.SqlCommenterPlugin[];
    queryPlanCacheMaxSize?: number;
}
export interface PrismaClientOptionsWithAccelerateUrl extends PrismaClientBaseOptions {
    accelerateUrl: string;
    adapter?: never;
}
export interface PrismaClientOptionsWithAdapter extends PrismaClientBaseOptions {
    adapter: runtime.SqlDriverAdapterFactory;
    accelerateUrl?: never;
}
export type PrismaClientOptions = PrismaClientOptionsWithAccelerateUrl | PrismaClientOptionsWithAdapter;
export type GlobalOmitConfig = {
    staffUser?: Prisma.StaffUserOmit;
    role?: Prisma.RoleOmit;
    permission?: Prisma.PermissionOmit;
    rolePermission?: Prisma.RolePermissionOmit;
    dish?: Prisma.DishOmit;
    option?: Prisma.OptionOmit;
    kitchenStation?: Prisma.KitchenStationOmit;
    allergen?: Prisma.AllergenOmit;
    dietaryTag?: Prisma.DietaryTagOmit;
    dishAllergen?: Prisma.DishAllergenOmit;
    optionAllergen?: Prisma.OptionAllergenOmit;
    dishDietaryTag?: Prisma.DishDietaryTagOmit;
    optionDietaryTag?: Prisma.OptionDietaryTagOmit;
    optionGroup?: Prisma.OptionGroupOmit;
    optionGroupOption?: Prisma.OptionGroupOptionOmit;
    portionSize?: Prisma.PortionSizeOmit;
    optionGroupPortion?: Prisma.OptionGroupPortionOmit;
    menuCategory?: Prisma.MenuCategoryOmit;
    menuCategoryItem?: Prisma.MenuCategoryItemOmit;
    companyHiddenCategory?: Prisma.CompanyHiddenCategoryOmit;
    companyHiddenDish?: Prisma.CompanyHiddenDishOmit;
    priceTier?: Prisma.PriceTierOmit;
    dishTierPrice?: Prisma.DishTierPriceOmit;
    optionTierPrice?: Prisma.OptionTierPriceOmit;
    company?: Prisma.CompanyOmit;
    companyDomain?: Prisma.CompanyDomainOmit;
    companyAddress?: Prisma.CompanyAddressOmit;
    companyWorkingDay?: Prisma.CompanyWorkingDayOmit;
    companyHoliday?: Prisma.CompanyHolidayOmit;
    packagingType?: Prisma.PackagingTypeOmit;
    employee?: Prisma.EmployeeOmit;
    employeeAllergen?: Prisma.EmployeeAllergenOmit;
    employeeDietaryTag?: Prisma.EmployeeDietaryTagOmit;
    order?: Prisma.OrderOmit;
    orderLine?: Prisma.OrderLineOmit;
    orderCombination?: Prisma.OrderCombinationOmit;
    orderCombinationOption?: Prisma.OrderCombinationOptionOmit;
    orderEvent?: Prisma.OrderEventOmit;
    prepUnit?: Prisma.PrepUnitOmit;
    deliveryDrop?: Prisma.DeliveryDropOmit;
    invoice?: Prisma.InvoiceOmit;
    invoiceOrder?: Prisma.InvoiceOrderOmit;
    platformSettings?: Prisma.PlatformSettingsOmit;
    kitchenWorkingDay?: Prisma.KitchenWorkingDayOmit;
    kitchenHoliday?: Prisma.KitchenHolidayOmit;
};
export type LogLevel = 'info' | 'query' | 'warn' | 'error';
export type LogDefinition = {
    level: LogLevel;
    emit: 'stdout' | 'event';
};
export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;
export type GetLogType<T> = CheckIsLogLevel<T extends LogDefinition ? T['level'] : T>;
export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition> ? GetLogType<T[number]> : never;
export type QueryEvent = {
    timestamp: Date;
    query: string;
    params: string;
    duration: number;
    target: string;
};
export type LogEvent = {
    timestamp: Date;
    message: string;
    target: string;
};
export type PrismaAction = 'findUnique' | 'findUniqueOrThrow' | 'findMany' | 'findFirst' | 'findFirstOrThrow' | 'create' | 'createMany' | 'createManyAndReturn' | 'update' | 'updateMany' | 'updateManyAndReturn' | 'upsert' | 'delete' | 'deleteMany' | 'executeRaw' | 'queryRaw' | 'aggregate' | 'count' | 'runCommandRaw' | 'findRaw' | 'groupBy';
export type TransactionClient = Omit<DefaultPrismaClient, runtime.ITXClientDenyList>;
