"""Lesson sessions: start, grade each answer on the server, complete with rewards, abandon.

The browser never receives answers (docs/adr/0002). Every write is idempotent: sessions are
keyed by a client UUID, answers by ``answer_id``, and a completed session replays its stored
result.
"""

import random
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError
from app.domain.goals import GOAL_CHEST_GEMS, goal_reached_now
from app.domain.grading import grade_text
from app.domain.hearts import MAX_HEARTS, gain_heart, lose_heart
from app.domain.leagues import get_tier
from app.domain.streak import credit_streak
from app.domain.xp import session_xp
from app.models import (
    Exercise,
    ExerciseOption,
    Lesson,
    LessonSession,
    SessionAnswer,
    Skill,
    SkillProgress,
    User,
)
from app.schemas.session import (
    AnswerCreate,
    AnswerResult,
    CompletionResult,
    GoalSummary,
    LeagueSummary,
    Option,
    OptionAnswer,
    PairAnswer,
    Pairs,
    SessionCreate,
    SessionResponse,
    SessionRules,
    SkillSummary,
    SkipAnswer,
    SourceToken,
    StreakSummary,
    TextAnswer,
    Tile,
    TilesAnswer,
    XpSummary,
)
from app.schemas.session import (
    Exercise as ExerciseOut,
)
from app.services import achievements, hints, leagues
from app.services.common import (
    activity_for,
    add_gems,
    add_xp,
    apply_hearts,
    apply_streak,
    hearts_state,
    load_json,
    next_heart,
    settle,
    streak_state,
    streak_week,
    today_for,
)
from app.services.path import load_path

HEART_KINDS = frozenset({"lesson", "review"})  # kinds where a wrong answer costs a heart
LEGENDARY_PRICE = 100
LEGENDARY_MISTAKES = 3
LEGENDARY_LENGTH = 15
PRACTICE_LENGTH = 10
TIMED_LENGTH = 20
TIMED_START_SECONDS = 30
TIMED_BONUS_SECONDS = 7
CHOICE_TYPES = frozenset({"multiple_choice", "image_choice", "fill_blank"})
REVIEWABLE_TYPES = frozenset(
    {
        "multiple_choice",
        "image_choice",
        "translate_word_bank",
        "match_pairs",
        "fill_blank",
        "type_answer",
    }
)
TIMED_TYPES = frozenset({"multiple_choice", "image_choice", "fill_blank", "translate_word_bank"})


# --- loading ------------------------------------------------------------------------------------


def _session_for(db: Session, user: User, session_id: str) -> LessonSession:
    session = db.get(LessonSession, session_id)
    if session is None or session.user_id != user.id:
        raise AppError(404, "not_found", "Not found", "There is no session with that id.")
    return session


def _plan(session: LessonSession) -> list[int]:
    return [int(exercise_id) for exercise_id in load_json(session.plan)]


def _exercises(db: Session, ids: Sequence[int]) -> dict[int, Exercise]:
    rows = db.scalars(
        select(Exercise)
        .where(Exercise.id.in_(ids))
        .options(selectinload(Exercise.options), selectinload(Exercise.answers))
    ).all()
    return {row.id: row for row in rows}


def _pool(db: Session, user: User, types: frozenset[str]) -> list[int]:
    """Exercise ids from every lesson the learner has completed, limited to ``types``."""
    snapshot = load_path(db, user)
    lesson_ids: list[int] = []
    for unit in snapshot.units:
        for skill in unit.skills:
            done = snapshot.states[skill.id].lessons_completed
            lesson_ids += [lesson.id for lesson in skill.lessons if lesson.position <= done]
    if not lesson_ids:
        return []
    return list(
        db.scalars(
            select(Exercise.id)
            .where(Exercise.lesson_id.in_(lesson_ids), Exercise.type.in_(types))
            .order_by(Exercise.id)
        )
    )


# --- serialisation ------------------------------------------------------------------------------


def _by_role(exercise: Exercise, role: str) -> list[ExerciseOption]:
    return sorted((o for o in exercise.options if o.role == role), key=lambda o: o.position)


def _source_tokens(exercise: Exercise) -> list[SourceToken]:
    """Word hints for a Spanish source sentence; on a new-word exercise the word shows as new."""
    if exercise.source_lang != "es" or not exercise.source_text:
        return []
    new = bool(exercise.is_new_word)
    return [
        SourceToken(text=token.text, hint=token.hint, is_new=new and token.hint is not None)
        for token in hints.tokenize(exercise.source_text)
    ]


