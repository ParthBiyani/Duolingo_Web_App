import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError, isApiError } from "./client";

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
  /** Called when any request answers 401 `not_authenticated`: the session is gone. */
  onUnauthenticated?: () => void;
}

/** The API's answer to a request without a valid session cookie. */
export function isUnauthenticated(error: unknown): boolean {
  return isApiError(error, "not_authenticated");
}

export function createQueryClient({
  onUnexpectedError,
  onUnauthenticated,
}: QueryClientHandlers = {}): QueryClient {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, retry: shouldRetry },
      mutations: { retry: false },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isUnauthenticated(error)) {
          onUnauthenticated?.();
          return;
        }
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
        if (isUnauthenticated(error)) {
          onUnauthenticated?.();
          return;
        }
        if (mutation.meta?.silent === true || !isUnexpectedError(error)) return;
        onUnexpectedError?.(error, `mutation:${mutation.mutationId}`);
      },
    }),
  });
  return client;
}
