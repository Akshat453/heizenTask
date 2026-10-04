"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CompanyForm } from "@/components/companies/company-form";
import { companiesApi, type Company } from "@/lib/api";

export default function EditCompanyPage() {
  const { id } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    companiesApi.get(id as string)
      .then(setCompany)
      .catch(err => setError(err.message));
  }, [id]);

  if (error) return <div className="p-8 text-danger">Error: {error}</div>;
  if (!company) return <div className="p-8">Loading company details...</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Edit Company: {company.name}</h1>
      <CompanyForm initialData={company} />
    </main>
  );
}
