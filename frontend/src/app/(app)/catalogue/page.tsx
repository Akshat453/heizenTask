"use client";

import { useEffect, useState } from "react";
import { catalogueApi, type Dish } from "@/lib/api";

export default function CataloguePage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDishes() {
      try {
        const response = await catalogueApi.listDishes();
        setDishes(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dishes");
      } finally {
        setLoading(false);
      }
    }
    fetchDishes();
  }, []);

  if (loading) return <div className="p-8">Loading catalogue...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Catalogue (Dishes)</h1>
      
      {dishes.length === 0 ? (
        <p className="text-muted-foreground">No dishes found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">SKU</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Temp</th>
                <th className="px-6 py-3 font-medium">Base Cost</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dishes.map((d) => (
                <tr key={d.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 font-mono text-xs">{d.sku}</td>
                  <td className="px-6 py-4 font-medium">{d.name}</td>
                  <td className="px-6 py-4">{d.temperature}</td>
                  <td className="px-6 py-4">${(d.costCents / 100).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${d.isActive ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-800"}`}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
