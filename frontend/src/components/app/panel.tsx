import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  title: string;
  description?: ReactNode;
  /** Right side of the panel header (link or small button). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Removes body padding for edge-to-edge lists and tables. */
  flush?: boolean;
};

/** Bordered section card with a 16px semibold title. */
export function Panel({ title, description, action, children, className, flush }: PanelProps) {
  return (
    <section className={cn("flex flex-col rounded-lg border bg-card text-card-foreground", className)}>
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn("flex-1", !flush && "p-4")}>{children}</div>
    </section>
  );
}
