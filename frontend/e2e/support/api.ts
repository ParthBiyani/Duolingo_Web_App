/**
 * Direct API calls for test setup and checks: the demo clock, the learner's state and lessons
 * finished without the UI. They go straight to the suite's API server, not through the web app.
 */
import { randomUUID } from "node:crypto";

import { expect, type APIRequestContext } from "@playwright/test";

import { apiAnswers, wrongApiAnswer } from "./oracle";

export const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8100";

const DAY_SECONDS = 24 * 60 * 60;
/** The seeded learner's time zone, Asia/Kolkata: UTC+5:30 all year round. */
const LEARNER_UTC_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = DAY_SECONDS * 1000;

// The parts of the API responses the tests look at.

export interface Me {
  user: { username: string; display_name: string };
  stats: {
    gems: number;
    hearts: number;
    streak: { current: number; extended_today: boolean; freezes: number };
  };
  settings: {
    sound_effects: boolean;
    animations: boolean;
    motivational_messages: boolean;
    listening_exercises: boolean;
    theme: string;
    daily_goal_xp: number;
  };
}

export interface PathNode {
  id: number;
  type: "lesson" | "chest" | "practice" | "unit_review";
  title: string;
  next_lesson_id: number | null;
}

export interface LearningPath {
  active_node_id: number | null;
  units: { nodes: PathNode[] }[];
}

export type Zone = "promotion" | "safe" | "demotion";

export interface Leaderboard {
  tier: number;
  name: string;
  tiers: { tier: number; name: string }[];
  rows: {
    rank: number;
    user_id: number;
    display_name: string;
    xp: number;
    is_me: boolean;
    zone: Zone;
  }[];
}

interface StartedSession {
  id: string;
  exercises: { id: number }[];
}

export interface Completion {
  xp: { total: number };
  streak: { extended: boolean; current: number };
}

/** The sample learners, in the login page's order (backend/app/seed/learners.py). */
export const LEARNERS = {
  parthbiyani: "Parth Biyani",
  ananyaiyer: "Ananya Iyer",
  ishanair: "Isha Nair",
  kabirmalhotra: "Kabir Malhotra",
} as const;

export type Username = keyof typeof LEARNERS;

/** The session cookie the API sets on login; every other route answers 401 without it. */
export const SESSION_COOKIE = "duo_session";

export class Api {
  constructor(private readonly request: APIRequestContext) {}

  private async call<T>(method: "GET" | "POST" | "PATCH", path: string, data?: unknown) {
    const response = await this.request.fetch(`${API_URL}/api/v1${path}`, { method, data });
    expect(response.ok(), `${method} ${path} answered ${response.status()}`).toBe(true);
    return (response.status() === 204 ? undefined : await response.json()) as T;
  }

  /** Logs in as a sample learner: the session cookie lands in this client's cookie jar. */
  login(username: Username) {
    return this.call<{ username: string; display_name: string }>("POST", "/auth/login", {
      username,
    });
  }

  /** The session cookie, ready to add to a browser context (cookies ignore the port). */
  async sessionCookies() {
    const { cookies } = await this.request.storageState();
    const session = cookies.filter((cookie) => cookie.name === SESSION_COOKIE);
    expect(session, "the session cookie after logging in").toHaveLength(1);
    return session;
  }

  /** Restores every sample learner and the league weeks, and puts the clock back to real time. */
  resetDemo() {
    return this.call<void>("POST", "/demo/reset");
  }

  advanceClock(seconds: number) {
    return this.call<{ now: string; offset_seconds: number }>("POST", "/demo/clock/advance", {
      seconds,
    });
  }

  advanceDays(days: number) {
    return this.advanceClock(days * DAY_SECONDS);
  }

  /**
   * Moves the clock to a minute past the learner's next Monday midnight, where the league week
   * turns over (a week ahead on a Monday).
   */
  async advanceToNextWeek() {
    const clock = await this.call<{ now: string }>("GET", "/demo/clock");
    const now = Date.parse(clock.now);
    // Shifted by the learner's offset, the UTC fields of a date read as the learner's wall clock.
    const wallClock = new Date(now + LEARNER_UTC_OFFSET_MS);
    const daysSinceMonday = (wallClock.getUTCDay() + 6) % 7;
    const midnight =
      Date.UTC(wallClock.getUTCFullYear(), wallClock.getUTCMonth(), wallClock.getUTCDate()) -
      LEARNER_UTC_OFFSET_MS;
    const nextMonday = midnight + (7 - daysSinceMonday) * DAY_MS;
    return this.advanceClock(Math.ceil((nextMonday - now) / 1000) + 60);
  }

