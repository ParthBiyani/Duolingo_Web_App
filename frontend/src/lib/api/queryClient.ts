import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "./client";

export const STALE_TIME_MS = 30_000;
export const MAX_RETRIES = 2;

/**
 * Retries transient failures only: a 4xx answer (no_hearts, skill_locked, ...)
 * will not change on a second try.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && !error.isTransient) return false;
  return failureCount < MAX_RETRIES;
}

/** Network failures, 5xx answers and client bugs; 4xx answers are handled by features. */
export function isUnexpectedError(error: unknown): boolean {
  return !(error instanceof ApiError) || error.isTransient;
}

export interface QueryClientHandlers {
  /**
   * Called when a background refresh of data already on screen fails, or a
   * mutation fails unexpectedly. `retry` is set for queries.
   */
  onUnexpectedError?: (error: unknown, key: string, retry?: () => void) => void;
}

export function createQueryClient({ onUnexpectedError }: QueryClientHandlers = {}): QueryClient {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, retry: shouldRetry },
      mutations: { retry: false },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // First loads render their own skeleton or error state; only refreshes of data
        // already on screen are reported, so a down API does not stack up toasts.
        if (query.state.data === undefined || query.meta?.silent === true) return;
        if (!isUnexpectedError(error)) return;
        onUnexpectedError?.(error, `query:${query.queryHash}`, () => {
          void client.refetchQueries({ queryKey: query.queryKey, exact: true });
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (mutation.meta?.silent === true || !isUnexpectedError(error)) return;
        onUnexpectedError?.(error, `mutation:${mutation.mutationId}`);
      },
    }),
  });
  return client;
}
