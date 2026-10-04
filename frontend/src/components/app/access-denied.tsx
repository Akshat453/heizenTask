import { ShieldX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export function AccessDenied({ className }: { className?: string }) {
  return (
    <EmptyState
      className={className}
      icon={ShieldX}
      title="You don't have access to this page"
      description="Your role does not include the permission this page needs. Ask an admin if you think you should have it."
      action={<Button render={<Link href="/dashboard" />} nativeButton={false} variant="outline">Go to dashboard</Button>}
    />
  );
}
