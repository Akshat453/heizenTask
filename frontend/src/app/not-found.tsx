import { Leaf } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Leaf className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">This page does not exist or has moved. Check the address, or go back to your dashboard.</p>
      </div>
      <Button render={<Link href="/dashboard" />} nativeButton={false}>Go to dashboard</Button>
    </main>
  );
}
