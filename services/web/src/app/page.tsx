"use client";

import { Card } from "@/components/ui/core";
import { EmergencyRequest, getLowStockAlerts, getMetrics, getRecentEmergencies } from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  Users, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const metrics = useApi(getMetrics, [], { pollMs: 30000 });
  const alerts = useApi(() => getLowStockAlerts(5), [], { pollMs: 30000 });
  const recentEmergencies = useApi(() => getRecentEmergencies(5), [], { pollMs: 30000 });
  const byEvent = metrics.data?.byEvent || {};
  const lowStock = alerts.data || [];
  const recentRequests = recentEmergencies.data || [];
  const matched = byEvent["match.found"] || 0;
  const activeEmergencies = recentRequests.filter((request) => request.status !== "fulfilled" && request.status !== "cancelled").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-zinc-500">Real-time status of LifeLine operations, refreshed every 30 seconds.</p>
      </div>

      {(metrics.error || alerts.error || recentEmergencies.error) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {metrics.error || alerts.error || recentEmergencies.error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Active Emergencies" 
          value={recentEmergencies.isLoading ? "..." : String(activeEmergencies)}
          trend="Recent open requests"
          icon={Activity}
          color="text-red-600"
        />
        <StatCard 
          title="Matched Donors" 
          value={metrics.isLoading ? "..." : String(matched)}
          trend="Successful match events"
          icon={Users}
          color="text-blue-600"
        />
        <StatCard 
          title="Inventory Alerts" 
          value={alerts.isLoading ? "..." : String(lowStock.length)}
          trend="At or below low-stock threshold"
          icon={Package}
          color="text-amber-600"
        />
        <StatCard 
          title="System Health" 
          value={metrics.error ? "Degraded" : "Live"}
          trend={metrics.error ? "Gateway request failed" : `${metrics.data?.total || 0} events processed`}
          icon={CheckCircle2}
          color={metrics.error ? "text-amber-600" : "text-green-600"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Emergencies</h3>
            <Link href="/emergencies" className="text-sm font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentRequests.slice(0, 4).map((request) => (
              <EmergencyItem key={request._id || request.id || request.patientId} request={request} />
            ))}
            {!recentEmergencies.isLoading && recentRequests.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-zinc-500">
                No emergency requests have been recorded yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Inventory Alerts</h3>
            <Link href="/inventory" className="text-sm font-medium hover:underline flex items-center gap-1">
              Check stock <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-4">
            {lowStock.slice(0, 4).map((item) => (
              <AlertItem 
                key={`${item.hospitalId}-${item.bloodType}`}
                type={item.unitsAvailable === 0 ? "Out of Stock" : "Low Stock"}
                item={`${item.bloodType} Blood Units`}
                location={item.hospitalId}
                urgency={item.unitsAvailable === 0 ? "High" : "Medium"}
              />
            ))}
            {!alerts.isLoading && lowStock.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-zinc-500">
                No low-stock inventory alerts right now.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmergencyItem({ request }: { request: EmergencyRequest }) {
  const id = request._id || request.id || "Pending id";
  const isCritical = request.urgency === "critical";

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn(
          "flex h-9 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
          isCritical ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600"
        )}>
          {request.bloodType}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{request.patientId}</p>
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase",
              isCritical ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"
            )}>
              {request.urgency}
            </span>
          </div>
          <p className="truncate text-xs text-zinc-500">{request.organRequired || "Organ"} • {request.hospitalId}</p>
          <p className="mt-1 font-mono text-[10px] text-zinc-400">{id}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-medium uppercase text-zinc-400">Status</p>
        <p className="text-xs font-semibold">{request.status || "pending"}</p>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, icon: Icon, color }: {
  title: string;
  value: string;
  trend: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</span>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-[10px] text-zinc-400 font-medium">{trend}</p>
    </Card>
  );
}

function AlertItem({ type, item, location, urgency }: {
  type: string;
  item: string;
  location: string;
  urgency: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3">
      <AlertTriangle className={cn("mt-0.5 h-4 w-4", urgency === 'High' ? 'text-amber-500' : 'text-zinc-400')} />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{item}</p>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
            urgency === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600'
          )}>
            {type}
          </span>
        </div>
        <p className="text-xs text-zinc-500">{location}</p>
      </div>
    </div>
  );
}
