/**
 * Thin JSON client for the FastAPI backend. Requests go to the same origin
 * under /api/v1; Next.js rewrites them to the API server, so there is no CORS.
 * Every non-2xx response becomes an ApiError carrying the problem+json fields.
 */

export const API_BASE = "/api/v1";

/** Codes produced by the client itself rather than by the server. */
export const CLIENT_ERROR_CODES = {
  network: "network_error",
  validation: "validation_error",
  http: "http_error",
} as const;

export class ApiError extends Error {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;
  /** Machine-readable code, e.g. "no_hearts" or "insufficient_gems". */
  readonly code: string;
  /** Short, human-readable summary of the problem type. */
  readonly title: string;
  /** Human-readable explanation of this occurrence. */
  readonly detail: string;

  constructor({
    status,
    code,
    title,
    detail,
  }: {
    status: number;
    code: string;
    title: string;
    detail: string;
  }) {
    super(detail || title);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.title = title;
    this.detail = detail;
  }

  /** True when the server never answered or failed on its side (worth a retry). */
  get isTransient(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

export interface RequestOptions {
  signal?: AbortSignal;
}

type Method = "GET" | "POST" | "PATCH";

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers:
        body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
      cache: "no-store",
    });
  } catch (error) {
    // Cancellation is not a failure: let TanStack Query see the AbortError.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({
      status: 0,
      code: CLIENT_ERROR_CODES.network,
      title: "Network error",
      detail: error instanceof Error ? error.message : "The request could not be sent.",
    });
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Maps an error response to ApiError, tolerating bodies that are not problem+json. */
export async function toApiError(response: Response): Promise<ApiError> {
  const fallback = {
    status: response.status,
    code: CLIENT_ERROR_CODES.http,
    title: response.statusText || `HTTP ${response.status}`,
    detail: response.statusText || `Request failed with status ${response.status}.`,
  };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new ApiError(fallback);
  }
  if (typeof body !== "object" || body === null) return new ApiError(fallback);

  const problem = body as Record<string, unknown>;
  const text = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : undefined;

  // FastAPI's default validation body: { detail: [{ loc, msg, type }, ...] }.
  if (Array.isArray(problem.detail)) {
    const messages = problem.detail
      .map((item) =>
        typeof item === "object" && item !== null
          ? text((item as { msg?: unknown }).msg)
          : undefined,
      )
      .filter((message): message is string => message !== undefined);
    return new ApiError({
      ...fallback,
      code: text(problem.code) ?? CLIENT_ERROR_CODES.validation,
      title: text(problem.title) ?? "Validation error",
      detail: messages.join(" ") || fallback.detail,
    });
  }

  return new ApiError({
    status: typeof problem.status === "number" ? problem.status : response.status,
    code: text(problem.code) ?? fallback.code,
    title: text(problem.title) ?? fallback.title,
    detail: text(problem.detail) ?? text(problem.title) ?? fallback.detail,
  });
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
};
