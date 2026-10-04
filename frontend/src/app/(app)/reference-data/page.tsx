"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { PageHeader } from "@/components/app/page-header";
import { TabNav } from "@/components/app/tab-nav";
import { useAuth } from "@/components/auth/auth-provider";
import { REF_KINDS } from "@/components/reference/reference-config";
import { ReferenceTable } from "@/components/reference/reference-table";
import { P } from "@/lib/permissions";

const KEYS = REF_KINDS.map((k) => k.key);

export default function ReferenceDataPage() {
  const { can } = useAuth();
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(KEYS).withDefault(KEYS[0]));
  const kind = REF_KINDS.find((k) => k.key === tab) ?? REF_KINDS[0];
  const canManage = can(P.catalogueManage);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Reference data"
        description={canManage ? "Shared lists used by dishes, companies and orders. Entries are deactivated, never deleted." : "Shared lists used by dishes, companies and orders (view only)."}
        tabs={<TabNav label="Reference lists" tabs={REF_KINDS.map((k) => ({ value: k.key, label: k.label }))} value={kind.key} onChange={(v) => void setTab(v)} />}
      />
      <ReferenceTable key={kind.key} kind={kind} canManage={canManage} />
    </main>
  );
}