def _serialise(exercise: Exercise, rng: random.Random) -> ExerciseOut:
    choices = _by_role(exercise, "choice")
    tiles = _by_role(exercise, "tile")
    left, right = _by_role(exercise, "pair_left"), _by_role(exercise, "pair_right")
    for group in (choices, tiles, left, right):
        rng.shuffle(group)
    return ExerciseOut(
        id=exercise.id,
        type=exercise.type,
        prompt=exercise.prompt,
        source_text=exercise.source_text,
        source_lang=exercise.source_lang,
        source_tokens=_source_tokens(exercise),
        tts_text=exercise.tts_text,
        is_new_word=bool(exercise.is_new_word),
        options=[Option(id=o.id, text=o.text, image=o.image_key) for o in choices],
        tiles=[Tile(id=o.id, text=o.text) for o in tiles],
        pairs=(
            Pairs(
                left=[Tile(id=o.id, text=o.text) for o in left],
                right=[Tile(id=o.id, text=o.text) for o in right],
            )
            if left
            else None
        ),
    )


def _session_response(
    db: Session, now: datetime, user: User, session: LessonSession
) -> SessionResponse:
    plan = _plan(session)
    exercises = _exercises(db, plan)
    rng = random.Random(session.id)  # same session id, same shuffle on replay
    lesson_position: int | None = None
    lessons_total: int | None = None
    if session.lesson_id is not None:
        lesson = db.get(Lesson, session.lesson_id)
        skill = db.get(Skill, lesson.skill_id) if lesson else None
        if lesson is not None and skill is not None:
            lesson_position, lessons_total = lesson.position, len(skill.lessons)
    timed = session.kind == "timed"
    return SessionResponse(
        id=session.id,
        kind=session.kind,
        skill_id=session.skill_id,
        lesson_id=session.lesson_id,
        lesson_position=lesson_position,
        lessons_total=lessons_total,
        hearts=user.stats.hearts,
        hearts_max=MAX_HEARTS,
        exercises=[_serialise(exercises[i], rng) for i in plan if i in exercises],
        rules=SessionRules(
            hearts_enabled=session.kind in HEART_KINDS,
            mistakes_allowed=LEGENDARY_MISTAKES if session.kind == "legendary" else None,
            timer_seconds=TIMED_START_SECONDS if timed else None,
            timer_bonus_seconds=TIMED_BONUS_SECONDS if timed else None,
        ),
        started_at=session.started_at,
        server_now=now,
    )


# --- start --------------------------------------------------------------------------------------


def start_session(
    db: Session, now: datetime, user: User, body: SessionCreate
) -> tuple[SessionResponse, bool]:
    """Start a session. Returns the session and whether it was newly created."""
    session_id = str(body.id)
    existing = db.get(LessonSession, session_id)
    if existing is not None:
        if existing.user_id != user.id:
            raise AppError(409, "conflict", "Conflict", "That session id is already in use.")
        return _session_response(db, now, user, existing), False

    stats = settle(db, user, now)
    rng = random.Random(session_id)
    kind = body.kind
    skill_id: int | None = body.skill_id
    lesson_id: int | None = body.lesson_id

    if kind in HEART_KINDS:
        lesson = db.get(Lesson, body.lesson_id) if body.lesson_id else None
        if lesson is None:
            raise AppError(404, "not_found", "Not found", "There is no lesson with that id.")
        state = load_path(db, user).states[lesson.skill_id].state
        if state == "locked":
            raise AppError(409, "skill_locked", "Locked", "Complete the levels above first.")
        if kind == "lesson" and state in ("completed", "legendary"):
            kind = "review"  # replaying a finished skill is a review
        if stats.hearts == 0:
            raise AppError(
                409, "no_hearts", "Out of hearts", "Refill your hearts or practise first."
            )
        plan = [e.id for e in sorted(lesson.exercises, key=lambda e: e.position)]
        skill_id = lesson.skill_id
    elif kind == "legendary":
        skill = db.get(Skill, body.skill_id) if body.skill_id else None
        if skill is None:
            raise AppError(404, "not_found", "Not found", "There is no skill with that id.")
        if load_path(db, user).states[skill.id].state != "completed":
            raise AppError(
                409, "skill_locked", "Locked", "Finish the skill before going legendary."
            )
        pool = [
            e.id for lesson in skill.lessons for e in lesson.exercises if e.type in REVIEWABLE_TYPES
        ]
        plan = rng.sample(pool, min(LEGENDARY_LENGTH, len(pool)))
        add_gems(db, user, -LEGENDARY_PRICE, "legendary_entry", now, ref=f"legendary:{session_id}")
        lesson_id = None
    else:  # practice and timed draw from completed lessons
        pool = _pool(db, user, REVIEWABLE_TYPES if kind == "practice" else TIMED_TYPES)
        if not pool:
            raise AppError(
                409, "nothing_to_practice", "Nothing to practise", "Finish a lesson first."
            )
        length = PRACTICE_LENGTH if kind == "practice" else TIMED_LENGTH
        plan = rng.sample(pool, min(length, len(pool)))
        lesson_id = None

    session = LessonSession(
        id=session_id,
        user_id=user.id,
        kind=kind,
        skill_id=skill_id,
        lesson_id=lesson_id,
        status="active",
        plan=plan,
        mistakes=0,
        hearts_lost=0,
        started_at=now,
    )
    db.add(session)
    db.flush()
    response = _session_response(db, now, user, session)
    db.commit()
    return response, True


