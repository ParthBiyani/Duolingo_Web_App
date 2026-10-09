"""Weekly leagues: shared cohorts of 30, live rival XP and lazy week finalisation.

A cohort is one group at one tier for one league week. Real learners share cohorts: a learner
whose leaderboard is unlocked and who has no cohort this week joins the open cohort for their
tier and week, taking a rival's seat, and only when no cohort has a seat left is a new one
formed and filled up with rivals. Learners who were promoted or demoted together therefore
meet again in their new league.

Standings are summed from the XP ledger on every read, so XP that one learner earns shows on
every other member's board straight away. Rivals' XP is written to the same ledger lazily: each
read adds what they have earned so far today, so the table keeps moving through the day.

A week is finalised once, by whichever member first reaches the leagues after it has ended:
every member gets a final rank and outcome, and every real member gets their prize and their
next tier in the same transaction.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain import dates
from app.domain.leagues import (
    COHORT_SIZE,
    TIERS,
    Ranked,
    Standing,
    bot_day_xp,
    get_tier,
    outcome_for,
    rank_standings,
    reward_gems,
)
from app.domain.rivals import rival
from app.models import LeagueCohort, LeagueMembership, User, XpEvent
from app.schemas.leaderboard import LastResult, LeaderboardResponse, LeaderboardRow, TierInfo
from app.services.common import add_gems, as_date, date_text, settle, today_for
from app.services.learner import LEADERBOARD_UNLOCK_LESSONS, leaderboard_unlocked

_EPOCH = datetime(2000, 1, 1, tzinfo=UTC)  # tie-break for members with no XP yet
_FINISHED_DAY_HOUR = 18  # a rival's XP for a finished day is dated 18:00 that day


@dataclass(frozen=True)
class Standings:
    cohort: LeagueCohort
    ranked: list[Ranked]
    users: dict[int, User]


def _week_bounds(user: User, now: datetime) -> tuple[date, datetime]:
    start = dates.week_start(today_for(user, now))
    ends_at = dates.local_midnight_utc(start + timedelta(days=7), user.timezone)
    return start, ends_at


def _cohort_days(cohort: LeagueCohort) -> tuple[date, date]:
    """The first and the last calendar day of the cohort's week."""
    week_start = as_date(cohort.week_start)
    assert week_start is not None
    return week_start, week_start + timedelta(days=6)


def _membership(db: Session, user: User, week_start: date) -> LeagueMembership | None:
    return db.scalar(
        select(LeagueMembership)
        .join(LeagueCohort, LeagueCohort.id == LeagueMembership.cohort_id)
        .where(
            LeagueMembership.user_id == user.id,
            LeagueCohort.week_start == date_text(week_start),
        )
    )


# --- rivals -------------------------------------------------------------------------------------


def _recruit_bots(
    db: Session, count: int, week_start: date, learner: User, joined_at: datetime
) -> list[User]:
    """Return ``count`` rivals who sit in no cohort in the week of ``week_start``.

    Existing rivals are reused first, oldest first, so a rival is never in two tables in the
    same week. Any still missing are created, numbered on from the rivals that already exist
    (``app.domain.rivals``), in ``learner``'s time zone and course.
    """
    if count <= 0:
        return []
    busy = (
        select(LeagueMembership.user_id)
        .join(LeagueCohort, LeagueCohort.id == LeagueMembership.cohort_id)
        .where(LeagueCohort.week_start == date_text(week_start))
    )
    bots = list(
        db.scalars(
            select(User)
            .where(User.is_bot.is_(True), User.id.not_in(busy))
            .order_by(User.id)
            .limit(count)
        ).all()
    )
    existing = db.scalar(select(func.count()).select_from(User).where(User.is_bot.is_(True))) or 0
    created = [
        User(
            username=recruit.username,
            display_name=recruit.display_name,
            avatar_color=recruit.avatar_color,
            timezone=learner.timezone,
            is_bot=True,
            bot_pace_xp=recruit.pace_xp,
            current_course_id=learner.current_course_id,
            created_at=joined_at,
        )
        for recruit in (rival(n) for n in range(existing, existing + count - len(bots)))
    ]
    db.add_all(created)
    db.flush()  # assigns the ids the memberships refer to
    return bots + created


