import { Card } from "@/components/ui/core";
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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-zinc-500">Real-time status of LifeLine operations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Active Emergencies" 
          value="12" 
          trend="+2 since last hour"
          icon={Activity}
          color="text-red-600"
        />
        <StatCard 
          title="Nearby Donors" 
          value="154" 
          trend="8 compatible matches"
          icon={Users}
          color="text-blue-600"
        />
        <StatCard 
          title="Inventory Levels" 
          value="82%" 
          trend="3 low stock alerts"
          icon={Package}
          color="text-amber-600"
        />
        <StatCard 
          title="System Health" 
          value="Stable" 
          trend="All services operational"
          icon={CheckCircle2}
          color="text-green-600"
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
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Case #00{i} - Patient {['Amar', 'Priya', 'Vikram'][i-1]}</p>
                    <p className="text-xs text-zinc-500">O+ Kidney • Critical • 12 mins ago</p>
                  </div>
                </div>
                <div className="text-xs font-mono text-zinc-400">6600...e00{i}</div>
              </div>
            ))}
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
            <AlertItem 
              type="Low Stock" 
              item="A+ Blood Units" 
              location="City Hospital" 
              urgency="High" 
            />
            <AlertItem 
              type="Expiring Soon" 
              item="Heart Valve" 
              location="Central Lab" 
              urgency="Medium" 
            />
            <AlertItem 
              type="Critical" 
              item="O- Plasma" 
              location="Regional Center" 
              urgency="High" 
            />
          </div>
        </Card>
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
