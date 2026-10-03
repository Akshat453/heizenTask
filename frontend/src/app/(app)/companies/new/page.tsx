import { CompanyForm } from "@/components/companies/company-form";

export default function NewCompanyPage() {
  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Create New Company</h1>
      <CompanyForm />
    </main>
  );
}
