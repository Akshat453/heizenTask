import { referenceDataApi, type NamedReference, type OrderedReference } from "@/lib/api";

export type RefRow = NamedReference & { displayOrder?: number };
export type RefKind = { key: string; label: string; singular: string; ordered: boolean;
  list: () => Promise<RefRow[]>;
  create: (body: { name: string; displayOrder: number }) => Promise<RefRow>;
  update: (id: string, body: Partial<OrderedReference>) => Promise<RefRow>;
};

export const REF_KINDS: RefKind[] = [
  { key: "allergens", label: "Allergens", singular: "allergen", ordered: false, list: referenceDataApi.allergens, create: ({ name }) => referenceDataApi.createAllergen({ name }), update: referenceDataApi.updateAllergen },
  { key: "dietary-tags", label: "Dietary tags", singular: "dietary tag", ordered: false, list: referenceDataApi.dietaryTags, create: ({ name }) => referenceDataApi.createDietaryTag({ name }), update: referenceDataApi.updateDietaryTag },
  { key: "kitchen-stations", label: "Kitchen stations", singular: "station", ordered: true, list: referenceDataApi.kitchenStations, create: referenceDataApi.createKitchenStation, update: referenceDataApi.updateKitchenStation },
  { key: "portion-sizes", label: "Portion sizes", singular: "portion size", ordered: true, list: referenceDataApi.portionSizes, create: referenceDataApi.createPortionSize, update: referenceDataApi.updatePortionSize },
  { key: "packaging-types", label: "Packaging types", singular: "packaging type", ordered: true, list: referenceDataApi.packagingTypes, create: referenceDataApi.createPackagingType, update: referenceDataApi.updatePackagingType },
];

export const refKey = (key: string) => ["reference", key] as const;
