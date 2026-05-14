import { Card, Button } from "@/components/ui/core";
import { ArrowRight, MapPin, Phone, Radar, Star } from "lucide-react";

import { cn } from "@/lib/utils";

const donors = [
  { name: "John Doe", blood: "O+", organ: "Kidney", distance: "4.2 km", score: 98, status: "Available" },
  { name: "Sarah Smith", blood: "O+", organ: "Liver", distance: "12.8 km", score: 92, status: "Available" },
  { name: "Mike Johnson", blood: "A-", organ: "Kidney", distance: "8.5 km", score: 85, status: "Busy" },
];

export default function MatchingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Donor Matching</h1>
        <p className="text-zinc-500">Find and connect with compatible donors in real-time.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Search Criteria</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Blood Type</label>
              <select className="w-full rounded-xl border border-border p-2 text-sm">
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Organ Type</label>
              <input type="text" placeholder="Kidney" className="w-full rounded-xl border border-border p-2 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Search Radius (km)</label>
            <input type="range" min="1" max="50" defaultValue="25" className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black" />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>1km</span>
              <span>25km</span>
              <span>50km</span>
            </div>
          </div>
          <Button className="w-full gap-2">
            <Radar className="h-4 w-4" aria-hidden="true" /> Run Matching Engine
          </Button>
        </Card>

        <Card className="md:w-80 bg-zinc-900 text-white">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">Quick Stats</h3>
          <div className="space-y-6">
            <div>
              <p className="text-xs text-zinc-400">Nearby O+ Donors</p>
              <p className="text-3xl font-bold">24</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Avg. Response Time</p>
              <p className="text-3xl font-bold">8.4m</p>
            </div>
            <div className="pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 italic font-serif">&quot;Matching engine uses geo-hashing for low latency discovery.&quot;</p>
            </div>

          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Top Recommendations</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {donors.map((donor, idx) => (
            <Card key={idx} className="group relative overflow-hidden transition-all hover:border-black">
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-600">
                  {donor.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span className="text-xs font-bold">{donor.score}</span>
                </div>
              </div>
              <div>
                <h4 className="font-bold">{donor.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded font-bold">{donor.blood}</span>
                  <span className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded font-bold uppercase">{donor.organ}</span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {donor.distance}
                </div>
                <div className={cn(
                  "flex items-center gap-1",
                  donor.status === 'Available' ? 'text-green-600' : 'text-zinc-400'
                )}>
                  <div className={cn("h-1.5 w-1.5 rounded-full", donor.status === 'Available' ? 'bg-green-500' : 'bg-zinc-400')} />
                  {donor.status}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" className="flex-1 h-8 text-xs p-0 gap-1"><Phone className="h-3.5 w-3.5" aria-hidden="true" /> Contact</Button>
                <Button className="flex-1 h-8 text-xs p-0 gap-1">Select <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
