"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Emergencies", href: "/emergencies" },
  { name: "Inventory", href: "/inventory" },
  { name: "Matching", href: "/matching" },
  { name: "Notifications", href: "/notifications" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-white px-4 py-8">
      <div className="mb-10 flex items-center gap-2 px-2">
        <span className="text-xl font-bold tracking-tight">LifeLine</span>
      </div>
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all",
                isActive 
                  ? "bg-black text-white" 
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-black"
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-zinc-200" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Operator</span>
            <span className="text-[10px] text-zinc-500">ID: 6600...0101</span>
          </div>
        </div>
      </div>
    </div>
  );
}

