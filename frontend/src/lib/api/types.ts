/**
 * API contract for `/api/v1`, mirrored exactly from the backend's Pydantic
 * models. All datetimes are UTC ISO-8601 strings ending in `Z`; local dates
 * are `YYYY-MM-DD` in the learner's time zone.
 */

export type ISODateTime = string;
export type LocalDate = string;

export type Theme = "system" | "light" | "dark";
export type DailyGoal = 1 | 10 | 20 | 30 | 50;
export type UnitColor = "green" | "purple" | "blue" | "orange" | "red";
export type NodeType = "lesson" | "chest" | "practice" | "unit_review";
export type NodeIcon = "star" | "chest" | "dumbbell" | "trophy";
export type NodeState = "locked" | "active" | "completed" | "legendary";
export type SessionKind = "lesson" | "practice" | "review" | "legendary" | "timed";
export type ExerciseType =
  | "multiple_choice"
  | "image_choice"
  | "translate_word_bank"
  | "match_pairs"
  | "fill_blank"
  | "type_answer"
  | "listen_type"
  | "speak";
export type Outcome = "correct" | "typo" | "incorrect" | "skipped";
export type Zone = "promotion" | "safe" | "demotion";

/** Error body for every non-2xx response (RFC 9457 problem details). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
}

// Auth (no session needed) -------------------------------------------------

/** GET /auth/learners: a sample learner as the login page shows them. */
export interface SampleLearner {
  username: string;
  display_name: string;
  avatar_color: string;
  initials: string;
  xp_total: number;
  /** The streak as it stands today (0 once a missed day broke it). */
  streak: number;
  /** The unit holding the learner's next node on the path. */
  unit_number: number;
  unit_title: string;
  league_name: string;
}

/** POST /auth/login; answers with the SampleLearner and sets the session cookie. */
export interface LoginRequest {
  username: string;
}

// Learner ------------------------------------------------------------------

export interface Settings {
  sound_effects: boolean;
  animations: boolean;
  motivational_messages: boolean;
  listening_exercises: boolean;
  theme: Theme;
  daily_goal_xp: DailyGoal;
}

export interface StreakDay {
  date: LocalDate;
  /** "M", "Tu", "W", "Th", "F", "Sa" or "Su". */
  label: string;
  status: "extended" | "frozen" | "missed" | "pending" | "future";
}

export interface MeResponse {
  user: {
    id: number;
    username: string;
    display_name: string;
    avatar_color: string;
    timezone: string;
    joined_at: ISODateTime;
  };
  course: { id: number; title: string; learning_language: string; from_language: string };
  stats: {
    xp_total: number;
    today_xp: number;
    daily_goal_xp: DailyGoal;
    gems: number;
    hearts: number;
    hearts_max: number;
    next_heart_at: ISODateTime | null;
    streak: {
      current: number;
      longest: number;
      extended_today: boolean;
      freezes: number;
      week: StreakDay[];
    };
    league: { tier: number; name: string; unlocked: boolean };
  };
  settings: Settings;
  server_now: ISODateTime;
}

/** PATCH /me */
export interface UpdateMeRequest {
  daily_goal_xp?: DailyGoal;
  timezone?: string;
}

/** PATCH /me/settings */
export type SettingsUpdate = Partial<Settings>;

// Course path --------------------------------------------------------------

export interface PathNode {
  id: number;
  type: NodeType;
  position: number;
  title: string;
  icon: NodeIcon;
  state: NodeState;
  lessons_total: number;
  lessons_completed: number;
  crown_level: 0 | 1 | 2;
  next_lesson_id: number | null;
  chest_claimed: boolean;
}

export interface PathUnit {
  id: number;
  section: number;
  position: number;
  title: string;
  description: string;
  color: UnitColor;
  nodes: PathNode[];
}

export interface PathResponse {
  course: MeResponse["course"];
  units: PathUnit[];
  active_node_id: number | null;
  server_now: ISODateTime;
}

/** POST /skills/{id}/chest (409 skill_locked | already_claimed) */
export interface ClaimChestResponse {
  gems: number;
  reward: number;
}

// Sessions -----------------------------------------------------------------

export interface Option {
  id: number;
  text: string;
  /** Emoji glyph for image_choice. */
  image: string | null;
}

export interface Tile {
  id: number;
  text: string;
}

/** A slice of a Spanish source sentence; joined, the texts give `source_text` back. */
export interface SourceToken {
  text: string;
  /** English meaning shown on hover / tap, or null (names, numbers, punctuation). */
  hint: string | null;
  /** The word this exercise introduces (shown in purple). */
  is_new: boolean;
}

export interface Exercise {
  id: number;
  type: ExerciseType;
  prompt: string;
  source_text: string | null;
  source_lang: "es" | "en" | null;
  /** Word hints for a Spanish source_text; empty otherwise. */
  source_tokens: SourceToken[];
  tts_text: string | null;
  is_new_word: boolean;
  /** multiple_choice, image_choice, fill_blank */
  options: Option[];
  /** translate_word_bank: correct and distractor tiles, shuffled. */
  tiles: Tile[];
  /** match_pairs: 5 + 5, each column shuffled. */
  pairs: { left: Tile[]; right: Tile[] } | null;
}

export interface SessionRules {
  hearts_enabled: boolean;
  mistakes_allowed: number | null;
  timer_seconds: number | null;
  timer_bonus_seconds: number | null;
}

