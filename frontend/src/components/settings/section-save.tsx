"use client";

import { Button } from "@/components/ui/button";

/** Per-section save row, shown only while that section has unsaved changes. */
export function SectionSave({ dirty, saving, invalid, onDiscard, onSave, saveLabel }: {
  dirty: boolean; saving: boolean; invalid?: boolean; onDiscard: () => void; onSave: () => void; saveLabel: string;
}) {
  if (!dirty) return null;
  return (
    <div role="region" aria-label="Unsaved changes" className="flex flex-wrap items-center justify-between gap-3 border-t border-l-4 border-l-saffron pt-3 pl-3">
      <p className="text-sm font-medium">Unsaved changes</p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDiscard} disabled={saving}>Discard</Button>
        <Button onClick={onSave} disabled={saving || invalid}>{saving ? "Saving…" : saveLabel}</Button>
      </div>
    </div>
  );
}
