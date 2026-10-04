import { redirect } from "next/navigation";

/** The old edit route now lives in the company page's tabs. */
export default async function EditCompanyRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/companies/${id}`);
}
