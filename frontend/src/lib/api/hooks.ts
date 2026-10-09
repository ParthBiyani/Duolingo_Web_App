/**
 * One hook per endpoint. Queries share the defaults from queryClient.ts
 * (30 s stale time, 2 retries on transient errors). Mutations keep the cache
 * consistent with the server, which stays authoritative:
 *  - an answer result patches the hearts in `me`;
 *  - completing a session invalidates everything it can change;
 *  - refills and purchases patch `me` and `shop` immediately.
 */
import {
  useMutation,
  useQuery,
  type QueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { api } from "./client";
import { keepLeagueResult } from "./leagueResult";
import { queryKeys } from "./queryKeys";
import type {
  AdvanceClockRequest,
  AnswerResult,
  ClaimChestResponse,
  CompletionResult,
  DemoClock,
  LeaderboardResponse,
  LoginRequest,
  MeResponse,
  PathResponse,
  ProfileResponse,
  PurchaseRequest,
  PurchaseResponse,
  QuestsResponse,
  RefillContext,
  RefillHeartsRequest,
  RefillHeartsResponse,
  SampleLearner,
  SessionResponse,
  Settings,
  SettingsUpdate,
  ShopItemKey,
  ShopResponse,
  StartSessionRequest,
  StreakCalendarResponse,
  SubmitAnswerRequest,
  UpdateMeRequest,
} from "./types";

type QueryOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn">;

// Cache helpers --------------------------------------------------------------

type Stats = MeResponse["stats"];

function patchMe(client: QueryClient, update: (me: MeResponse) => MeResponse) {
  client.setQueryData<MeResponse>(queryKeys.me, (me) => (me ? update(me) : me));
}

function patchStats(client: QueryClient, update: (stats: Stats) => Partial<Stats>) {
  patchMe(client, (me) => ({ ...me, stats: { ...me.stats, ...update(me.stats) } }));
}

function withSettings(me: MeResponse, settings: Settings): MeResponse {
  return { ...me, settings, stats: { ...me.stats, daily_goal_xp: settings.daily_goal_xp } };
}

function patchShopGems(client: QueryClient, gems: number) {
  client.setQueryData<ShopResponse>(queryKeys.shop, (shop) => (shop ? { ...shop, gems } : shop));
}

function invalidate(client: QueryClient, keys: ReadonlyArray<readonly unknown[]>) {
  return Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

const sessionPath = (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}`;

// Auth ---------------------------------------------------------------------

/** The sample learners for the login page; works without a session. */
export function useSampleLearners(options?: QueryOptions<SampleLearner[]>) {
  return useQuery({
    queryKey: queryKeys.sampleLearners,
    queryFn: ({ signal }) => api.get<SampleLearner[]>("/auth/learners", { signal }),
    ...options,
  });
}

/**
 * POST /auth/login: the response sets the session cookie. Learner data cached so far belonged
 * to nobody (or to the previous learner), so it is dropped on success; the login page keeps
 * its list of learners on screen while the app navigates away.
 */
export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginRequest) => api.post<SampleLearner>("/auth/login", body),
    meta: { silent: true }, // the login page reports failures itself
    onSuccess: (_learner, _body, _onMutateResult, { client }) =>
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== queryKeys.sampleLearners[0],
      }),
  });
}

/**
 * POST /auth/logout: clears the session cookie, then the learner's cached data. Failures are
 * left to the caller (meta.silent), which reports them itself.
 */
export function useLogout() {
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    meta: { silent: true },
    onSuccess: (_result, _variables, _onMutateResult, { client }) => client.removeQueries(),
  });
}

// Queries ------------------------------------------------------------------

export function useMe(options?: QueryOptions<MeResponse>) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => api.get<MeResponse>("/me", { signal }),
    ...options,
  });
}

export function usePath(options?: QueryOptions<PathResponse>) {
  return useQuery({
    queryKey: queryKeys.path,
    queryFn: ({ signal }) => api.get<PathResponse>("/courses/current/path", { signal }),
    ...options,
  });
}

export function useQuests(options?: QueryOptions<QuestsResponse>) {
  return useQuery({
    queryKey: queryKeys.quests,
    queryFn: ({ signal }) => api.get<QuestsResponse>("/quests", { signal }),
    ...options,
  });
}

export function useShop(options?: QueryOptions<ShopResponse>) {
  return useQuery({
    queryKey: queryKeys.shop,
    queryFn: ({ signal }) => api.get<ShopResponse>("/shop", { signal }),
    ...options,
  });
}

export function useLeaderboard(options?: QueryOptions<LeaderboardResponse>) {
  return useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: async ({ signal }) => {
      const board = await api.get<LeaderboardResponse>("/leaderboard", { signal });
      keepLeagueResult(board); // reported once, maybe to the rail: kept for the Leaderboards page
      return board;
    },
    ...options,
  });
}

export function useProfile(options?: QueryOptions<ProfileResponse>) {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) => api.get<ProfileResponse>("/profile", { signal }),
    ...options,
  });
}

/** One month (`YYYY-MM`) of streak days; `null` asks for the learner's current month. */
export function useStreakCalendar(
  month: string | null,
  options?: QueryOptions<StreakCalendarResponse>,
) {
  return useQuery({
    queryKey: queryKeys.streakCalendar(month),
    queryFn: ({ signal }) =>
      api.get<StreakCalendarResponse>(
        month ? `/streak/calendar?month=${encodeURIComponent(month)}` : "/streak/calendar",
        { signal },
      ),
    ...options,
  });
}

/** Simulated clock; the endpoint 404s unless the backend runs with DEMO_TOOLS=true. */
export function useDemoClock(options?: QueryOptions<DemoClock>) {
  return useQuery({
    queryKey: queryKeys.demoClock,
    queryFn: ({ signal }) => api.get<DemoClock>("/demo/clock", { signal }),
    retry: false,
    meta: { silent: true },
    ...options,
  });
}

// Learner mutations ----------------------------------------------------------

/** PATCH /me/settings. Applies the change optimistically (theme switches instantly). */
export function useUpdateSettings() {
  return useMutation({
    mutationFn: (update: SettingsUpdate) => api.patch<Settings>("/me/settings", update),
    onMutate: async (update, { client }) => {
      await client.cancelQueries({ queryKey: queryKeys.me });
      const previous = client.getQueryData<MeResponse>(queryKeys.me);
      patchMe(client, (me) => withSettings(me, { ...me.settings, ...update }));
      return { previous };
    },
    onError: (_error, _update, onMutateResult, { client }) => {
      if (onMutateResult?.previous) client.setQueryData(queryKeys.me, onMutateResult.previous);
    },
    onSuccess: (settings, _update, _onMutateResult, { client }) => {
      patchMe(client, (me) => withSettings(me, settings));
    },
    onSettled: (_settings, _error, update, _onMutateResult, { client }) => {
      if (update.daily_goal_xp !== undefined)
        return invalidate(client, [queryKeys.me, queryKeys.quests]);
    },
  });
}

/** PATCH /me (daily goal, time zone). */
export function useUpdateMe() {
  return useMutation({
    mutationFn: (update: UpdateMeRequest) => api.patch<MeResponse>("/me", update),
    onSuccess: (me, _update, _onMutateResult, { client }) => {
      client.setQueryData(queryKeys.me, me);
      return invalidate(client, [queryKeys.quests, queryKeys.leaderboard, queryKeys.profile]);
    },
  });
}

// Hearts, shop and chests ----------------------------------------------------

/** POST /hearts/refill. Pass "lesson" from the out-of-hearts dialog (higher price). */
export function useRefillHearts() {
  return useMutation({
    mutationFn: (context: RefillContext) =>
      api.post<RefillHeartsResponse>("/hearts/refill", { context } satisfies RefillHeartsRequest),
    onSuccess: (result, _context, _onMutateResult, { client }) => {
      patchStats(client, () => ({
        hearts: result.hearts,
        gems: result.gems,
        next_heart_at: result.next_heart_at,
      }));
      patchShopGems(client, result.gems);
      return invalidate(client, [queryKeys.shop]);
    },
  });
}

/** POST /shop/purchases (heart refill or streak freeze). */
export function usePurchase() {
  return useMutation({
    mutationFn: (itemKey: ShopItemKey) =>
      api.post<PurchaseResponse>("/shop/purchases", {
        item_key: itemKey,
      } satisfies PurchaseRequest),
    onSuccess: (result, _itemKey, _onMutateResult, { client }) => {
      patchStats(client, (stats) => ({
        gems: result.gems,
        hearts: result.hearts,
        next_heart_at: result.hearts >= stats.hearts_max ? null : stats.next_heart_at,
        streak: { ...stats.streak, freezes: result.streak_freezes },
      }));
      patchShopGems(client, result.gems);
      return invalidate(client, [queryKeys.shop]);
    },
  });
}

/** POST /skills/{id}/chest: claims a path chest once. */
export function useClaimChest() {
  return useMutation({
    mutationFn: (skillId: number) => api.post<ClaimChestResponse>(`/skills/${skillId}/chest`),
    onSuccess: (result, _skillId, _onMutateResult, { client }) => {
      patchStats(client, () => ({ gems: result.gems }));
      patchShopGems(client, result.gems);
      return invalidate(client, [queryKeys.path, queryKeys.shop]);
    },
  });
}

// Sessions -------------------------------------------------------------------

/** POST /sessions. The caller generates `id` once, so a retried start replays. */
export function useStartSession() {
  return useMutation({
    mutationFn: (body: StartSessionRequest) => api.post<SessionResponse>("/sessions", body),
    onSuccess: (session, _body, _onMutateResult, { client }) => {
      client.setQueryData(queryKeys.session(session.id), session);
      patchStats(client, () => ({ hearts: session.hearts, hearts_max: session.hearts_max }));
      // A legendary entry can spend gems.
      if (session.kind === "legendary") return invalidate(client, [queryKeys.me, queryKeys.shop]);
    },
  });
}

export interface SubmitAnswerVariables extends SubmitAnswerRequest {
  sessionId: string;
}

/** POST /sessions/{id}/answers. Patches the hearts shown everywhere else. */
export function useSubmitAnswer() {
  return useMutation({
    mutationFn: ({ sessionId, ...body }: SubmitAnswerVariables) =>
      api.post<AnswerResult>(
        `${sessionPath(sessionId)}/answers`,
        body satisfies SubmitAnswerRequest,
      ),
    onSuccess: (result, _variables, _onMutateResult, { client }) => {
      patchStats(client, () => ({ hearts: result.hearts, next_heart_at: result.next_heart_at }));
    },
  });
}

/** POST /sessions/{id}/complete (idempotent). */
export function useCompleteSession() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post<CompletionResult>(`${sessionPath(sessionId)}/complete`),
    onSuccess: (result, _sessionId, _onMutateResult, { client }) => {
      patchStats(client, (stats) => ({
        hearts: result.hearts,
        gems: result.gems,
        today_xp: result.daily_goal.today_xp,
        streak: {
          ...stats.streak,
          current: result.streak.current,
          extended_today: stats.streak.extended_today || result.streak.extended,
          week: result.streak.week,
        },
      }));
      return invalidate(client, [
        queryKeys.me,
        queryKeys.path,
        queryKeys.quests,
        queryKeys.leaderboard,
        queryKeys.profile,
        queryKeys.shop,
        queryKeys.streakCalendars,
      ]);
    },
  });
}

/** POST /sessions/{id}/abandon: quitting or failing a session. */
export function useAbandonSession() {
  return useMutation({
    mutationFn: (sessionId: string) => api.post<void>(`${sessionPath(sessionId)}/abandon`),
    onSuccess: (_result, _sessionId, _onMutateResult, { client }) =>
      invalidate(client, [queryKeys.me, queryKeys.path]),
  });
}

// Demo tools -------------------------------------------------------------------

/** POST /demo/clock/advance. Time drives hearts, streaks and leagues, so every query refetches. */
export function useAdvanceClock() {
  return useMutation({
    mutationFn: (seconds: number) =>
      api.post<DemoClock>("/demo/clock/advance", { seconds } satisfies AdvanceClockRequest),
    onSuccess: (clock, _seconds, _onMutateResult, { client }) => {
      client.setQueryData(queryKeys.demoClock, clock);
      return client.invalidateQueries();
    },
  });
}

/** POST /demo/reset: restores the sample learners and the clock; the session is kept. */
export function useResetDemo() {
  return useMutation({
    mutationFn: () => api.post<void>("/demo/reset"),
    onSuccess: (_result, _variables, _onMutateResult, { client }) => client.invalidateQueries(),
  });
}
