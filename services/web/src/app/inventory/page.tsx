"use client";

import { FormEvent, useState } from "react";
import { Card, Button } from "@/components/ui/core";
import { ClipboardList, PackagePlus, RefreshCw } from "lucide-react";

import { getHospitalStock, getLowStockAlerts, updateHospitalStock } from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";
import { cn } from "@/lib/utils";

const bloodTypes = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

function statusForUnits(units: number) {
  if (units === 0) return "Out of Stock";
  if (units <= 5) return "Low";
  return "Healthy";
}

export default function InventoryPage() {
  const [hospitalId, setHospitalId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const stock = useApi(() => getHospitalStock(hospitalId), [hospitalId], {
    enabled: hospitalId.length === 24,
    pollMs: 30000,
  });
  const alerts = useApi(() => getLowStockAlerts(5), [], { pollMs: 30000 });
  const inventory = stock.data || [];
  const lowStock = alerts.data || [];
  const totalUnits = inventory.reduce((sum, item) => sum + item.unitsAvailable, 0);
  const outageCount = inventory.filter((item) => item.unitsAvailable === 0).length;

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const nextHospitalId = String(formData.get("hospitalId"));

    try {
      await updateHospitalStock(nextHospitalId, {
        bloodType: String(formData.get("bloodType")),
        unitsChange: Number(formData.get("unitsChange")),
        lat: Number(formData.get("lat")),
        lng: Number(formData.get("lng")),
      });
      setHospitalId(nextHospitalId);
      setMessage("Stock updated successfully.");
      await alerts.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Stock update failed.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Control</h1>
          <p className="text-zinc-500">Monitor and manage hospital-specific supply levels.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => void alerts.refetch()}>
            <ClipboardList className="h-4 w-4" aria-hidden="true" /> Refresh Alerts
          </Button>
          <Button className="gap-2" onClick={() => void stock.refetch()} disabled={hospitalId.length !== 24}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh Stock
          </Button>
        </div>
      </div>

      {(stock.error || alerts.error || message) && (
        <div className={cn(
          "rounded-xl border px-4 py-3 text-sm",
          message === "Stock updated successfully."
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        )}>
          {message || stock.error || alerts.error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col gap-2 border-l-4 border-l-green-500">
          <span className="text-xs font-semibold uppercase text-zinc-500">Visible Units</span>
          <div className="text-3xl font-bold">{stock.isLoading ? "..." : totalUnits}</div>
          <p className="text-xs text-zinc-400">For the selected hospital</p>
        </Card>
        <Card className="flex flex-col gap-2 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold uppercase text-zinc-500">Low Stock Alerts</span>
          <div className="text-3xl font-bold text-amber-600">{alerts.isLoading ? "..." : lowStock.length}</div>
          <p className="text-xs text-zinc-400">Across backend inventory records</p>
        </Card>
        <Card className="flex flex-col gap-2 border-l-4 border-l-red-500">
          <span className="text-xs font-semibold uppercase text-zinc-500">Visible Outages</span>
          <div className="text-3xl font-bold text-red-600">{stock.isLoading ? "..." : outageCount}</div>
          <p className="text-xs text-zinc-400">For the selected hospital</p>
        </Card>
      </div>

      <Card>
        <form className="grid gap-4 lg:grid-cols-6" onSubmit={handleUpdate}>
          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Hospital ID</label>
            <input
              name="hospitalId"
              value={hospitalId}
              onChange={(event) => setHospitalId(event.target.value.trim())}
              placeholder="24-char ObjectId"
              className="w-full rounded-xl border border-border p-2 text-sm"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Blood Type</label>
            <select name="bloodType" className="w-full rounded-xl border border-border p-2 text-sm">
              {bloodTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Units Change</label>
            <input name="unitsChange" type="number" defaultValue="1" className="w-full rounded-xl border border-border p-2 text-sm" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Latitude</label>
            <input name="lat" type="number" step="any" defaultValue="19.076" className="w-full rounded-xl border border-border p-2 text-sm" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Longitude</label>
            <input name="lng" type="number" step="any" defaultValue="72.8777" className="w-full rounded-xl border border-border p-2 text-sm" required />
          </div>
          <div className="lg:col-span-6">
            <Button type="submit" className="gap-2">
              <PackagePlus className="h-4 w-4" aria-hidden="true" /> Update Stock
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-6 py-4">Hospital ID</th>
              <th className="px-6 py-4">Blood Type</th>
              <th className="px-6 py-4">Available Units</th>
              <th className="px-6 py-4">Last Updated</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {inventory.map((item) => {
              const status = statusForUnits(item.unitsAvailable);
              return (
                <tr key={`${item.hospitalId}-${item.bloodType}`} className="transition-colors hover:bg-zinc-50">
                  <td className="px-6 py-4 font-mono text-xs">{item.hospitalId}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex h-7 w-9 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold">
                      {item.bloodType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono">{item.unitsAvailable} units</td>
                  <td className="px-6 py-4 text-zinc-500">{item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : "Unknown"}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                      status === "Healthy" ? "bg-green-100 text-green-700" :
                      status === "Low" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        status === "Healthy" ? "bg-green-500" :
                        status === "Low" ? "bg-amber-500" :
                        "bg-red-500"
                      )} />
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!stock.isLoading && inventory.length === 0 && (
              <tr>
                <td className="px-6 py-8 text-center text-zinc-500" colSpan={5}>
                  Enter a 24-character hospital id to load stock, or submit an update to create stock.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
