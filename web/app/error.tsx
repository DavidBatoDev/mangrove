"use client";

import { ErrorBox } from "@/components/ui";

export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorBox error={error} onRetry={retry} />;
}
