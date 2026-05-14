import { Card, Button } from "@/components/ui/core";
import { Megaphone, MessageSquare, Radio, Send } from "lucide-react";


export default function NotificationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-zinc-500">Communicate with donors and broadcast system alerts.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100">
              <MessageSquare className="h-5 w-5 text-zinc-700" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold">Direct SMS</h3>
              <p className="text-xs text-zinc-500">Send a priority message to a specific donor.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recipient Number</label>
              <input type="tel" placeholder="+91 11111 11111" className="w-full rounded-xl border border-border p-2.5 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Message Content</label>
              <textarea 
                rows={4} 
                placeholder="Type your message here..." 
                className="w-full rounded-xl border border-border p-2.5 text-sm resize-none"
              />
            </div>
            <Button className="w-full gap-2 py-6 text-lg">
              <Send className="h-5 w-5" aria-hidden="true" /> Send SMS
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100">
              <Megaphone className="h-5 w-5 text-zinc-700" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold">System Broadcast</h3>
              <p className="text-xs text-zinc-500">Notify all active operators and regional centers.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Scope</label>
              <div className="flex gap-2">
                {['All', 'Donors', 'Hospitals', 'Ops'].map(tag => (
                  <button key={tag} className="px-3 py-1 rounded-full border border-border text-xs font-medium hover:border-black transition-colors">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Broadcast Message</label>
              <textarea 
                rows={4} 
                placeholder="Enter system-wide announcement..." 
                className="w-full rounded-xl border border-border p-2.5 text-sm resize-none bg-zinc-50"
              />
            </div>
            <Button variant="outline" className="w-full gap-2 py-6 text-lg border-2">
              <Radio className="h-5 w-5" aria-hidden="true" /> Trigger Broadcast
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Recent History</h3>
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-border text-sm">
            {[
              { type: 'SMS', to: '+91...1111', msg: 'Compatible donor found for Case #001', time: '12 mins ago' },
              { type: 'Broadcast', to: 'Regional', msg: 'Maintenance window starting in 1 hour', time: '4 hours ago' },
              { type: 'SMS', to: '+91...4421', msg: 'Urgent: Inventory restock confirmed', time: '1 day ago' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-zinc-50">
                <div className="flex items-center gap-4">
                  <MessageSquare className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{item.type}</span>
                      <span className="text-xs text-zinc-400">to {item.to}</span>
                    </div>
                    <p className="text-zinc-500">{item.msg}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-zinc-400">{item.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
