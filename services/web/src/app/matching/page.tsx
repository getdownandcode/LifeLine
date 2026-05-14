"use client";

import { FormEvent, useState } from "react";
import { Card, Button } from "@/components/ui/core";
import { ArrowRight, MapPin, Phone, Radar, Star } from "lucide-react";

import { DonorMatch, findNearbyDonors } from "@/lib/api";
import { cn } from "@/lib/utils";

const bloodTypes = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const organTypes = ["kidney", "liver", "heart", "lung", "pancreas"];

export default function MatchingPage() {
  const [radius, setRadius] = useState(25);
  const [matches, setMatches] = useState<DonorMatch[]>([]);
  const [cached, setCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await findNearbyDonors({
        bloodType: String(formData.get("bloodType")),
        organRequired: String(formData.get("organRequired")),
        radius: radius * 1000,
        lat: Number(formData.get("lat")),
        lng: Number(formData.get("lng")),
        limit: 10,
      });
      setMatches(result.items);
      setCached(result.cached);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Matching search failed.");
    } finally {
      setIsLoading(false);
    }
  }

  const availableCount = matches.filter((match) => match.donor.availability !== false).length;
  const averageScore = matches.length
    ? Math.round(matches.reduce((sum, match) => sum + (match.compatibilityScore || 0), 0) / matches.length)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Donor Matching</h1>
        <p className="text-zinc-500">Find compatible donors near a request location.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="flex-1 space-y-4">
          <form className="space-y-4" onSubmit={handleSearch}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Search Criteria</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Blood Type</label>
                <select name="bloodType" className="w-full rounded-xl border border-border p-2 text-sm">
                  {bloodTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Organ Type</label>
                <select name="organRequired" className="w-full rounded-xl border border-border p-2 text-sm">
                  {organTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Latitude</label>
                <input name="lat" type="number" step="any" defaultValue="19.076" className="w-full rounded-xl border border-border p-2 text-sm" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Longitude</label>
                <input name="lng" type="number" step="any" defaultValue="72.8777" className="w-full rounded-xl border border-border p-2 text-sm" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Search Radius ({radius} km)</label>
              <input
                type="range"
                min="1"
                max="100"
                value={radius}
                onChange={(event) => setRadius(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-black"
              />
              <div className="flex justify-between font-mono text-[10px] text-zinc-400">
                <span>1km</span>
                <span>50km</span>
                <span>100km</span>
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              <Radar className="h-4 w-4" aria-hidden="true" /> {isLoading ? "Searching..." : "Run Matching Engine"}
            </Button>
          </form>
        </Card>

        <Card className="bg-zinc-900 text-white md:w-80">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Quick Stats</h3>
          <div className="space-y-6">
            <div>
              <p className="text-xs text-zinc-400">Matches Returned</p>
              <p className="text-3xl font-bold">{matches.length}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Available Donors</p>
              <p className="text-3xl font-bold">{availableCount}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Average Score</p>
              <p className="text-3xl font-bold">{averageScore}</p>
            </div>
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-xs text-zinc-500">{cached ? "Served from match cache." : "Fresh backend evaluation."}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Top Recommendations</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match, index) => {
            const donor = match.donor;
            const name = donor.name || `Donor ${donor._id?.slice(-6) || index + 1}`;
            const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

            return (
              <Card key={donor._id || index} className="group relative overflow-hidden transition-all hover:border-black">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 font-bold text-zinc-600">
                    {initials}
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span className="text-xs font-bold">{match.compatibilityScore || 0}</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold">{name}</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold">{donor.bloodType || "N/A"}</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase">{donor.organTypes?.join(", ") || "Organ"}</span>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {(match.distanceKm || 0).toFixed(1)} km
                  </div>
                  <div className={cn("flex items-center gap-1", donor.availability !== false ? "text-green-600" : "text-zinc-400")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", donor.availability !== false ? "bg-green-500" : "bg-zinc-400")} />
                    {donor.availability !== false ? "Available" : "Unavailable"}
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-border pt-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="outline" className="h-8 flex-1 gap-1 p-0 text-xs" disabled={!donor.contact?.phone}>
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" /> Contact
                  </Button>
                  <Button className="h-8 flex-1 gap-1 p-0 text-xs">
                    Select <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
        {!isLoading && matches.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-zinc-500">
            Run the matching engine to load compatible donors.
          </p>
        )}
      </div>
    </div>
  );
}
