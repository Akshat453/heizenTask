"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { companiesApi, type Company } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, Edit2, FileText } from "lucide-react";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const response = await companiesApi.list();
        setCompanies(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load companies");
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  if (loading) return <div className="p-8">Loading companies...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <Link href="/companies/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" /> Add Company
        </Link>
      </div>
      
      {companies.length === 0 ? (
        <p className="text-muted-foreground">No companies found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Owner</th>
                <th className="px-6 py-3 font-medium">Domains</th>
                <th className="px-6 py-3 font-medium">Employees</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 font-medium">{c.name}</td>
                  <td className="px-6 py-4">{c.ownerEmployee?.name || "None"}</td>
                  <td className="px-6 py-4">
                    {c.domains.map((d) => d.domain).join(", ")}
                  </td>
                  <td className="px-6 py-4">{c._count?.employees || 0}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Link href={`/companies/${c.id}/billing`} className={buttonVariants({ variant: "ghost", size: "icon" })} title="Generate Invoice">
                      <FileText className="h-4 w-4" />
                    </Link>
                    <Link href={`/companies/${c.id}/edit`} className={buttonVariants({ variant: "ghost", size: "icon" })} title="Edit Company">
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
