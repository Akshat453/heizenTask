"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EntityCombobox } from "@/components/app/entity-combobox";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { StickySaveBar } from "@/components/app/form-layout";
import { move, ReorderButtons } from "@/components/app/reorder-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { catalogueApi, menuApi, type MenuCategory } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { HidingPicker } from "./hiding-picker";
import { menuKeys } from "./queries";

type ItemDraft = { dishId: string; name: string; sku: string; dishActive: boolean; isActive: boolean; hiddenBy: string[] };

const toDraft = (c: MenuCategory): ItemDraft[] =>
  [...c.items].sort((a, b) => a.displayOrder - b.displayOrder).map((i) => ({ dishId: i.dishId, name: i.dish.name, sku: i.dish.sku, dishActive: i.dish.isActive, isActive: i.isActive, hiddenBy: i.hiddenByCompanyIds }));

type Props = { category: MenuCategory; canManage: boolean; canHide: boolean };

/** Settings and the ordered item list of one category; items are saved with one PUT. */
export function CategoryPanel({ category, canManage, canHide }: Props) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({ name: category.name, slug: category.slug, isSecret: category.isSecret });
  const [initialItems] = useState(() => toDraft(category));
  const [items, setItems] = useState(initialItems);
  const saved = (list: ItemDraft[]) => JSON.stringify(list.map(({ dishId, isActive }) => [dishId, isActive]));
  const itemsDirty = saved(items) !== saved(initialItems);
  const settingsDirty = settings.name !== category.name || settings.slug !== category.slug || settings.isSecret !== category.isSecret;
  useUnsavedChangesGuard(itemsDirty || settingsDirty);

  const onError = (error: Error) => toast.error(isApiError(error, 409) ? CONFLICT_MESSAGE : describeError(error));
  const saveSettings = useMutation({
    mutationFn: () => menuApi.updateCategory(category.id, settings),
    onSuccess: () => {
      toast.success("Category saved");
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
    },
  });
  const saveItems = useMutation({
    mutationFn: () => menuApi.replaceItems(category.id, items.map((item, i) => ({ dishId: item.dishId, displayOrder: i, isActive: item.isActive }))),
    onSuccess: () => {
      toast.success("Menu items saved");
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
    },
    onError,
  });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold">Category settings</h2>
        <fieldset disabled={!canManage} className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-slug">Link name (slug)</Label>
            <Input id="cat-slug" className="num" value={settings.slug} onChange={(e) => setSettings({ ...settings, slug: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch checked={settings.isSecret} onCheckedChange={(isSecret) => setSettings({ ...settings, isSecret })} /> Secret: not listed, reachable only by its link
          </label>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <HidingPicker kind="category" itemId={category.id} itemName={category.name} hiddenBy={category.hiddenByCompanyIds} canEdit={canHide} />
          {canManage && (
            <Button size="sm" disabled={!settingsDirty || saveSettings.isPending} onClick={() => saveSettings.mutate()}>
              {saveSettings.isPending ? "Saving…" : "Save settings"}
            </Button>
          )}
        </div>
        {saveSettings.error && <FormErrorAlert messages={isApiError(saveSettings.error) ? saveSettings.error.messages : [describeError(saveSettings.error)]} />}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-base font-semibold">Items</h2>
          <p className="text-sm text-muted-foreground">The order employees see. An inactive item stays listed here but is not offered.</p>
        </div>
        {items.length === 0 && <p className="text-sm text-muted-foreground">No dishes in this category yet.</p>}
        <ol className="flex flex-col gap-1">
          {items.map((item, i) => (
            <li key={item.dishId} className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
              <span className="num w-5 text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={item.isActive ? "font-medium" : "text-muted-foreground line-through"}>{item.name}</span>
                <span className="num ml-2 text-xs text-muted-foreground">{item.sku}</span>
                {!item.dishActive && <span className="ml-2 text-xs text-warning">dish inactive</span>}
              </span>
              <HidingPicker kind="dish" itemId={item.dishId} itemName={item.name} hiddenBy={item.hiddenBy} canEdit={canHide} />
              {canManage && (
                <>
                  <ReorderButtons label={item.name} index={i} count={items.length} onMove={(to) => setItems(move(items, i, to))} />
                  <Switch aria-label={`${item.name} active in this category`} checked={item.isActive} onCheckedChange={(isActive) => setItems(items.map((it) => (it.dishId === item.dishId ? { ...it, isActive } : it)))} />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${item.name}`} onClick={() => setItems(items.filter((it) => it.dishId !== item.dishId))}>
                    <X />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ol>
        {canManage && (
          <EntityCombobox
            className="max-w-sm"
            label="Dish"
            placeholder="Add a dish…"
            queryKey="dishes-picker"
            value={null}
            onChange={(picked) => {
              if (!picked || items.some((it) => it.dishId === picked.id)) return;
              const [name, sku] = picked.label.split(" · ");
              setItems([...items, { dishId: picked.id, name, sku: sku ?? "", dishActive: true, isActive: true, hiddenBy: [] }]);
            }}
            search={async (term) =>
              (await catalogueApi.listDishes({ search: term || undefined, pageSize: 10, isActive: true })).data.map((d) => ({ id: d.id, label: `${d.name} · ${d.sku}` }))
            }
          />
        )}
        {saveItems.error && <FormErrorAlert messages={isApiError(saveItems.error) ? saveItems.error.messages : [describeError(saveItems.error)]} />}
        {canManage && (
          <StickySaveBar visible={itemsDirty} message="Unsaved item changes" saving={saveItems.isPending} saveLabel="Save items" onSave={() => saveItems.mutate()} onDiscard={() => setItems(initialItems)} />
        )}
      </section>
    </div>
  );
}