def _materialise_bot_xp(db: Session, cohort: LeagueCohort, now: datetime) -> None:
    """Write each rival's XP for the days of the cohort's week that have started.

    Every amount is deterministic (``bot_day_xp``). A finished day gets its full amount; today's
    grows with the share of the day that has passed, so rivals keep moving. Days follow each
    rival's own time zone, so the result is the same whichever member is looking.
    """
    week_start, week_end = _cohort_days(cohort)
    bots = list(
        db.scalars(
            select(User)
            .join(LeagueMembership, LeagueMembership.user_id == User.id)
            .where(LeagueMembership.cohort_id == cohort.id, User.is_bot.is_(True))
            .order_by(User.id)
        ).all()
    )
    if not bots:
        return
    existing = {
        (event.user_id, as_date(event.local_date)): event
        for event in db.scalars(
            select(XpEvent).where(
                XpEvent.user_id.in_([bot.id for bot in bots]),
                XpEvent.source == "bot",
                XpEvent.local_date >= date_text(week_start),
                XpEvent.local_date <= date_text(week_end),
            )
        ).all()
    }
    for bot in bots:
        today = dates.local_date(now, bot.timezone)
        day = week_start
        while day <= min(today, week_end):
            midnight = dates.local_midnight_utc(day, bot.timezone)
            full = bot_day_xp(bot.id, bot.bot_pace_xp or 0, day)
            if day < today:
                amount = full
                earned_at = midnight + timedelta(hours=_FINISHED_DAY_HOUR)
            else:
                share = min(1.0, max(0.0, (now - midnight) / timedelta(days=1)))
                amount, earned_at = round(full * share), now
            event = existing.get((bot.id, day))
            if event is None and amount > 0:
                db.add(
                    XpEvent(
                        user_id=bot.id,
                        session_id=None,
                        source="bot",
                        amount=amount,
                        occurred_at=earned_at,
                        local_date=date_text(day),
                    )
                )
            elif event is not None and amount > event.amount:
                event.amount, event.occurred_at = amount, earned_at
            day += timedelta(days=1)
    db.flush()


# --- standings and finalisation ----------------------------------------------------------------


def _standings(db: Session, cohort: LeagueCohort) -> Standings:
    """Rank the cohort by the XP each member earned in its week, straight from the ledger."""
    week_start, week_end = _cohort_days(cohort)
    member_ids = list(
        db.scalars(select(LeagueMembership.user_id).where(LeagueMembership.cohort_id == cohort.id))
    )
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(member_ids))).all()}
    totals = {
        user_id: (int(xp or 0), reached)
        for user_id, xp, reached in db.execute(
            select(XpEvent.user_id, func.sum(XpEvent.amount), func.max(XpEvent.occurred_at))
            .where(
                XpEvent.user_id.in_(member_ids),
                XpEvent.local_date >= date_text(week_start),
                XpEvent.local_date <= date_text(week_end),
            )
            .group_by(XpEvent.user_id)
        ).all()
    }
    rows = []
    for user_id in member_ids:
        xp, reached = totals.get(user_id, (0, None))
        reached_at = reached if isinstance(reached, datetime) else _EPOCH
        rows.append(Standing(user_id=user_id, xp=xp, reached_at=reached_at))
    return Standings(cohort=cohort, ranked=rank_standings(rows, cohort.tier), users=users)


def _live_standings(db: Session, cohort: LeagueCohort, now: datetime) -> Standings:
    _materialise_bot_xp(db, cohort, now)
    return _standings(db, cohort)


def _finalise(db: Session, cohort: LeagueCohort, now: datetime) -> None:
    """Close a finished week once for every member: ranks, outcomes, prizes and next tiers.

    Rivals' XP is completed first, so the final table does not depend on when it was last read.
    Each prize carries a ``league:<week>`` reference, so it can never be paid twice.
    """
    if cohort.finalized_at is not None:
        return
    week_start, _ = _cohort_days(cohort)
    standings = _live_standings(db, cohort, now)
    size = len(standings.ranked)
    for row in standings.ranked:
        membership = db.get(LeagueMembership, (cohort.id, row.user_id))
        if membership is None:
            continue
        outcome = outcome_for(row.rank, cohort.tier, size)
        membership.final_rank, membership.outcome = row.rank, outcome
        member = standings.users[row.user_id]
        if member.is_bot or member.stats is None:
            continue  # rivals have no gems or tier to update
        prize = reward_gems(row.rank, cohort.tier)
        if prize:
            ref = f"league:{date_text(week_start)}"
            add_gems(db, member, prize, "league_reward", now, ref=ref)
        if row.rank <= 3:
            member.stats.top3_finishes += 1
        step = {"promoted": 1, "demoted": -1}.get(outcome, 0)
        member.stats.league_tier = max(0, min(len(TIERS) - 1, cohort.tier + step))
    cohort.finalized_at = now
    db.flush()


# --- forming and joining cohorts ---------------------------------------------------------------


def form_cohort(
    db: Session, tier: int, week_start: date, learners: Sequence[User], joined_at: datetime
) -> LeagueCohort:
    """Create the cohort for ``tier`` in the week of ``week_start``: the learners plus rivals."""
    if not 1 <= len(learners) <= COHORT_SIZE:
        raise ValueError(f"a cohort holds 1 to {COHORT_SIZE} learners, got {len(learners)}")
    get_tier(tier)  # reject an unknown tier before anything is written
    cohort = LeagueCohort(tier=tier, week_start=week_start)
    db.add(cohort)
    db.flush()  # assigns the cohort id
    rivals = _recruit_bots(db, COHORT_SIZE - len(learners), week_start, learners[0], joined_at)
    db.add_all(
        LeagueMembership(cohort_id=cohort.id, user_id=member.id, joined_at=joined_at)
        for member in (*learners, *rivals)
    )
    db.flush()
    return cohort


