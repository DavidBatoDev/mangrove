"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { MapViewProps } from "@/components/MapView";
import { Loading } from "@/components/ui";
import { googleUsable } from "@/lib/google";

// Both map engines need the browser (WebGL), so neither renders on the server.
const MapLibreView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <Loading what="Loading map" /> });
const GoogleView = dynamic(() => import("@/components/GoogleMapView"), { ssr: false, loading: () => <Loading what="Loading map" /> });

export type MapEngine = "google" | "maplibre";

/**
 * Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set and the browser has WebGL; MapLibre otherwise,
 * and MapLibre again if Google fails to load or rejects the key. The demo never depends on Google.
 */
export default function Map({ onEngine, ...props }: MapViewProps & { onEngine?: (engine: MapEngine) => void }) {
  const [engine, setEngine] = useState<MapEngine>(() => (typeof window !== "undefined" && googleUsable() ? "google" : "maplibre"));

  useEffect(() => {
    onEngine?.(engine);
  }, [engine, onEngine]);

  if (engine === "google") return <GoogleView {...props} onFail={() => setEngine("maplibre")} />;
  return <MapLibreView {...props} />;
}
