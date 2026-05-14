"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DependencyList } from "react";

type UseApiState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  options: { pollMs?: number; enabled?: boolean } = {}
): UseApiState<T> {
  const { pollMs, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const fetcherRef = useRef(fetcher);
  const depsKey = deps.map(String).join("\u001f");

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refetch = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    try {
      const nextData = await fetcherRef.current();
      setData(nextData);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refetch();

    if (!pollMs || !enabled) return undefined;
    const interval = window.setInterval(() => void refetch(), pollMs);
    return () => window.clearInterval(interval);
  }, [pollMs, enabled, refetch, depsKey]);

  return { data, error, isLoading, refetch };
}
