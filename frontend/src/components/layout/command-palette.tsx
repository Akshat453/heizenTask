"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, ClipboardList, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { Company, Employee, OrderStatus, PaginatedResponse } from "@/lib/api";
import { apiRequest } from "@/lib/api-client";
import { toIsoDate, formatBusinessDate } from "@/lib/format";
import { P } from "@/lib/permissions";
import { NAV_GROUPS, isNavItemAllowed, visibleNavGroups } from "./navigation";

type OrderHit = { id: string; orderNumber: string; status: OrderStatus; deliveryDate: string; company: { name: string }; employee: { name: string } };
type Hits = { orders: OrderHit[]; companies: Company[]; employees: Employee[] };

const LIMIT = 5;
const ordersPageAvailable = NAV_GROUPS.flatMap((g) => g.items).some((i) => i.href === "/orders" && i.available);

export function CommandPalette() {
  const router = useRouter();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term.trim(), 300);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searchOrders = ordersPageAvailable && can(P.ordersRead);
  const searchCompanies = can(P.companiesRead);
  const searchEmployees = can(P.employeesRead);
  const qs = `search=${encodeURIComponent(search)}&pageSize=${LIMIT}`;

  const hits = useQuery({
    queryKey: ["command-palette", search, searchOrders, searchCompanies, searchEmployees],
    enabled: open && search.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<Hits> => {
      const [orders, companies, employees] = await Promise.all([
        searchOrders ? apiRequest<PaginatedResponse<OrderHit>>(`/orders?${qs}`) : null,
        searchCompanies ? apiRequest<PaginatedResponse<Company>>(`/companies?${qs}`) : null,
        searchEmployees ? apiRequest<PaginatedResponse<Employee>>(`/employees?${qs}`) : null,
      ]);
      return { orders: orders?.data ?? [], companies: companies?.data ?? [], employees: employees?.data ?? [] };
    },
  });

  const go = (href: string) => {
    setOpen(false);
    setTerm("");
    router.push(href);
  };

  const needle = term.trim().toLowerCase();
  const pages = visibleNavGroups(can)
    .flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })))
    .filter((item) => isNavItemAllowed(item, can) && (!needle || item.label.toLowerCase().includes(needle)));
  const data = search.length >= 2 ? hits.data : undefined;
  const nothing = pages.length === 0 && !hits.isFetching && (!data || (!data.orders.length && !data.companies.length && !data.employees.length));

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={() => setOpen(true)} aria-label="Open command palette">
        <Search />
        <span className="hidden md:inline">Search or jump to…</span>
        <kbd className="num hidden rounded border bg-muted px-1 text-[11px] md:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search Fernleaf" description="Jump to a page or find an order, company or employee.">
        {/* cmdk needs a <Command> root; server results are already matched, and pages are filtered by `needle`. */}
        <Command shouldFilter={false}>
        <CommandInput value={term} onValueChange={setTerm} placeholder="Type a page, order number, company or employee…" />
        <CommandList>
          {nothing && <CommandEmpty>No matches. Try an order number or a company name.</CommandEmpty>}
          {pages.length > 0 && (
            <CommandGroup heading="Pages">
              {pages.map((item) => (
                <CommandItem key={item.href} value={`page:${item.href}`} onSelect={() => go(item.href)}>
                  <item.icon />
                  {item.label}
                  <CommandShortcut>{item.group}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data && data.orders.length > 0 && (
            <CommandGroup heading="Orders">
              {data.orders.map((o) => (
                <CommandItem key={o.id} value={`order:${o.id}`} onSelect={() => go(`/orders/${o.id}`)}>
                  <ClipboardList />
                  <span className="num">{o.orderNumber}</span>
                  <span className="truncate text-muted-foreground">
                    {o.employee.name} · {o.company.name}
                  </span>
                  <CommandShortcut>{formatBusinessDate(toIsoDate(o.deliveryDate))}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data && data.companies.length > 0 && (
            <CommandGroup heading="Companies">
              {data.companies.map((c) => (
                <CommandItem key={c.id} value={`company:${c.id}`} onSelect={() => go(`/companies/${c.id}`)}>
                  <Building2 />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data && data.employees.length > 0 && (
            <CommandGroup heading="Employees">
              {data.employees.map((e) => (
                <CommandItem key={e.id} value={`employee:${e.id}`} onSelect={() => go(`/employees/${e.id}`)}>
                  <User />
                  {e.name}
                  <span className="truncate text-muted-foreground">{e.company.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
