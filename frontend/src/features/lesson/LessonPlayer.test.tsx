import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AnswerResult, MeResponse, SessionResponse } from "@/lib/api";

import { LessonPlayer } from "./LessonPlayer";
import { lessonStrings } from "./strings";
import { makeCompletion, makeExercise, makeResult, makeSession } from "./test-fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("canvas-confetti", () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }));

const ME: MeResponse = {
  user: {
    id: 1,
    username: "parthbiyani",
    display_name: "Parth Biyani",
    avatar_color: "#1CB0F6",
    timezone: "Asia/Kolkata",
    joined_at: "2026-08-20T00:00:00Z",
  },
  course: { id: 1, title: "Spanish", learning_language: "es", from_language: "en" },
  stats: {
    xp_total: 1240,
    today_xp: 0,
    daily_goal_xp: 20,
    gems: 500,
    hearts: 5,
    hearts_max: 5,
    next_heart_at: null,
    streak: { current: 12, longest: 21, extended_today: false, freezes: 1, week: [] },
    league: { tier: 1, name: "Silver", unlocked: true },
  },
  settings: {
    sound_effects: false,
    animations: false,
    motivational_messages: true,
    listening_exercises: false,
    theme: "light",
    daily_goal_xp: 20,
  },
  server_now: "2026-10-09T05:00:00Z",
};

type Handler = (body: unknown) => { status?: number; body?: unknown };

interface Call {
  method: string;
  path: string;
  body: unknown;
}

let calls: Call[];
let routes: Record<string, Handler>;

function json(status: number, body?: unknown): Response {
  if (status === 204 || body === undefined) return new Response(null, { status });
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Routes "METHOD /path" (session ids normalised to :id) to a handler. */
function installFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const method = init?.method ?? "GET";
      const path = url.pathname
        .replace(/^\/api\/v1/, "")
        .replace(/\/sessions\/[^/]+/, "/sessions/:id");
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ method, path, body });
      const handler = routes[`${method} ${path}`];
      if (!handler)
        return json(404, { code: "not_found", title: "Not found", status: 404, detail: path });
      const { status = 200, body: response } = handler(body);
      return json(status, response);
    }),
  );
}