# --- answers ------------------------------------------------------------------------------------


def _accepted(exercise: Exercise) -> list[str]:
    answers = sorted(exercise.answers, key=lambda a: (not a.is_canonical, a.id))
    if answers:
        return [a.text for a in answers]
    tiles = sorted(
        (o for o in exercise.options if o.role == "tile" and o.answer_position is not None),
        key=lambda o: o.answer_position or 0,
    )
    return [" ".join(o.text for o in tiles)] if tiles else []


def _solution(exercise: Exercise) -> str | None:
    if exercise.type in CHOICE_TYPES:
        correct = next((o for o in exercise.options if o.role == "choice" and o.is_correct), None)
        return correct.text if correct else None
    if exercise.type == "match_pairs":
        return None
    accepted = _accepted(exercise)
    return accepted[0] if accepted else exercise.source_text


def _grade(exercise: Exercise, answer: object) -> tuple[str, bool | None]:
    """Return (outcome, pair_matched) for one answer."""
    options = {o.id: o for o in exercise.options}
    if isinstance(answer, SkipAnswer):
        return "skipped", None
    if isinstance(answer, OptionAnswer):
        option = options.get(answer.option_id)
        if option is None or option.role != "choice":
            raise AppError(422, "invalid_answer", "Invalid answer", "Unknown option.")
        return ("correct" if option.is_correct else "incorrect"), None
    if isinstance(answer, TilesAnswer):
        tiles = [options.get(tile_id) for tile_id in answer.tile_ids]
        if any(tile is None or tile.role != "tile" for tile in tiles):
            raise AppError(422, "invalid_answer", "Invalid answer", "Unknown tile.")
        sentence = " ".join(tile.text for tile in tiles if tile is not None)
        return grade_text(sentence, _accepted(exercise)).outcome, None
    if isinstance(answer, TextAnswer):
        return grade_text(answer.text, _accepted(exercise)).outcome, None
    if isinstance(answer, PairAnswer):
        first, second = (options.get(option_id) for option_id in answer.pair)
        if (
            first is None
            or second is None
            or {first.role, second.role} != {"pair_left", "pair_right"}
        ):
            raise AppError(
                422, "invalid_answer", "Invalid answer", "A pair needs one tile per column."
            )
        matched = first.pair_key == second.pair_key
        return ("correct" if matched else "incorrect"), matched
    raise AppError(422, "invalid_answer", "Invalid answer", "Unsupported answer shape.")


def _answers_for(
    db: Session, session: LessonSession, exercise_id: int | None = None
) -> list[SessionAnswer]:
    query = select(SessionAnswer).where(SessionAnswer.session_id == session.id)
    if exercise_id is not None:
        query = query.where(SessionAnswer.exercise_id == exercise_id)
    return list(db.scalars(query.order_by(SessionAnswer.id)).all())


def _is_done(exercise: Exercise, answers: Sequence[SessionAnswer]) -> bool:
    if exercise.type == "speak":
        return bool(answers)
    if exercise.type == "listen_type" and any(row.outcome == "skipped" for row in answers):
        return True  # "Can't listen now" sets listening aside without a penalty
    if exercise.type == "match_pairs":
        options = {o.id: o for o in exercise.options}
        matched: set[int | None] = set()
        for row in answers:
            if row.outcome == "correct":
                pair = load_json(row.answer).get("pair", [])
                if pair and pair[0] in options:
                    matched.add(options[pair[0]].pair_key)
        total = sum(1 for o in exercise.options if o.role == "pair_left")
        return total > 0 and len(matched) >= total
    return any(row.outcome in ("correct", "typo") for row in answers)