  me() {
    return this.call<Me>("GET", "/me");
  }

  /** Answers 401 once the session is gone (after logging out, for example). */
  async status(path: string): Promise<number> {
    return (await this.request.fetch(`${API_URL}/api/v1${path}`)).status();
  }

  setDailyGoal(dailyGoalXp: 1 | 10 | 20 | 30 | 50) {
    return this.call<Me>("PATCH", "/me", { daily_goal_xp: dailyGoalXp });
  }

  updateSettings(change: Partial<Me["settings"]>) {
    return this.call<Me["settings"]>("PATCH", "/me/settings", change);
  }

  path() {
    return this.call<LearningPath>("GET", "/courses/current/path");
  }

  leaderboard() {
    return this.call<Leaderboard>("GET", "/leaderboard");
  }

  /** The node the learner should play next (the one with the START bubble). */
  async activeNode(): Promise<PathNode> {
    const path = await this.path();
    const node = path.units
      .flatMap((unit) => unit.nodes)
      .find((candidate) => candidate.id === path.active_node_id);
    if (!node) throw new Error("the path has no active node");
    return node;
  }

  /** Plays a whole lesson through the API with the oracle's answers, then completes it. */
  async completeLesson(lessonId: number): Promise<Completion> {
    const session = await this.call<StartedSession>("POST", "/sessions", {
      id: randomUUID(),
      kind: "lesson",
      lesson_id: lessonId,
    });
    for (const exercise of session.exercises) {
      for (const answer of apiAnswers(exercise.id)) {
        await this.call("POST", `/sessions/${session.id}/answers`, {
          answer_id: randomUUID(),
          exercise_id: exercise.id,
          answer,
        });
      }
    }
    return this.call<Completion>("POST", `/sessions/${session.id}/complete`);
  }

  /** Completes the path's lessons in order until the active node is of `type`; returns it. */
  async completeLessonsUntil(type: PathNode["type"], limit = 10): Promise<PathNode> {
    for (let done = 0; done <= limit; done += 1) {
      const node = await this.activeNode();
      if (node.type === type) return node;
      if (node.next_lesson_id === null) throw new Error(`"${node.title}" has no lesson to play`);
      await this.completeLesson(node.next_lesson_id);
    }
    throw new Error(`no ${type} node within ${limit} lessons`);
  }

  /**
   * Spends `count` hearts (all of them by default) on wrong answers in a lesson, through the
   * API, then abandons it. Returns the hearts left.
   */
  async loseHearts(lessonId: number, count = Number.POSITIVE_INFINITY): Promise<number> {
    const session = await this.call<StartedSession>("POST", "/sessions", {
      id: randomUUID(),
      kind: "lesson",
      lesson_id: lessonId,
    });
    // The same exercise can be missed again and again; each miss costs a heart.
    const missable = session.exercises.find((exercise) => wrongApiAnswer(exercise.id) !== null);
    if (!missable) throw new Error(`lesson ${lessonId} has no exercise to miss`);
    const answer = wrongApiAnswer(missable.id);
    let hearts = (await this.me()).stats.hearts;
    for (let lost = 0; lost < count && hearts > 0; lost += 1) {
      const result = await this.call<{ hearts: number }>(
        "POST",
        `/sessions/${session.id}/answers`,
        { answer_id: randomUUID(), exercise_id: missable.id, answer },
      );
      hearts = result.hearts;
    }
    await this.call<void>("POST", `/sessions/${session.id}/abandon`);
    return hearts;
  }

  /** Spends every heart on wrong answers in a lesson (through the API). */
  async loseAllHearts(lessonId: number): Promise<void> {
    expect(await this.loseHearts(lessonId), "hearts left after the wrong answers").toBe(0);
  }
}
