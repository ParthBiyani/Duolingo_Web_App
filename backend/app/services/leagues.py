"""Weekly leagues: cohorts of 30, lazily materialised rival XP and lazy week finalisation."""

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain import dates
from app.domain.leagues import (
    TIERS,
    Ranked,
    Standing,
    bot_day_xp,
    get_tier,
    outcome_for,
    rank_standings,
    reward_gems,
)
from app.models import LeagueCohort, LeagueMembership, User, XpEvent
from app.schemas.leaderboard import LastResult, LeaderboardResponse, LeaderboardRow, TierInfo
from app.services.common import add_gems, as_date, date_text, settle, today_for
from app.services.learner import LEADERBOARD_UNLOCK_LESSONS, leaderboard_unlocked

_EPOCH = datetime(2000, 1, 1, tzinfo=UTC)  # tie-break for members with no XP yet


@dataclass(frozen=True)
class Standings:
    cohort: LeagueCohort
    ranked: list[Ranked]
    users: dict[int, User]


def _week_bounds(user: User, now: datetime) -> tuple[date, datetime]:
    start = dates.week_start(today_for(user, now))
    ends_at = dates.local_midnight_utc(start + timedelta(days=7), user.timezone)
    return start, ends_at


def _membership(db: Session, user: User, week_start: date) -> LeagueMembership | None:
    return db.scalar(
        select(LeagueMembership)
        .join(LeagueCohort, LeagueCohort.id == LeagueMembership.cohort_id)
        .where(
            LeagueMembership.user_id == user.id,
            LeagueCohort.week_start == date_text(week_start),
        )
    )


def _bots(db: Session) -> list[User]:
    return list(db.scalars(select(User).where(User.is_bot.is_(True)).order_by(User.id)).all())


def _materialise_bot_xp(db: Session, cohort: LeagueCohort, learner: User, now: datetime) -> None:
    """Write each rival's XP for the days of this week that have started (deterministic).

    Today's amount grows with the share of the day that has passed, so rivals keep moving.
    """
    week_start = as_date(cohort.week_start)
    assert week_start is not None
    today = today_for(learner, now)
    day_start = dates.local_midnight_utc(today, learner.timezone)
    share_of_today = min(1.0, max(0.0, (now - day_start) / timedelta(days=1)))
    members = db.scalars(
        select(User)
        .join(LeagueMembership, LeagueMembership.user_id == User.id)
        .where(LeagueMembership.cohort_id == cohort.id, User.is_bot.is_(True))
    ).all()
    for bot in members:
        existing = {
            as_date(event.local_date): event
            for event in db.scalars(
                select(XpEvent).where(
                    XpEvent.user_id == bot.id,
                    XpEvent.source == "bot",
                    XpEvent.local_date >= date_text(week_start),
                    XpEvent.local_date <= date_text(today),
                )
            ).all()
        }
        day = week_start
        while day <= today:
            full = bot_day_xp(bot.id, bot.bot_pace_xp or 0, day)
            amount = full if day < today else round(full * share_of_today)
            earned_at = dates.local_midnight_utc(day, learner.timezone) + timedelta(
                hours=18 if day < today else 0
            )
            event = existing.get(day)
            if event is None and amount > 0:
                db.add(
                    XpEvent(
                        user_id=bot.id,
                        session_id=None,
                        source="bot",
                        amount=amount,
                        occurred_at=min(earned_at, now) if day == today else earned_at,
                        local_date=date_text(day),
                    )
                )
                if bot.stats is not None:  # rivals may have no cached totals
                    bot.stats.xp_total += amount
            elif event is not None and amount > event.amount:
                if bot.stats is not None:
                    bot.stats.xp_total += amount - event.amount
                event.amount = amount
                event.occurred_at = now
            day += timedelta(days=1)
    db.flush()


def _standings(db: Session, cohort: LeagueCohort) -> Standings:
    week_start = as_date(cohort.week_start)
    assert week_start is not None
    week_end = week_start + timedelta(days=6)
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


def _finalise(db: Session, learner: User, cohort: LeagueCohort, now: datetime) -> None:
    """Close a finished week once: final ranks, outcomes, prizes and the learner's next tier."""
    standings = _standings(db, cohort)
    size = len(standings.ranked)
    for row in standings.ranked:
        membership = db.get(LeagueMembership, (cohort.id, row.user_id))
        if membership is None:
            continue
        membership.final_rank = row.rank
        membership.outcome = outcome_for(row.rank, cohort.tier, size)
        if row.user_id == learner.id:
            prize = reward_gems(row.rank, cohort.tier)
            if prize:
                add_gems(
                    db, learner, prize, "league_reward", now, ref=f"league:{cohort.week_start}"
                )
            if row.rank <= 3:
                learner.stats.top3_finishes += 1
            step = {"promoted": 1, "demoted": -1}.get(membership.outcome, 0)
            learner.stats.league_tier = max(0, min(len(TIERS) - 1, cohort.tier + step))
    cohort.finalized_at = now


def ensure_cohort(db: Session, learner: User, now: datetime) -> LeagueCohort:
    """Return this week's cohort, finalising last week and forming a new group when needed."""
    week_start, _ = _week_bounds(learner, now)
    membership = _membership(db, learner, week_start)
    if membership is not None:
        cohort = db.get(LeagueCohort, membership.cohort_id)
        assert cohort is not None
        return cohort
    for old in db.scalars(
        select(LeagueCohort)
        .join(LeagueMembership, LeagueMembership.cohort_id == LeagueCohort.id)
        .where(LeagueMembership.user_id == learner.id, LeagueCohort.finalized_at.is_(None))
    ).all():
        _finalise(db, learner, old, now)
    cohort = LeagueCohort(tier=learner.stats.league_tier, week_start=date_text(week_start))
    db.add(cohort)
    db.flush()
    db.add(LeagueMembership(cohort_id=cohort.id, user_id=learner.id, joined_at=now))
    for bot in _bots(db)[:29]:
        db.add(LeagueMembership(cohort_id=cohort.id, user_id=bot.id, joined_at=now))
    db.flush()
    return cohort


def learner_rank(db: Session, learner: User, now: datetime) -> tuple[LeagueCohort, int | None]:
    cohort = ensure_cohort(db, learner, now)
    _materialise_bot_xp(db, cohort, learner, now)
    standings = _standings(db, cohort)
    rank = next((r.rank for r in standings.ranked if r.user_id == learner.id), None)
    return cohort, rank


def get_leaderboard(db: Session, now: datetime, user: User) -> LeaderboardResponse:
    settle(db, user, now)
    cohort = ensure_cohort(db, user, now)
    _materialise_bot_xp(db, cohort, user, now)
    standings = _standings(db, cohort)
    tier = get_tier(cohort.tier)
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
            tier_after=cohort.tier,
            outcome=last.outcome,
            rank=last.final_rank,
            gems=reward_gems(last.final_rank, old.tier),
        )
        last.result_seen = True

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
        unlocked=leaderboard_unlocked(user),
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
