import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Sidebar } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "LifeLine | Operations",
  description: "Critical Organ & Blood Logistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-zinc-50 font-sans`}
      >
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
