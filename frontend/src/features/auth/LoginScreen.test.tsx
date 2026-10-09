import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { Toaster } from "@/components/ui";
import { createQueryClient, queryKeys, type SampleLearner } from "@/lib/api";

import { LoginScreen } from "./LoginScreen";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const LEARNERS: SampleLearner[] = [
  {
    username: "parthbiyani",
    display_name: "Parth Biyani",
    avatar_color: "#1CB0F6",
    initials: "PB",
    xp_total: 1240,
    streak: 12,
    unit_number: 2,
    unit_title: "Everyday life",
    league_name: "Silver",
  },
  {
    username: "zoefernandes",
    display_name: "Zoe Fernandes",
    avatar_color: "#FF9600",
    initials: "ZF",
    xp_total: 0,
    streak: 0,
    unit_number: 1,
    unit_title: "Say hello",
    league_name: "Bronze",
  },
  {
    username: "kabirmalhotra",
    display_name: "Kabir Malhotra",
    avatar_color: "#FF4B4B",
    initials: "KM",
    xp_total: 4120,
    streak: 64,
    unit_number: 3,
    unit_title: "Out and about",
    league_name: "Gold",
  },
];

let fetchMock: MockInstance<typeof fetch>;

function renderScreen(): QueryClient {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  render(
    <QueryClientProvider client={client}>
      <LoginScreen />
      <Toaster />
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/learners")) return Response.json(LEARNERS);
    if (url.endsWith("/auth/login") && init?.method === "POST") {
      const { username } = JSON.parse(String(init.body)) as { username: string };
      return Response.json(LEARNERS.find((learner) => learner.username === username));
    }
    return Response.json({ code: "not_found" }, { status: 404 });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  replace.mockReset();
});

describe("LoginScreen", () => {
  it("shows a card per sample learner with a one-line summary", async () => {
    renderScreen();

    expect(screen.getByRole("heading", { level: 1, name: "Log in" })).toBeInTheDocument();
    const parth = await screen.findByRole("button", { name: /Parth Biyani/ });
    expect(parth).toHaveTextContent("PB");
    expect(parth).toHaveTextContent("Unit 2 · 1,240 XP · 12-day streak");
    expect(screen.getByRole("button", { name: /Zoe Fernandes/ })).toHaveTextContent(
      "Unit 1 · 0 XP · no streak",
    );
    expect(screen.getByRole("button", { name: /Kabir Malhotra/ })).toHaveTextContent(
      "Unit 3 · 4,120 XP · 64-day streak",
    );
  });

  it("logs in as the learner clicked, drops cached data and opens the path", async () => {
    const user = userEvent.setup();
    const client = renderScreen();
    client.setQueryData(queryKeys.me, { stale: true });

    await user.click(await screen.findByRole("button", { name: /^Log in as Kabir Malhotra/ }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/learn"));
    const login = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/auth/login"));
    expect(login?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ username: "kabirmalhotra" }),
    });
    expect(client.getQueryData(queryKeys.me)).toBeUndefined();
  });

  it("answers the email form and sign-up with Coming soon", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText("Email or username"), "parth@example.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Coming soon")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getAllByText("Coming soon")).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/auth/login"))).toBe(false);
  });
});
