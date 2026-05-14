import { Card, Button } from "@/components/ui/core";
import { ClipboardList, PackagePlus } from "lucide-react";

import { cn } from "@/lib/utils";

const inventory = [
  { hospital: "City Hospital", blood: "O+", units: 12, lastUpdated: "2 hours ago", status: "Healthy" },
  { hospital: "General Medical", blood: "A-", units: 2, lastUpdated: "5 mins ago", status: "Low" },
  { hospital: "Regional Center", blood: "B+", units: 24, lastUpdated: "1 day ago", status: "Healthy" },
  { hospital: "Children's Health", blood: "AB+", units: 0, lastUpdated: "12 hours ago", status: "Out of Stock" },
];


export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Control</h1>
          <p className="text-zinc-500">Monitor and manage critical supply levels.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <ClipboardList className="h-4 w-4" aria-hidden="true" /> Log
          </Button>
          <Button className="gap-2">
            <PackagePlus className="h-4 w-4" aria-hidden="true" /> Update Stock
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col gap-2 border-l-4 border-l-green-500">
          <span className="text-xs font-semibold uppercase text-zinc-500">Total Units</span>
          <div className="text-3xl font-bold">1,248</div>
          <p className="text-xs text-zinc-400">Across 14 facilities</p>
        </Card>
        <Card className="flex flex-col gap-2 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold uppercase text-zinc-500">Low Stock Alerts</span>
          <div className="text-3xl font-bold text-amber-600">3</div>
          <p className="text-xs text-zinc-400">Requires immediate attention</p>
        </Card>
        <Card className="flex flex-col gap-2 border-l-4 border-l-red-500">
          <span className="text-xs font-semibold uppercase text-zinc-500">Critical Outages</span>
          <div className="text-3xl font-bold text-red-600">1</div>
          <p className="text-xs text-zinc-400">AB+ at Children&apos;s Health</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-border text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Facility</th>
              <th className="px-6 py-4">Blood Type</th>
              <th className="px-6 py-4">Available Units</th>
              <th className="px-6 py-4">Last Updated</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {inventory.map((item, idx) => (
              <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 font-medium">{item.hospital}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 font-bold text-xs">
                    {item.blood}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono">{item.units} units</td>
                <td className="px-6 py-4 text-zinc-500">{item.lastUpdated}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                    item.status === 'Healthy' ? 'bg-green-100 text-green-700' : 
                    item.status === 'Low' ? 'bg-amber-100 text-amber-700' : 
                    'bg-red-100 text-red-700'
                  )}>
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      item.status === 'Healthy' ? 'bg-green-500' : 
                      item.status === 'Low' ? 'bg-amber-500' : 
                      'bg-red-500'
                    )} />
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" className="text-xs">Manage</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
