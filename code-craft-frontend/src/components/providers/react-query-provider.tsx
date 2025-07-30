"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, ReactNode } from "react";

interface ReactQueryProviderProps {
  children: ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            networkMode: 'offlineFirst',
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
            networkMode: 'offlineFirst',
          },
        },
        queryCache: {
          onError: (error, query) => {
            // Log errors for monitoring
            console.error('Query error:', {
              queryKey: query.queryKey,
              error: error.message,
            });
          },
        },
        mutationCache: {
          onError: (error, variables, context, mutation) => {
            // Log mutation errors
            console.error('Mutation error:', {
              mutationKey: mutation.options.mutationKey,
              error: error.message,
            });
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
} 