def _answer_result(
    session: LessonSession,
    user: User,
    exercise: Exercise,
    outcome: str,
    pair_matched: bool | None,
    done: bool,
) -> AnswerResult:
    stats = user.stats
    hearts_enabled = session.kind in HEART_KINDS
    return AnswerResult(
        outcome=outcome,
        correct=outcome in ("correct", "typo"),
        solution_display=_solution(exercise),
        hearts=stats.hearts,
        next_heart_at=next_heart(stats),
        out_of_hearts=hearts_enabled and stats.hearts == 0,
        exercise_done=done,
        pair_matched=pair_matched,
        mistakes_left=LEGENDARY_MISTAKES - session.mistakes
        if session.kind == "legendary"
        else None,
    )


def submit_answer(
    db: Session, now: datetime, user: User, session_id: str, body: AnswerCreate
) -> AnswerResult:
    session = _session_for(db, user, session_id)
    exercise = _exercises(db, [body.exercise_id]).get(body.exercise_id)
    if exercise is None or body.exercise_id not in _plan(session):
        raise AppError(
            422, "invalid_answer", "Invalid answer", "That exercise is not in this session."
        )

    replay = db.scalar(
        select(SessionAnswer).where(
            SessionAnswer.session_id == session.id, SessionAnswer.answer_id == str(body.answer_id)
        )
    )
    if replay is not None:
        matched = replay.outcome == "correct" if exercise.type == "match_pairs" else None
        done = _is_done(exercise, _answers_for(db, session, exercise.id))
        return _answer_result(session, user, exercise, replay.outcome, matched, done)

    if session.status != "active":
        raise AppError(409, "session_closed", "Session closed", "This session has already ended.")
    stats = settle(db, user, now)
    outcome, pair_matched = _grade(exercise, body.answer)
    if exercise.type == "speak" and outcome == "skipped":
        outcome = "skipped"  # speaking is a placeholder: skipping it is never a mistake
    if outcome == "incorrect":
        session.mistakes += 1
        if session.kind in HEART_KINDS and stats.hearts > 0:
            apply_hearts(stats, lose_heart(hearts_state(stats), now))
            session.hearts_lost += 1
    db.add(
        SessionAnswer(
            session_id=session.id,
            answer_id=str(body.answer_id),
            exercise_id=exercise.id,
            answer=body.answer.model_dump(mode="json"),
            outcome=outcome,
            answered_at=now,
        )
    )
    db.flush()
    if session.kind == "legendary" and session.mistakes > LEGENDARY_MISTAKES:
        session.status = "failed"
        session.ended_at = now
    done = _is_done(exercise, _answers_for(db, session, exercise.id))
    result = _answer_result(session, user, exercise, outcome, pair_matched, done)
    db.commit()
    return result


# --- completion ---------------------------------------------------------------------------------


def _score(
    plan: Sequence[int], exercises: dict[int, Exercise], answers: Sequence[SessionAnswer]
) -> tuple[int, int, int]:
    """Return (longest first-try-correct run, first-try correct count, exercises done)."""
    by_exercise: dict[int, list[SessionAnswer]] = {}
    for row in answers:
        by_exercise.setdefault(row.exercise_id, []).append(row)
    run = longest = first_try = done = 0
    for exercise_id in plan:
        rows = by_exercise.get(exercise_id, [])
        clean = bool(rows) and all(r.outcome in ("correct", "typo") for r in rows)
        exercise = exercises.get(exercise_id)
        if exercise is not None and exercise.type == "speak":
            clean = bool(rows)
        if clean:
            first_try += 1
            run += 1
            longest = max(longest, run)
        else:
            run = 0
        if exercise is not None and _is_done(exercise, rows):
            done += 1
    return longest, first_try, done


