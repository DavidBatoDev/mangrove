import type { NextConfig } from "next";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

// Fixtures only in mock builds (ADR-038): elsewhere the mock store resolves to a stub.
const MOCKS_MODULE = process.env.NEXT_PUBLIC_USE_MOCKS === "true" ? "./lib/mock-store.ts" : "./lib/mock-store.stub.ts";

const nextConfig: NextConfig = {
  turbopack: { resolveAlias: { "mangrove-mocks": MOCKS_MODULE } },
  // Local dev against the API: the browser calls /api/v1/..., Next proxies it. In production Caddy routes /api.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_INTERNAL_URL}/api/:path*` }];
  },
};

export default nextConfig;
