"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui/core";
import { Filter, MoreHorizontal, Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";

const emergencies = [
  { id: "6600...e001", patient: "Amar", blood: "O+", organ: "Kidney", hospital: "City Hospital", urgency: "Critical", status: "Matching" },
  { id: "6600...e002", patient: "Priya", blood: "A-", organ: "Heart", hospital: "General Medical", urgency: "High", status: "Saga Started" },
  { id: "6600...e003", patient: "Vikram", blood: "B+", organ: "Liver", hospital: "Regional Center", urgency: "Standard", status: "Notification Sent" },
];

export default function EmergenciesPage() {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emergencies</h1>
          <p className="text-zinc-500">Manage and track active emergency requests.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" /> New Request
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input 
            type="text" 
            placeholder="Search by patient name or ID..." 
            className="w-full rounded-2xl border border-border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" aria-hidden="true" /> Filter
        </Button>
      </div>

      <div className="grid gap-4">
        {emergencies.map((req) => (
          <Card key={req.id} className="group transition-all hover:border-black">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold",
                  req.urgency === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-600'
                )}>
                  {req.blood}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{req.patient}</h3>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                      req.urgency === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'
                    )}>
                      {req.urgency}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">{req.organ} • {req.hospital}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-tighter">Status</p>
                  <p className="text-sm font-semibold">{req.status}</p>
                </div>
                <div className="text-right font-mono text-xs text-zinc-400 hidden md:block">
                  {req.id}
                </div>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-6">Create Emergency Request</h2>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsCreating(false); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Patient Name</label>
                  <input type="text" className="w-full rounded-xl border border-border p-2 text-sm" placeholder="Full Name" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Blood Type</label>
                  <select className="w-full rounded-xl border border-border p-2 text-sm" required>
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Organ Type</label>
                <input type="text" className="w-full rounded-xl border border-border p-2 text-sm" placeholder="e.g. Kidney, Heart" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Hospital ID</label>
                <input type="text" className="w-full rounded-xl border border-border p-2 text-sm" placeholder="24-char ObjectId" required />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">Create Request</Button>
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
