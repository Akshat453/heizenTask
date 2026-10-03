"use client";

import { useEffect, useState } from "react";
import { menuApi, type MenuCategory } from "@/lib/api";

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await menuApi.listCategories();
        setCategories(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load menu categories");
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  if (loading) return <div className="p-8">Loading menu...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Menu Layout</h1>
      
      {categories.length === 0 ? (
        <p className="text-muted-foreground">No menu categories found.</p>
      ) : (
        <div className="space-y-4">
          {categories.map((c) => (
            <div key={c.id} className="p-6 rounded-lg border bg-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{c.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-stone-100 px-2 py-1 rounded">/{c.slug}</span>
                  {!c.isActive && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Hidden</span>}
                  {c.isSecret && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Secret</span>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {c._count?.items || 0} items in this category
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