def complete_session(db: Session, now: datetime, user: User, session_id: str) -> CompletionResult:
    session = _session_for(db, user, session_id)
    if session.status == "completed" and session.result is not None:
        return CompletionResult.model_validate(load_json(session.result))
    if session.status != "active":
        raise AppError(409, "session_closed", "Session closed", "This session has already ended.")

    stats = settle(db, user, now)
    plan = _plan(session)
    exercises = _exercises(db, plan)
    answers = _answers_for(db, session)
    longest_run, first_try, done = _score(plan, exercises, answers)
    if session.kind != "timed" and done < len(plan):
        raise AppError(409, "incomplete", "Not finished", "Answer every exercise before finishing.")

    kind = session.kind
    xp = session_xp(kind, longest_run, len(plan), done)
    today = today_for(user, now)
    activity = activity_for(db, user, today)
    xp_before = activity.xp
    add_xp(db, user, xp.total, kind, now, session_id=session.id)
    activity.sessions_completed += 1

    goal = user.settings.daily_goal_xp
    activity.goal_xp = goal
    chest_gems = 0
    if activity.goal_met_at is None and goal_reached_now(xp_before, activity.xp, goal):
        activity.goal_met_at = now
        if add_gems(db, user, GOAL_CHEST_GEMS, "goal_chest", now, ref=f"goal:{today.isoformat()}"):
            chest_gems = GOAL_CHEST_GEMS

    previous_streak = stats.streak_current
    credit = credit_streak(streak_state(stats), today)
    apply_streak(stats, credit.state)
    if credit.extended:
        activity.streak_status = "extended"

    hearts_earned = 0
    if kind == "practice" and stats.hearts < MAX_HEARTS:
        apply_hearts(stats, gain_heart(hearts_state(stats), now))
        hearts_earned = 1

    skill_summary = _advance_skill(db, now, user, session)
    if kind in ("lesson", "review", "legendary"):
        stats.lessons_completed += 1
    if kind == "lesson" and session.mistakes == 0:
        stats.perfect_lessons += 1

    unlocks = achievements.evaluate(db, user, now)
    cohort, rank = leagues.learner_rank(db, user, now)
    tier = get_tier(cohort.tier)
    result = CompletionResult(
        session_id=session.id,
        kind=kind,
        xp=XpSummary(base=xp.base, combo_bonus=xp.combo_bonus, total=xp.total),
        accuracy_pct=round(100 * first_try / len(plan)) if plan else 100,
        duration_seconds=max(0, int((now - session.started_at).total_seconds())),
        hearts=stats.hearts,
        hearts_earned=hearts_earned,
        gems=stats.gems,
        streak=StreakSummary(
            extended=credit.extended,
            previous=previous_streak,
            current=stats.streak_current,
            milestone=credit.milestone,
            week=streak_week(db, user, now),
        ),
        daily_goal=GoalSummary(
            goal_xp=goal, today_xp=activity.xp, reached_now=chest_gems > 0, chest_gems=chest_gems
        ),
        skill=skill_summary,
        achievements=unlocks,
        league=LeagueSummary(tier=tier.tier, name=tier.name, rank=rank),
    )
    session.status = "completed"
    session.ended_at = now
    session.result = result.model_dump(mode="json")
    db.commit()
    return result


def _advance_skill(
    db: Session, now: datetime, user: User, session: LessonSession
) -> SkillSummary | None:
    if session.skill_id is None or session.kind not in ("lesson", "review", "legendary"):
        return None
    skill = db.get(Skill, session.skill_id)
    if skill is None:
        return None
    total = len(skill.lessons)
    progress = db.get(SkillProgress, (user.id, skill.id))
    if progress is None:
        progress = SkillProgress(
            user_id=user.id, skill_id=skill.id, lessons_completed=0, crown_level=0
        )
        db.add(progress)
    completed_now = False
    if session.kind == "lesson" and session.lesson_id is not None:
        lesson = db.get(Lesson, session.lesson_id)
        if lesson is not None and lesson.position == progress.lessons_completed + 1:
            progress.lessons_completed += 1
        if progress.lessons_completed >= total and progress.crown_level == 0:
            progress.crown_level = 1
            progress.completed_at = now
            completed_now = True
    if session.kind == "legendary" and progress.crown_level < 2:
        progress.crown_level = 2
        progress.legendary_at = now
        user.stats.legendary_skills += 1
    db.flush()
    return SkillSummary(
        id=skill.id,
        lessons_completed=progress.lessons_completed,
        lessons_total=total,
        completed_now=completed_now,
        crown_level=progress.crown_level,
    )


def abandon_session(db: Session, now: datetime, user: User, session_id: str) -> None:
    session = _session_for(db, user, session_id)
    if session.status == "active":
        session.status = "abandoned"
        session.ended_at = now
        db.commit()
