"use client";

import Link from "next/link";
import { Button } from "@/components/ui/core";

export default function NotFound() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
      <h2 className="text-3xl font-bold">404 - Not Found</h2>
      <p className="text-zinc-500">Could not find requested resource</p>
      <Link href="/">
        <Button>Return Home</Button>
      </Link>
    </div>
  );
}
