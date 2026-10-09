import { describe, expect, it, vi } from "vitest";

import { ApiError } from "./client";
import { createQueryClient } from "./queryClient";

const unauthenticated = new ApiError({
  status: 401,
  code: "not_authenticated",
  title: "Unauthorized",
  detail: "Log in to continue.",
});

describe("createQueryClient", () => {
  it("hands a lost session to onUnauthenticated, from queries and mutations", async () => {
    const onUnauthenticated = vi.fn();
    const onUnexpectedError = vi.fn();
    const client = createQueryClient({ onUnauthenticated, onUnexpectedError });

    await client
      .fetchQuery({ queryKey: ["me"], queryFn: () => Promise.reject(unauthenticated) })
      .catch(() => undefined);
    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(unauthenticated) })
      .execute(undefined)
      .catch(() => undefined);

    expect(onUnauthenticated).toHaveBeenCalledTimes(2);
    expect(onUnexpectedError).not.toHaveBeenCalled();
  });

  it("leaves other client errors to the features", async () => {
    const onUnauthenticated = vi.fn();
    const client = createQueryClient({ onUnauthenticated });
    const noHearts = new ApiError({ status: 409, code: "no_hearts", title: "", detail: "" });

    await client
      .fetchQuery({ queryKey: ["path"], queryFn: () => Promise.reject(noHearts) })
      .catch(() => undefined);

    expect(onUnauthenticated).not.toHaveBeenCalled();
  });
});