function renderPlayer(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const answersTo = (path: string) =>
  calls.filter((call) => call.method === "POST" && call.path === path);

const twoQuestionLesson = (): SessionResponse =>
  makeSession([makeExercise(1), { ...makeExercise(2), source_text: "el perro" }]);

beforeEach(() => {
  calls = [];
  push.mockReset();
  vi.spyOn(Math, "random").mockReturnValue(0);
  routes = {
    "GET /me": () => ({ body: ME }),
    "POST /sessions": () => ({ status: 201, body: twoQuestionLesson() }),
    "POST /sessions/:id/complete": () => ({ body: makeCompletion() }),
    "POST /sessions/:id/abandon": () => ({ status: 204 }),
  };
  installFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LessonPlayer", () => {
  it("plays a lesson end to end: miss, review, re-ask, complete and celebrate", async () => {
    const user = userEvent.setup();
    const results: AnswerResult[] = [
      makeResult(), // exercise 1 right
      makeResult({ outcome: "incorrect", correct: false, hearts: 4, exercise_done: false }),
      makeResult(), // exercise 2 re-asked and right
    ];
    routes["POST /sessions/:id/answers"] = () => ({ body: results.shift() });

    renderPlayer(<LessonPlayer kind="lesson" lessonId={21} />);

    // Start: one POST /sessions with a client UUID, the lesson id and kind.
    expect(
      await screen.findByRole("heading", { name: "Select the correct meaning" }),
    ).toBeVisible();
    const [start] = answersTo("/sessions");
    expect(start.body).toMatchObject({ kind: "lesson", lesson_id: 21 });
    expect((start.body as { id: string }).id).toMatch(/^[0-9a-f-]{36}$/);

    // CHECK stays disabled until something is chosen.
    const checkButton = screen.getByRole("button", { name: "Check" });
    expect(checkButton).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /the cat/ }));
    expect(checkButton).toBeEnabled();
    await user.click(checkButton);

    expect(await screen.findByText(lessonStrings.praise[0])).toBeVisible();
    const firstAnswer = answersTo("/sessions/:id/answers")[0].body as Record<string, unknown>;
    expect(firstAnswer).toMatchObject({ exercise_id: 1, answer: { option_id: 11 } });

    // Enter continues; number keys pick options; Enter checks.
    await user.keyboard("{Enter}");
    expect(await screen.findByText("el perro")).toBeVisible();
    await user.keyboard("2");
    await user.keyboard("{Enter}");

    expect(await screen.findByText(lessonStrings.correctSolution)).toBeVisible();
    expect(screen.getByText(lessonStrings.heartsLabel(4))).toBeInTheDocument();
    const answerIds = answersTo("/sessions/:id/answers").map(
      (call) => (call.body as { answer_id: string }).answer_id,
    );
    expect(new Set(answerIds).size).toBe(2);

    // The missed exercise comes back after the review interstitial, flagged as a mistake.
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(lessonStrings.review[0])).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(lessonStrings.previousMistake)).toBeVisible();

    await user.keyboard("1");
    await user.click(screen.getByRole("button", { name: "Check" }));
    await screen.findByText(lessonStrings.praise[0]);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Queue empty: complete, then the celebration, then back to the path.
    expect(await screen.findByText(lessonStrings.completeTitle.lesson)).toBeVisible();
    expect(answersTo("/sessions/:id/complete")).toHaveLength(1);
    expect(screen.getByText(lessonStrings.totalXp)).toBeVisible();
    // The path pops the level just played (skill 7).
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/learn?done=7"));
    expect(answersTo("/sessions/:id/abandon")).toHaveLength(0);
  });

  it("asks before quitting and abandons the session on END SESSION", async () => {
    const user = userEvent.setup();
    renderPlayer(<LessonPlayer kind="lesson" lessonId={21} />);
    await screen.findByRole("heading", { name: "Select the correct meaning" });

    await user.keyboard("{Escape}");
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByText(lessonStrings.quitTitle)).toBeVisible();

    await user.click(screen.getByRole("button", { name: lessonStrings.keepLearning }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: lessonStrings.quitLabel }));
    await user.click(await screen.findByRole("button", { name: lessonStrings.endSession }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/learn"));
    expect(answersTo("/sessions/:id/abandon")).toHaveLength(1);
  });

  it("opens the out-of-hearts dialog when the start is refused, and refills to start", async () => {
    const user = userEvent.setup();
    let refused = true;
    routes["POST /sessions"] = () =>
      refused
        ? {
            status: 409,
            body: { code: "no_hearts", title: "No hearts", status: 409, detail: "No hearts" },
          }
        : { status: 201, body: twoQuestionLesson() };
    routes["POST /hearts/refill"] = () => {
      refused = false;
      return { body: { hearts: 5, gems: 50, next_heart_at: null } };
    };

    renderPlayer(<LessonPlayer kind="lesson" lessonId={21} />);
    expect(await screen.findByText(lessonStrings.outOfHeartsTitle)).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: new RegExp(lessonStrings.refillHearts, "i") }),
    );
    expect(
      await screen.findByRole("heading", { name: "Select the correct meaning" }),
    ).toBeVisible();
    expect(answersTo("/hearts/refill")[0].body).toEqual({ context: "lesson" });
    // The same session id is reused for the retried start.
    const ids = answersTo("/sessions").map((call) => (call.body as { id: string }).id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });

  it("shows an error with retry when the session cannot start", async () => {
    const user = userEvent.setup();
    let failures = 1;
    routes["POST /sessions"] = () =>
      failures-- > 0
        ? {
            status: 500,
            body: { code: "server_error", title: "Oops", status: 500, detail: "Oops" },
          }
        : { status: 201, body: twoQuestionLesson() };

    renderPlayer(<LessonPlayer kind="practice" />);
    expect(await screen.findByText(lessonStrings.loadErrorTitle)).toBeVisible();
    expect(answersTo("/sessions")[0].body).toMatchObject({ kind: "practice" });

    await user.click(screen.getByRole("button", { name: lessonStrings.retry }));
    expect(
      await screen.findByRole("heading", { name: "Select the correct meaning" }),
    ).toBeVisible();
  });

  it("counts down in timed practice and completes when time runs out", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      routes["POST /sessions"] = () => ({
        status: 201,
        body: makeSession([makeExercise(1), makeExercise(2)], {
          kind: "timed",
          rules: {
            hearts_enabled: false,
            mistakes_allowed: null,
            timer_seconds: 30,
            timer_bonus_seconds: 7,
          },
        }),
      });
      routes["POST /sessions/:id/complete"] = () => ({ body: makeCompletion({ kind: "timed" }) });

      renderPlayer(<LessonPlayer kind="timed" />);
      await screen.findByRole("heading", { name: "Select the correct meaning" });
      expect(
        screen.getByRole("progressbar", { name: lessonStrings.timeLeftLabel(30) }),
      ).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000);
      });
      expect(await screen.findByText(lessonStrings.completeTitle.timed)).toBeVisible();
      expect(screen.getByText(lessonStrings.timeCard)).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });
});
