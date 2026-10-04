"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Left-hand section index for long form pages (desktop only). */
export function SectionIndex({ sections }: { sections: { id: string; label: string }[] }) {
  return (
    <nav aria-label="Sections" className="sticky top-20 hidden w-44 shrink-0 flex-col gap-1 self-start lg:flex">
      {sections.map((s) => (
        <a key={s.id} href={`#${s.id}`} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          {s.label}
        </a>
      ))}
    </nav>
  );
}

/** A titled form section card with an anchor id. */
export function FormSection({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-lg border bg-card p-4 md:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

type SaveBarProps = {
  visible: boolean;
  message: string;
  saving: boolean;
  onDiscard: () => void;
  onSave?: () => void;
  saveLabel?: string;
  /** Form id when the bar submits a <form>. */
  form?: string;
};

/** Sticky bottom bar shown while there are unsaved changes (saffron edge marks "unsaved"). */
export function StickySaveBar({ visible, message, saving, onDiscard, onSave, saveLabel = "Save changes", form }: SaveBarProps) {
  if (!visible) return null;
  return (
    <div role="region" aria-label="Unsaved changes" className="sticky bottom-0 z-20 -mx-4 mt-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <div className={cn("flex items-center justify-between gap-3 border-l-4 border-saffron pl-3")}>
        <p className="text-sm font-medium">{message}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDiscard} disabled={saving}>
            Discard
          </Button>
          <Button type={form ? "submit" : "button"} form={form} onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
