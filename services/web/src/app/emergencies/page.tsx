"use client";

import { FormEvent, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Card, Button } from "@/components/ui/core";
import { Activity, MoreHorizontal, Plus, Search } from "lucide-react";

import { createEmergency, EmergencyRequest, getEmergencyStatus, runMatch } from "@/lib/api";
import { cn } from "@/lib/utils";

const bloodTypes = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const organTypes = ["kidney", "liver", "heart", "lung", "pancreas"];
const urgencyLevels = ["critical", "urgent", "standard"];

function requestId(request: EmergencyRequest) {
  return request._id || request.id || "";
}

export default function EmergenciesPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [query, setQuery] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const filtered = requests.filter((request) => {
    const needle = query.toLowerCase();
    return !needle || request.patientId.toLowerCase().includes(needle) || requestId(request).toLowerCase().includes(needle);
  });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      const request = await createEmergency({
        patientId: String(formData.get("patientId")),
        bloodType: String(formData.get("bloodType")),
        organRequired: String(formData.get("organRequired")),
        hospitalId: String(formData.get("hospitalId")),
        urgency: String(formData.get("urgency")),
        lat: Number(formData.get("lat")),
        lng: Number(formData.get("lng")),
      });
      setRequests((current) => [request, ...current]);
      setLookupId(requestId(request));
      setMessage("Emergency request created.");
      setIsCreating(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Emergency request failed.");
    }
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const request = await getEmergencyStatus(lookupId);
      setRequests((current) => [request, ...current.filter((item) => requestId(item) !== requestId(request))]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Status lookup failed.");
    }
  }

  async function handleRunMatch(id: string) {
    setMessage(null);

    try {
      const result = await runMatch(id);
      setRequests((current) => current.map((request) => requestId(request) === id ? result.request : request));
      setMessage(`Matching complete. ${result.matches.length} compatible donors returned.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Matching failed.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emergencies</h1>
          <p className="text-zinc-500">Create requests, check request status, and trigger donor matching.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" /> New Request
        </Button>
      </div>

      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search in created or looked-up requests..."
            className="w-full rounded-2xl border border-border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <form className="flex gap-2" onSubmit={handleLookup}>
          <input
            type="text"
            value={lookupId}
            onChange={(event) => setLookupId(event.target.value.trim())}
            placeholder="Request ObjectId"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <Button type="submit" variant="outline">Lookup</Button>
        </form>
      </div>

      <div className="grid gap-4">
        {filtered.map((req) => {
          const id = requestId(req);
          return (
            <Card key={id || req.patientId} className="group transition-all hover:border-black">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "flex h-12 w-14 items-center justify-center rounded-2xl text-lg font-bold",
                    req.urgency === "critical" ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600"
                  )}>
                    {req.bloodType}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{req.patientId}</h3>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        req.urgency === "critical" ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {req.urgency}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">{req.organRequired || "Organ"} • {req.hospitalId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 lg:gap-8">
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-tighter text-zinc-400">Status</p>
                    <p className="text-sm font-semibold">{req.status || "pending"}</p>
                  </div>
                  <div className="hidden text-right font-mono text-xs text-zinc-400 md:block">
                    {id || "Pending id"}
                  </div>
                  <Button variant="ghost" className="h-8 gap-2 rounded-full px-3" onClick={() => void handleRunMatch(id)} disabled={!id}>
                    <Activity className="h-4 w-4" aria-hidden="true" /> Match
                  </Button>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-zinc-500">
            Create a request or look up an existing request id to populate this workspace.
          </p>
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl shadow-2xl">
            <h2 className="mb-6 text-xl font-bold">Create Emergency Request</h2>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Patient ID" name="patientId" placeholder="patient-001" />
                <Select label="Blood Type" name="bloodType" options={bloodTypes} />
                <Select label="Organ Type" name="organRequired" options={organTypes} />
                <Select label="Urgency" name="urgency" options={urgencyLevels} />
                <Field label="Hospital ID" name="hospitalId" placeholder="24-char ObjectId" />
                <Field label="Latitude" name="lat" type="number" step="any" defaultValue="19.076" />
                <Field label="Longitude" name="lng" type="number" step="any" defaultValue="72.8777" />
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

function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...inputProps } = props;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      <input className="w-full rounded-xl border border-border p-2 text-sm" required {...inputProps} />
    </div>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      <select name={name} className="w-full rounded-xl border border-border p-2 text-sm" required>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </div>
  );
}