export interface SessionResponse {
  id: string;
  kind: SessionKind;
  skill_id: number | null;
  lesson_id: number | null;
  lesson_position: number | null;
  lessons_total: number | null;
  hearts: number;
  hearts_max: number;
  exercises: Exercise[];
  rules: SessionRules;
  started_at: ISODateTime;
  server_now: ISODateTime;
}

/**
 * POST /sessions -> 201 SessionResponse (the same id again replays with 200).
 * Errors 409: skill_locked | no_hearts | insufficient_gems | nothing_to_practice
 */
export interface StartSessionRequest {
  /** Client-generated UUID; reusing it makes the start idempotent. */
  id: string;
  kind: SessionKind;
  skill_id?: number;
  lesson_id?: number;
}

export type Answer =
  | { option_id: number }
  | { tile_ids: number[] }
  | { text: string }
  | { pair: [number, number] }
  | { skipped: true };

/** POST /sessions/{id}/answers (409 session_closed, 422 invalid_answer) */
export interface SubmitAnswerRequest {
  /** Client-generated UUID; reusing it replays the same result. */
  answer_id: string;
  exercise_id: number;
  answer: Answer;
}

export interface AnswerResult {
  outcome: Outcome;
  correct: boolean;
  solution_display: string | null;
  hearts: number;
  next_heart_at: ISODateTime | null;
  out_of_hearts: boolean;
  exercise_done: boolean;
  pair_matched: boolean | null;
  mistakes_left: number | null;
}

export interface AchievementUnlock {
  key: string;
  name: string;
  level: number;
  gems: number;
  description: string;
}

/** POST /sessions/{id}/complete (idempotent; 409 incomplete | session_closed) */
export interface CompletionResult {
  session_id: string;
  kind: SessionKind;
  xp: { base: number; combo_bonus: number; total: number };
  accuracy_pct: number;
  duration_seconds: number;
  hearts: number;
  hearts_earned: number;
  gems: number;
  streak: {
    extended: boolean;
    previous: number;
    current: number;
    milestone: boolean;
    week: StreakDay[];
  };
  daily_goal: { goal_xp: number; today_xp: number; reached_now: boolean; chest_gems: number };
  skill: {
    id: number;
    lessons_completed: number;
    lessons_total: number;
    completed_now: boolean;
    crown_level: 0 | 1 | 2;
  } | null;
  achievements: AchievementUnlock[];
  league: { tier: number; name: string; rank: number | null };
}

// Hearts and shop ----------------------------------------------------------

export type RefillContext = "shop" | "lesson";

/** POST /hearts/refill (409 hearts_full | insufficient_gems) */
export interface RefillHeartsRequest {
  context: RefillContext;
}

export interface RefillHeartsResponse {
  hearts: number;
  gems: number;
  next_heart_at: null;
}

export type ShopItemKey = "heart_refill" | "streak_freeze" | "unlimited_hearts" | "legendary_entry";

export interface ShopItem {
  key: ShopItemKey;
  name: string;
  description: string;
  price_gems: number | null;
  available: boolean;
  owned: number | null;
  max_owned: number | null;
  disabled_reason: "full" | "max_owned" | "insufficient_gems" | "coming_soon" | null;
}

/** GET /shop */
export interface ShopResponse {
  gems: number;
  items: ShopItem[];
}

/** POST /shop/purchases (409 max_owned | insufficient_gems) */
export interface PurchaseRequest {
  item_key: ShopItemKey;
}

export interface PurchaseResponse {
  gems: number;
  hearts: number;
  streak_freezes: number;
}

// Leaderboard, profile and quests ------------------------------------------

export interface LeaderboardRow {
  rank: number;
  user_id: number;
  display_name: string;
  avatar_color: string;
  xp: number;
  is_me: boolean;
  zone: Zone;
}

export interface LeaderboardResponse {
  unlocked: boolean;
  lessons_to_unlock: number;
  tier: number;
  name: string;
  tiers: { tier: number; name: string; color: string }[];
  week_start: LocalDate;
  ends_at: ISODateTime;
  promote_count: number;
  demote_count: number;
  rows: LeaderboardRow[];
  last_result: {
    tier_before: number;
    tier_after: number;
    outcome: "promoted" | "stayed" | "demoted";
    rank: number;
    gems: number;
  } | null;
  server_now: ISODateTime;
}

export interface AchievementView {
  key: string;
  name: string;
  description: string;
  level: number;
  max_level: number;
  progress: number;
  target: number;
  color: string;
}

export interface ProfileResponse {
  user: MeResponse["user"];
  course: MeResponse["course"];
  stats: { streak: number; xp_total: number; league_name: string | null; top3_finishes: number };
  achievements: AchievementView[];
}

export interface DailyQuest {
  key: "daily_goal";
  title: string;
  progress: number;
  target: number;
  completed: boolean;
  chest_gems: number;
}

export interface QuestsResponse {
  ends_at: ISODateTime;
  daily: DailyQuest[];
  server_now: ISODateTime;
}

// Demo tools (404 unless DEMO_TOOLS=true) and health -----------------------

export interface DemoClock {
  now: ISODateTime;
  offset_seconds: number;
}

/** POST /demo/clock/advance */
export interface AdvanceClockRequest {
  seconds: number;
}

/** GET /api/health (outside /v1) */
export interface HealthResponse {
  status: "ok";
  db: "ok";
  seeded: boolean;
  version: string;
}
