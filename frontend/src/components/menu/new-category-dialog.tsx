"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { menuApi, type MenuCategory } from "@/lib/api";
import { describeError } from "@/lib/api-client";
import { menuKeys } from "./queries";

export const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function NewCategoryDialog({ open, onOpenChange, nextOrder, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; nextOrder: number; onCreated: (c: MenuCategory) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [isSecret, setIsSecret] = useState(false);
  const create = useMutation({
    mutationFn: () => menuApi.createCategory({ name: name.trim(), slug: slug ?? slugify(name), displayOrder: nextOrder, isSecret }),
    onSuccess: (category) => {
      toast.success("Category created");
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      onCreated(category);
      setName("");
      setSlug(null);
      setIsSecret(false);
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="shadow-soft sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>It appears at the end of the menu; reorder it afterwards.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Label htmlFor="c-name">Name</Label>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rice bowls" />
          <Label htmlFor="c-slug">Link name (slug)</Label>
          <Input id="c-slug" className="num" value={slug ?? slugify(name)} onChange={(e) => setSlug(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isSecret} onCheckedChange={setIsSecret} /> Secret: not listed, reachable only by its link
          </label>
          {create.error && <FormErrorAlert messages={[describeError(create.error)]} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Creating…" : "Create category"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
