import { ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <div className="mb-5 grid size-11 place-items-center rounded-lg border bg-white text-emerald-900 shadow-sm">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </div>
        <p className="text-sm font-medium text-emerald-800">Secure staff access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Operations foundation ready
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Your account is authenticated and permissions are loaded from the
          Heizen staff directory. Operational modules will appear here as they
          are added.
        </p>
      </div>
    </main>
  );
}
