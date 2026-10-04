"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NAV_GROUPS } from "./navigation";

const SEGMENT_LABELS: Record<string, string> = {
  new: "New",
  edit: "Edit",
  billing: "Billing",
  invoices: "Invoices",
  preview: "Preview",
};

const NAV_LABELS = new Map(NAV_GROUPS.flatMap((g) => g.items).map((item) => [item.href, item.label]));
const isId = (segment: string) => /^[0-9a-f-]{16,}$/i.test(segment);

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const label = NAV_LABELS.get(href) ?? SEGMENT_LABELS[segment] ?? (isId(segment) ? "Details" : segment);
    return { href, label };
  });

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
            <BreadcrumbItem className={index < crumbs.length - 1 ? "hidden sm:inline-flex" : "truncate"}>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
