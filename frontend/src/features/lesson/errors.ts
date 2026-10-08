import { isApiError } from "@/lib/api";

import type { LessonError } from "./reducer";

/** Normalises anything thrown by the API client into the reducer's error shape. */
export function toLessonError(error: unknown): LessonError {
  if (isApiError(error)) {
    return { code: error.code, status: error.status, message: error.detail || error.title };
  }
  return {
    code: "unknown",
    status: 0,
    message: error instanceof Error ? error.message : String(error),
  };
}

/** Network failures and server errors are worth retrying; refusals (4xx) are not. */
export function isRetryable(error: LessonError): boolean {
  return error.status === 0 || error.status >= 500;
}
