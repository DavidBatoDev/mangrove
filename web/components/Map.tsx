"use client";

import dynamic from "next/dynamic";
import { Loading } from "@/components/ui";

// MapLibre needs the browser (WebGL), so it never renders on the server.
const Map = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <Loading what="Loading map" /> });

export default Map;
