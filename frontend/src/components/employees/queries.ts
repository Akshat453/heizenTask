export const employeeKeys = {
  all: ["employees"] as const,
  list: (query: object) => [...employeeKeys.all, "list", query] as const,
  detail: (id: string) => [...employeeKeys.all, "detail", id] as const,
};
