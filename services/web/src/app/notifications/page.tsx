"use client";

import { FormEvent, useState } from "react";
import { Card, Button } from "@/components/ui/core";
import { Megaphone, MessageSquare, Radio, Search, Send } from "lucide-react";

import { getNotificationLogs, NotificationResult, sendNotification } from "@/lib/api";

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationResult[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const recipient = String(formData.get("recipientId"));

    try {
      const result = await sendNotification("sms", {
        to: String(formData.get("to")),
        recipientId: recipient,
        message: String(formData.get("message")),
      });
      setLogs((current) => [{ ...result, recipientId: recipient }, ...current]);
      setRecipientId(recipient);
      setMessage("SMS notification sent.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "SMS notification failed.");
    }
  }

  async function handleBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await sendNotification("broadcast", {
        message: `[${formData.get("scope")}] ${formData.get("message")}`,
      });
      setLogs((current) => [result, ...current]);
      setMessage("Broadcast sent.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Broadcast failed.");
    }
  }

  async function handleLogs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      setLogs(await getNotificationLogs(recipientId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load logs.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-zinc-500">Communicate with donors and broadcast system alerts.</p>
      </div>

      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100">
              <MessageSquare className="h-5 w-5 text-zinc-700" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold">Direct SMS</h3>
              <p className="text-xs text-zinc-500">Send a priority message to a specific recipient.</p>
            </div>
          </div>
          
          <form className="space-y-4" onSubmit={handleSms}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recipient ID</label>
                <input name="recipientId" placeholder="donor-001" className="w-full rounded-xl border border-border p-2.5 text-sm" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recipient Number</label>
                <input name="to" type="tel" placeholder="+91 11111 11111" className="w-full rounded-xl border border-border p-2.5 text-sm" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Message Content</label>
              <textarea 
                name="message"
                rows={4}
                placeholder="Type your message here..."
                className="w-full resize-none rounded-xl border border-border p-2.5 text-sm"
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2 py-6 text-lg">
              <Send className="h-5 w-5" aria-hidden="true" /> Send SMS
            </Button>
          </form>
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

          <form className="space-y-4" onSubmit={handleBroadcast}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Scope</label>
              <select name="scope" className="w-full rounded-xl border border-border p-2.5 text-sm">
                {["All", "Donors", "Hospitals", "Ops"].map((scope) => <option key={scope}>{scope}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Broadcast Message</label>
              <textarea
                name="message"
                rows={4}
                placeholder="Enter system-wide announcement..."
                className="w-full resize-none rounded-xl border border-border bg-zinc-50 p-2.5 text-sm"
                required
              />
            </div>
            <Button type="submit" variant="outline" className="w-full gap-2 border-2 py-6 text-lg">
              <Radio className="h-5 w-5" aria-hidden="true" /> Trigger Broadcast
            </Button>
          </form>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-bold">Recent History</h3>
          <form className="flex gap-2" onSubmit={handleLogs}>
            <input
              value={recipientId}
              onChange={(event) => setRecipientId(event.target.value)}
              placeholder="Recipient ID"
              className="min-w-0 rounded-2xl border border-border bg-white px-4 py-2 text-sm"
            />
            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" aria-hidden="true" /> Logs
            </Button>
          </form>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-border text-sm">
            {logs.map((item, index) => (
              <div key={item.id || index} className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50">
                <div className="flex items-center gap-4">
                  <MessageSquare className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{item.channel || "Notification"}</span>
                      <span className="text-xs text-zinc-400">to {item.to || item.recipientId || "broadcast"}</span>
                    </div>
                    <p className="text-zinc-500">{item.message || item.status || "Delivery logged"}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-zinc-400">{item.sentAt ? new Date(item.sentAt).toLocaleString() : item.status || "sent"}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="p-6 text-center text-sm text-zinc-500">
                Send a notification or load logs for a recipient to see history.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
