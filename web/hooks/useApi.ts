"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api-error";

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/** Runs a data-module call on mount and whenever deps change. Loading = the latest request has not settled. */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[]): ApiState<T> {
  const [tick, setTick] = useState(0);
  const key = JSON.stringify([...deps, tick]);
  const [result, setResult] = useState<{ key: string; data: T | null; error: ApiError | null } | null>(null);

  useEffect(() => {
    let alive = true;
    fn().then(
      (data) => alive && setResult({ key, data, error: null }),
      (e) =>
        alive &&
        setResult({ key, data: null, error: e instanceof ApiError ? e : new ApiError(0, "ERROR", String(e?.message ?? e)) }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const settled = result?.key === key;
  return { data: settled ? result.data : null, error: settled ? result.error : null, loading: !settled, reload };
}
