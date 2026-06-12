/**
 * React Query client provider — Phase 3: Vocabulary + SRS
 *
 * Wraps the (dashboard) layout so all client components can use useQuery / useMutation.
 * Must be a Client Component to hold QueryClient in state (prevents server re-initialisation).
 *
 * Source: .planning/phases/03-vocabulary-module-srs-core/03-PATTERNS.md — query-provider.tsx section
 * RESEARCH Pattern 6: React Query setup (Wave 0 gap)
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Lazy init ensures a new QueryClient is created per browser session, not shared across SSR renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30 seconds — vocabulary data changes infrequently
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
