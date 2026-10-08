"use client";

import { useEffect, useMemo, useState } from "react";

type StockistRow = {
  stockistId: string;
  stockistName: string;
  location: string;
  productId: string;
  productName: string;
  molecule: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  status: string;
  updatedAt: string;
};

type StockistResponse = {
  summary: {
    totalStockists: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  stockists: StockistRow[];
};

function statusClasses(status: string) {
  if (status === "GOOD") return "bg-emerald-100 text-emerald-800";
  if (status === "AVERAGE") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function StockistPanel() {
  const [data, setData] = useState<StockistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const productName = useMemo(
    () => data?.stockists[0]?.productName || "Product",
    [data]
  );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/stockists?molecule=" + encodeURIComponent("Aceclofenac + Paracetamol"),
        { cache: "no-store" }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load stockist data.");
      }

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load stockist data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Stockist Data</h2>
          <p className="text-sm text-slate-500">
            Live inventory from the MR 3.0 database
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50"
        >
          ↻ Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading stockist inventory…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ["Total Stockists", data?.summary.totalStockists ?? 0],
              ["In Stock", data?.summary.inStock ?? 0],
              ["Low Stock", data?.summary.lowStock ?? 0],
              ["Out of Stock", data?.summary.outOfStock ?? 0]
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  {label}
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="font-bold">
                {productName} · Aceclofenac + Paracetamol Availability
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Inventory quantities and status are read from stockist_inventory.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="p-3 text-left">Stockist</th>
                    <th className="p-3 text-left">Location</th>
                    <th className="p-3 text-left">Quantity</th>
                    <th className="p-3 text-left">Updated</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.stockists.map(row => (
                    <tr key={row.stockistId + row.productId} className="border-t border-slate-100">
                      <td className="p-3 font-bold">{row.stockistName}</td>
                      <td className="p-3">{row.location}</td>
                      <td className="p-3 font-mono">
                        {row.quantity} {row.unit}
                      </td>
                      <td className="p-3 text-slate-500">{relativeTime(row.updatedAt)}</td>
                      <td className="p-3">
                        <span className={statusClasses(row.status) + " text-xs font-bold px-2.5 py-1 rounded-full"}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
