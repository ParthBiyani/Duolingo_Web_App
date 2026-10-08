import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, ApiError, isApiError } from "./client";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": contentType } });
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected the request to fail");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api requests", () => {
  it("GETs JSON from the /api/v1 base path", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ hearts: 5 }));

    await expect(api.get("/me")).resolves.toEqual({ hearts: 5 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/me");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(init?.headers).toEqual({ Accept: "application/json" });
  });

  it("sends JSON bodies", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ hearts: 5, gems: 150, next_heart_at: null }));

    await api.post("/hearts/refill", { context: "shop" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/hearts/refill");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ context: "shop" }));
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("passes the abort signal through", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const controller = new AbortController();

    await api.patch("/me/settings", { theme: "dark" }, { signal: controller.signal });

    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it("resolves 204 responses to undefined", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.post("/sessions/abc/abandon")).resolves.toBeUndefined();
  });
});

describe("error mapping", () => {
  it("maps problem+json bodies onto ApiError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          type: "about:blank",
          title: "Out of hearts",
          status: 409,
          detail: "You have no hearts left. Refill or practice to earn more.",
          code: "no_hearts",
        },
        409,
        "application/problem+json",
      ),
    );

    const error = await captureError(api.post("/sessions", { id: "x", kind: "lesson" }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "no_hearts",
      title: "Out of hearts",
      detail: "You have no hearts left. Refill or practice to earn more.",
      message: "You have no hearts left. Refill or practice to earn more.",
    });
    expect(isApiError(error, "no_hearts")).toBe(true);
    expect(isApiError(error, "insufficient_gems")).toBe(false);
    expect((error as ApiError).isTransient).toBe(false);
  });

  it("joins FastAPI validation messages", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          detail: [
            {
              loc: ["body", "answer", "text"],
              msg: "String should have at most 200 characters",
              type: "string_too_long",
            },
            { loc: ["body", "exercise_id"], msg: "Field required", type: "missing" },
          ],
        },
        422,
      ),
    );

    const error = await captureError(api.post("/sessions/x/answers", {}));

    expect(error).toMatchObject({
      status: 422,
      code: "validation_error",
      detail: "String should have at most 200 characters Field required",
    });
  });

  it("falls back to the status line when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }),
    );

    const error = await captureError(api.get("/me"));

    expect(error).toMatchObject({ status: 502, code: "http_error", title: "Bad Gateway" });
    expect((error as ApiError).isTransient).toBe(true);
  });

  it("fills missing problem fields from the response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Not Found" }, 404));

    const error = await captureError(api.get("/demo/clock"));

    expect(error).toMatchObject({ status: 404, code: "http_error", detail: "Not Found" });
  });

  it("reports network failures with status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await captureError(api.get("/me"));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: "network_error", detail: "Failed to fetch" });
    expect((error as ApiError).isTransient).toBe(true);
  });

  it("lets cancellations through untouched", async () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    fetchMock.mockRejectedValue(abort);

    const error = await captureError(api.get("/me"));

    expect(error).toBe(abort);
    expect(isApiError(error)).toBe(false);
  });
});