def _open_cohort(db: Session, tier: int, week_start: date) -> LeagueCohort | None:
    """The oldest unfinished cohort for ``tier`` and ``week_start`` that still has a rival."""
    has_rival = (
        select(LeagueMembership.cohort_id)
        .join(User, User.id == LeagueMembership.user_id)
        .where(LeagueMembership.cohort_id == LeagueCohort.id, User.is_bot.is_(True))
        .exists()
    )
    return db.scalar(
        select(LeagueCohort)
        .where(
            LeagueCohort.tier == tier,
            LeagueCohort.week_start == date_text(week_start),
            LeagueCohort.finalized_at.is_(None),
            has_rival,
        )
        .order_by(LeagueCohort.id)
        .limit(1)
    )


def _join(db: Session, learner: User, week_start: date, now: datetime) -> LeagueCohort:
    """Seat ``learner`` in the open cohort for their tier this week, or form a new one.

    The learner takes the seat of the rival lowest in the table, so the cohort stays at 30 and
    the race at the top is untouched.
    """
    tier = learner.stats.league_tier
    cohort = _open_cohort(db, tier, week_start)
    if cohort is None:
        return form_cohort(db, tier, week_start, [learner], now)
    standings = _live_standings(db, cohort, now)
    seat = next(
        row.user_id for row in reversed(standings.ranked) if standings.users[row.user_id].is_bot
    )
    rival_seat = db.get(LeagueMembership, (cohort.id, seat))
    assert rival_seat is not None
    db.delete(rival_seat)
    db.add(LeagueMembership(cohort_id=cohort.id, user_id=learner.id, joined_at=now))
    db.flush()
    return cohort


def ensure_cohort(db: Session, learner: User, now: datetime) -> LeagueCohort | None:
    """Return the learner's cohort for this week, or None while their leaderboard is locked.

    A learner without a cohort this week first has their earlier weeks finalised (which can
    change their tier), then joins a cohort for the tier they are now in.
    """
    if not leaderboard_unlocked(learner):
        return None
    week_start, _ = _week_bounds(learner, now)
    membership = _membership(db, learner, week_start)
    if membership is not None:
        cohort = db.get(LeagueCohort, membership.cohort_id)
        assert cohort is not None
        return cohort
    for old in db.scalars(
        select(LeagueCohort)
        .join(LeagueMembership, LeagueMembership.cohort_id == LeagueCohort.id)
        .where(
            LeagueMembership.user_id == learner.id,
            LeagueCohort.finalized_at.is_(None),
            LeagueCohort.week_start < date_text(week_start),
        )
        .order_by(LeagueCohort.week_start)
    ).all():
        _finalise(db, old, now)
    return _join(db, learner, week_start, now)


def learner_rank(db: Session, learner: User, now: datetime) -> tuple[int, int | None]:
    """Return the learner's league tier and live rank; no rank while leagues are locked."""
    cohort = ensure_cohort(db, learner, now)
    if cohort is None:
        return learner.stats.league_tier, None
    standings = _live_standings(db, cohort, now)
    rank = next((r.rank for r in standings.ranked if r.user_id == learner.id), None)
    return cohort.tier, rank


def get_leaderboard(db: Session, now: datetime, user: User) -> LeaderboardResponse:
    settle(db, user, now)
    cohort = ensure_cohort(db, user, now)
    tier = get_tier(cohort.tier if cohort is not None else user.stats.league_tier)
    week_start, ends_at = _week_bounds(user, now)

    last = db.scalar(
        select(LeagueMembership)
        .join(LeagueCohort, LeagueCohort.id == LeagueMembership.cohort_id)
        .where(
            LeagueMembership.user_id == user.id,
            LeagueCohort.finalized_at.is_not(None),
            LeagueMembership.result_seen.is_(False),
        )
        .order_by(LeagueCohort.week_start.desc())
    )
    last_result: LastResult | None = None
    if last is not None and last.final_rank is not None and last.outcome is not None:
        old = db.get(LeagueCohort, last.cohort_id)
        assert old is not None
        last_result = LastResult(
            tier_before=old.tier,
            tier_after=tier.tier,
            outcome=last.outcome,
            rank=last.final_rank,
            gems=reward_gems(last.final_rank, old.tier),
        )
        last.result_seen = True

    rows: list[LeaderboardRow] = []
    if cohort is not None:
        standings = _live_standings(db, cohort, now)
        rows = [
            LeaderboardRow(
                rank=row.rank,
                user_id=row.user_id,
                display_name=standings.users[row.user_id].display_name,
                avatar_color=standings.users[row.user_id].avatar_color,
                xp=row.xp,
                is_me=row.user_id == user.id,
                zone=row.zone,
            )
            for row in standings.ranked
        ]
    response = LeaderboardResponse(
        unlocked=cohort is not None,
        lessons_to_unlock=max(0, LEADERBOARD_UNLOCK_LESSONS - user.stats.lessons_completed),
        tier=tier.tier,
        name=tier.name,
        tiers=[TierInfo(tier=t.tier, name=t.name, color=t.color) for t in TIERS],
        week_start=date_text(week_start),
        ends_at=ends_at,
        promote_count=tier.promote,
        demote_count=tier.demote,
        rows=rows,
        last_result=last_result,
        server_now=now,
    )
    db.commit()
    return response
