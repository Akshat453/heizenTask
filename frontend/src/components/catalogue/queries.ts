"use client";

import { useQuery } from "@tanstack/react-query";
import { referenceDataApi } from "@/lib/api";

export const catalogueKeys = {
  all: ["catalogue"] as const,
  dishes: (query: object) => [...catalogueKeys.all, "dishes", query] as const,
  dish: (id: string) => [...catalogueKeys.all, "dish", id] as const,
  options: (query: object) => [...catalogueKeys.all, "options", query] as const,
  option: (id: string) => [...catalogueKeys.all, "option", id] as const,
  allOptions: () => [...catalogueKeys.all, "options", "all"] as const,
};

const ref = { staleTime: 5 * 60_000 };
/** Reference lists the catalogue forms need (catalogue.read). */
export function useCatalogueReference() {
  return {
    stations: useQuery({ queryKey: ["reference", "kitchen-stations"], queryFn: referenceDataApi.kitchenStations, ...ref }),
    allergens: useQuery({ queryKey: ["reference", "allergens"], queryFn: referenceDataApi.allergens, ...ref }),
    dietaryTags: useQuery({ queryKey: ["reference", "dietary-tags"], queryFn: referenceDataApi.dietaryTags, ...ref }),
    portions: useQuery({ queryKey: ["reference", "portion-sizes"], queryFn: referenceDataApi.portionSizes, ...ref }),
  };
}
