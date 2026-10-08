"""Initial schema: the 23 tables for content, learners, sessions, ledgers and leagues.

Created by Alembic autogenerate, then reviewed: every CHECK constraint, the explicit
ON DELETE rules, the foreign-key indexes and both partial unique indexes are present.

Revision ID: 0001
Revises:
Create Date: 2026-10-09 02:12:58.968871+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("metric", sa.Text(), nullable=False),
        sa.Column("thresholds", sa.Text(), nullable=False),
        sa.Column("gems_per_level", sa.Integer(), server_default=sa.text("25"), nullable=False),
        sa.Column("color", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "metric IN ('streak', 'xp_total', 'perfect_lessons', 'league_tier', 'daily_xp', 'legendary_skills')",
            name=op.f("ck_achievements_metric"),
        ),
        sa.CheckConstraint("json_valid(thresholds)", name=op.f("ck_achievements_thresholds_json")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_achievements")),
        sa.UniqueConstraint("key", name=op.f("uq_achievements_key")),
        sa.UniqueConstraint("position", name=op.f("uq_achievements_position")),
    )
    op.create_table(
        "app_settings",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_app_settings")),
    )
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("learning_language", sa.Text(), nullable=False),
        sa.Column("from_language", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("is_available", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.CheckConstraint("is_available IN (0, 1)", name=op.f("ck_courses_is_available_bool")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_courses")),
        sa.UniqueConstraint("slug", name=op.f("uq_courses_slug")),
    )
    op.create_table(
        "leagues",
        sa.Column("tier", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("color", sa.Text(), nullable=False),
        sa.Column("promote_count", sa.Integer(), nullable=False),
        sa.Column("demote_count", sa.Integer(), nullable=False),
        sa.Column("reward_gems", sa.Text(), nullable=False),
        sa.CheckConstraint("json_valid(reward_gems)", name=op.f("ck_leagues_reward_gems_json")),
        sa.CheckConstraint("tier BETWEEN 0 AND 9", name=op.f("ck_leagues_tier_range")),
        sa.PrimaryKeyConstraint("tier", name=op.f("pk_leagues")),
        sa.UniqueConstraint("name", name=op.f("uq_leagues_name")),
    )
    op.create_table(
        "shop_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("price_gems", sa.Integer(), nullable=True),
        sa.Column("in_lesson_price_gems", sa.Integer(), nullable=True),
        sa.Column("is_available", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.CheckConstraint("is_available IN (0, 1)", name=op.f("ck_shop_items_is_available_bool")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_shop_items")),
        sa.UniqueConstraint("key", name=op.f("uq_shop_items_key")),
    )
    op.create_table(
        "league_cohorts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tier", sa.Integer(), nullable=False),
        sa.Column("week_start", sa.Text(), nullable=False),
        sa.Column("finalized_at", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["tier"],
            ["leagues.tier"],
            name=op.f("fk_league_cohorts_tier_leagues"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_league_cohorts")),
    )
    with op.batch_alter_table("league_cohorts", schema=None) as batch_op:
        batch_op.create_index("ix_cohorts_week", ["week_start", "tier"], unique=False)
        batch_op.create_index(batch_op.f("ix_league_cohorts_tier"), ["tier"], unique=False)

    op.create_table(
        "units",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("section", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("color", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "color IN ('green', 'purple', 'blue', 'orange', 'red')", name=op.f("ck_units_color")
        ),
        sa.CheckConstraint("position >= 1", name=op.f("ck_units_position_min")),
        sa.CheckConstraint("section >= 1", name=op.f("ck_units_section_min")),
        sa.ForeignKeyConstraint(
            ["course_id"],
            ["courses.id"],
            name=op.f("fk_units_course_id_courses"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_units")),
        sa.UniqueConstraint("course_id", "position", name=op.f("uq_units_course_id_position")),
        sa.UniqueConstraint("slug", name=op.f("uq_units_slug")),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("avatar_color", sa.Text(), nullable=False),
        sa.Column("timezone", sa.Text(), server_default="UTC", nullable=False),
        sa.Column("is_bot", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("bot_pace_xp", sa.Integer(), nullable=True),
        sa.Column("current_course_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "(is_bot = 1) = (bot_pace_xp IS NOT NULL)", name=op.f("ck_users_bot_pace_for_bots")
        ),
        sa.CheckConstraint("is_bot IN (0, 1)", name=op.f("ck_users_is_bot_bool")),
        sa.CheckConstraint(
            "length(username) BETWEEN 3 AND 30", name=op.f("ck_users_username_length")
        ),
        sa.ForeignKeyConstraint(
            ["current_course_id"],
            ["courses.id"],
            name=op.f("fk_users_current_course_id_courses"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("username", name=op.f("uq_users_username")),
    )
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_users_current_course_id"), ["current_course_id"], unique=False
        )

    op.create_table(
        "daily_activity",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("local_date", sa.Text(), nullable=False),
        sa.Column("xp", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("sessions_completed", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("goal_xp", sa.Integer(), nullable=False),
        sa.Column("goal_met_at", sa.Text(), nullable=True),
        sa.Column("streak_status", sa.Text(), server_default="none", nullable=False),
        sa.CheckConstraint(
            "streak_status IN ('none', 'extended', 'frozen')",
            name=op.f("ck_daily_activity_streak_status"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_daily_activity_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "local_date", name=op.f("pk_daily_activity")),
    )
    op.create_table(
        "gem_transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("ref", sa.Text(), nullable=True),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "reason IN ('seed', 'goal_chest', 'path_chest', 'achievement', 'league_reward', 'heart_refill', 'streak_freeze', 'legendary_entry')",
            name=op.f("ck_gem_transactions_reason"),
        ),
        sa.CheckConstraint(
            "balance_after >= 0", name=op.f("ck_gem_transactions_balance_after_min")
        ),
        sa.CheckConstraint("delta <> 0", name=op.f("ck_gem_transactions_delta_nonzero")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_gem_transactions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gem_transactions")),
    )
    with op.batch_alter_table("gem_transactions", schema=None) as batch_op:
        batch_op.create_index("ix_gem_user_time", ["user_id", "created_at"], unique=False)
        batch_op.create_index(
            "ux_gem_once",
            ["user_id", "reason", "ref"],
            unique=True,
            sqlite_where=sa.text("ref IS NOT NULL"),
        )

    op.create_table(
        "league_memberships",
        sa.Column("cohort_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("joined_at", sa.Text(), nullable=False),
        sa.Column("final_rank", sa.Integer(), nullable=True),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column("result_seen", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.CheckConstraint(
            "outcome IN ('promoted', 'stayed', 'demoted')",
            name=op.f("ck_league_memberships_outcome"),
        ),
        sa.CheckConstraint(
            "result_seen IN (0, 1)", name=op.f("ck_league_memberships_result_seen_bool")
        ),
        sa.ForeignKeyConstraint(
            ["cohort_id"],
            ["league_cohorts.id"],
            name=op.f("fk_league_memberships_cohort_id_league_cohorts"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_league_memberships_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("cohort_id", "user_id", name=op.f("pk_league_memberships")),
    )
    with op.batch_alter_table("league_memberships", schema=None) as batch_op:
        batch_op.create_index("ix_memberships_user", ["user_id"], unique=False)

    op.create_table(
        "skills",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("unit_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("icon", sa.Text(), nullable=False),
        sa.Column("chest_gems", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "(type = 'chest') = (chest_gems IS NOT NULL)",
            name=op.f("ck_skills_chest_gems_for_chests"),
        ),
        sa.CheckConstraint(
            "type IN ('lesson', 'chest', 'practice', 'unit_review')", name=op.f("ck_skills_type")
        ),
        sa.CheckConstraint(
            "chest_gems IS NULL OR chest_gems > 0", name=op.f("ck_skills_chest_gems_positive")
        ),
        sa.CheckConstraint("position >= 1", name=op.f("ck_skills_position_min")),
        sa.ForeignKeyConstraint(
            ["unit_id"], ["units.id"], name=op.f("fk_skills_unit_id_units"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_skills")),
        sa.UniqueConstraint("slug", name=op.f("uq_skills_slug")),
        sa.UniqueConstraint("unit_id", "position", name=op.f("uq_skills_unit_id_position")),
    )
    op.create_table(
        "user_achievements",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("achievement_id", sa.Integer(), nullable=False),
        sa.Column("level", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("progress", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["achievement_id"],
            ["achievements.id"],
            name=op.f("fk_user_achievements_achievement_id_achievements"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_user_achievements_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "achievement_id", name=op.f("pk_user_achievements")),
    )
    with op.batch_alter_table("user_achievements", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_user_achievements_achievement_id"), ["achievement_id"], unique=False
        )

    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("sound_effects", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.Column("animations", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "motivational_messages", sa.Boolean(), server_default=sa.text("1"), nullable=False
        ),
        sa.Column("listening_exercises", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.Column("theme", sa.Text(), server_default="system", nullable=False),
        sa.Column("daily_goal_xp", sa.Integer(), server_default=sa.text("20"), nullable=False),
        sa.CheckConstraint(
            "theme IN ('system', 'light', 'dark')", name=op.f("ck_user_settings_theme")
        ),
        sa.CheckConstraint("animations IN (0, 1)", name=op.f("ck_user_settings_animations_bool")),
        sa.CheckConstraint(
            "daily_goal_xp IN (1, 10, 20, 30, 50)", name=op.f("ck_user_settings_daily_goal_xp")
        ),
        sa.CheckConstraint(
            "listening_exercises IN (0, 1)", name=op.f("ck_user_settings_listening_exercises_bool")
        ),
        sa.CheckConstraint(
            "motivational_messages IN (0, 1)",
            name=op.f("ck_user_settings_motivational_messages_bool"),
        ),
        sa.CheckConstraint(
            "sound_effects IN (0, 1)", name=op.f("ck_user_settings_sound_effects_bool")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_user_settings_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_user_settings")),
    )
    op.create_table(
        "user_stats",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("xp_total", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("gems", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("hearts", sa.Integer(), server_default=sa.text("5"), nullable=False),
        sa.Column("hearts_anchor_at", sa.Text(), nullable=True),
        sa.Column("streak_current", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("streak_longest", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("streak_last_date", sa.Text(), nullable=True),
        sa.Column("streak_freezes", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("lessons_completed", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("perfect_lessons", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("legendary_skills", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("top3_finishes", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("league_tier", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.CheckConstraint(
            "(hearts = 5) = (hearts_anchor_at IS NULL)", name=op.f("ck_user_stats_hearts_anchor")
        ),
        sa.CheckConstraint("gems >= 0", name=op.f("ck_user_stats_gems_min")),
        sa.CheckConstraint("hearts BETWEEN 0 AND 5", name=op.f("ck_user_stats_hearts_range")),
        sa.CheckConstraint("streak_current >= 0", name=op.f("ck_user_stats_streak_current_min")),
        sa.CheckConstraint(
            "streak_freezes BETWEEN 0 AND 2", name=op.f("ck_user_stats_streak_freezes_range")
        ),
        sa.CheckConstraint("xp_total >= 0", name=op.f("ck_user_stats_xp_total_min")),
        sa.ForeignKeyConstraint(
            ["league_tier"],
            ["leagues.tier"],
            name=op.f("fk_user_stats_league_tier_leagues"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_user_stats_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_user_stats")),
    )
    with op.batch_alter_table("user_stats", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_user_stats_league_tier"), ["league_tier"], unique=False
        )

    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.CheckConstraint("position >= 1", name=op.f("ck_lessons_position_min")),
        sa.ForeignKeyConstraint(
            ["skill_id"], ["skills.id"], name=op.f("fk_lessons_skill_id_skills"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_lessons")),
        sa.UniqueConstraint("skill_id", "position", name=op.f("uq_lessons_skill_id_position")),
        sa.UniqueConstraint("slug", name=op.f("uq_lessons_slug")),
    )
    op.create_table(
        "skill_progress",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=False),
        sa.Column("lessons_completed", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("crown_level", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("completed_at", sa.Text(), nullable=True),
        sa.Column("legendary_at", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "crown_level BETWEEN 0 AND 2", name=op.f("ck_skill_progress_crown_level_range")
        ),
        sa.CheckConstraint(
            "lessons_completed >= 0", name=op.f("ck_skill_progress_lessons_completed_min")
        ),
        sa.ForeignKeyConstraint(
            ["skill_id"],
            ["skills.id"],
            name=op.f("fk_skill_progress_skill_id_skills"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_skill_progress_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "skill_id", name=op.f("pk_skill_progress")),
    )
    with op.batch_alter_table("skill_progress", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_skill_progress_skill_id"), ["skill_id"], unique=False)

    op.create_table(
        "exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=True),
        sa.Column("source_lang", sa.Text(), nullable=True),
        sa.Column("tts_text", sa.Text(), nullable=True),
        sa.Column("is_new_word", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.CheckConstraint("source_lang IN ('es', 'en')", name=op.f("ck_exercises_source_lang")),
        sa.CheckConstraint(
            "type IN ('multiple_choice', 'image_choice', 'translate_word_bank', 'match_pairs', 'fill_blank', 'type_answer', 'listen_type', 'speak')",
            name=op.f("ck_exercises_type"),
        ),
        sa.CheckConstraint("is_new_word IN (0, 1)", name=op.f("ck_exercises_is_new_word_bool")),
        sa.CheckConstraint("position >= 1", name=op.f("ck_exercises_position_min")),
        sa.ForeignKeyConstraint(
            ["lesson_id"],
            ["lessons.id"],
            name=op.f("fk_exercises_lesson_id_lessons"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_exercises")),
        sa.UniqueConstraint("lesson_id", "position", name=op.f("uq_exercises_lesson_id_position")),
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=True),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.Text(), server_default="active", nullable=False),
        sa.Column("plan", sa.Text(), nullable=False),
        sa.Column("mistakes", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("hearts_lost", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("started_at", sa.Text(), nullable=False),
        sa.Column("ended_at", sa.Text(), nullable=True),
        sa.Column("result", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "kind IN ('lesson', 'practice', 'review', 'legendary', 'timed')",
            name=op.f("ck_sessions_kind"),
        ),
        sa.CheckConstraint(
            "status IN ('active', 'completed', 'failed', 'abandoned')",
            name=op.f("ck_sessions_status"),
        ),
        sa.CheckConstraint("json_valid(plan)", name=op.f("ck_sessions_plan_json")),
        sa.CheckConstraint("length(id) = 36", name=op.f("ck_sessions_id_length")),
        sa.CheckConstraint(
            "result IS NULL OR json_valid(result)", name=op.f("ck_sessions_result_json")
        ),
        sa.ForeignKeyConstraint(
            ["lesson_id"],
            ["lessons.id"],
            name=op.f("fk_sessions_lesson_id_lessons"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["skill_id"],
            ["skills.id"],
            name=op.f("fk_sessions_skill_id_skills"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_sessions_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sessions")),
    )
    with op.batch_alter_table("sessions", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_sessions_lesson_id"), ["lesson_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_sessions_skill_id"), ["skill_id"], unique=False)
        batch_op.create_index("ix_sessions_user_started", ["user_id", "started_at"], unique=False)

    op.create_table(
        "exercise_answers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_canonical", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.CheckConstraint(
            "is_canonical IN (0, 1)", name=op.f("ck_exercise_answers_is_canonical_bool")
        ),
        sa.ForeignKeyConstraint(
            ["exercise_id"],
            ["exercises.id"],
            name=op.f("fk_exercise_answers_exercise_id_exercises"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_exercise_answers")),
        sa.UniqueConstraint(
            "exercise_id", "text", name=op.f("uq_exercise_answers_exercise_id_text")
        ),
    )
    op.create_table(
        "exercise_options",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("image_key", sa.Text(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("pair_key", sa.Integer(), nullable=True),
        sa.Column("answer_position", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "role IN ('choice', 'tile', 'pair_left', 'pair_right')",
            name=op.f("ck_exercise_options_role"),
        ),
        sa.CheckConstraint(
            "is_correct IN (0, 1)", name=op.f("ck_exercise_options_is_correct_bool")
        ),
        sa.CheckConstraint("position >= 0", name=op.f("ck_exercise_options_position_min")),
        sa.ForeignKeyConstraint(
            ["exercise_id"],
            ["exercises.id"],
            name=op.f("fk_exercise_options_exercise_id_exercises"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_exercise_options")),
        sa.UniqueConstraint(
            "exercise_id",
            "role",
            "position",
            name=op.f("uq_exercise_options_exercise_id_role_position"),
        ),
    )
    op.create_table(
        "session_answers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Text(), nullable=False),
        sa.Column("answer_id", sa.Text(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("outcome", sa.Text(), nullable=False),
        sa.Column("answered_at", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "outcome IN ('correct', 'typo', 'incorrect', 'skipped')",
            name=op.f("ck_session_answers_outcome"),
        ),
        sa.CheckConstraint("json_valid(answer)", name=op.f("ck_session_answers_answer_json")),
        sa.ForeignKeyConstraint(
            ["exercise_id"],
            ["exercises.id"],
            name=op.f("fk_session_answers_exercise_id_exercises"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["sessions.id"],
            name=op.f("fk_session_answers_session_id_sessions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_session_answers")),
        sa.UniqueConstraint(
            "session_id", "answer_id", name=op.f("uq_session_answers_session_id_answer_id")
        ),
    )
    with op.batch_alter_table("session_answers", schema=None) as batch_op:
        batch_op.create_index(
            "ix_session_answers_exercise", ["session_id", "exercise_id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_session_answers_exercise_id"), ["exercise_id"], unique=False
        )

    op.create_table(
        "xp_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("occurred_at", sa.Text(), nullable=False),
        sa.Column("local_date", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "source IN ('lesson', 'practice', 'review', 'legendary', 'timed', 'bot')",
            name=op.f("ck_xp_events_source"),
        ),
        sa.CheckConstraint("amount > 0", name=op.f("ck_xp_events_amount_positive")),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["sessions.id"],
            name=op.f("fk_xp_events_session_id_sessions"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_xp_events_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_xp_events")),
        sa.UniqueConstraint("session_id", name=op.f("uq_xp_events_session_id")),
    )
    with op.batch_alter_table("xp_events", schema=None) as batch_op:
        batch_op.create_index("ix_xp_events_user_date", ["user_id", "local_date"], unique=False)
        batch_op.create_index(
            "ux_xp_events_bot_day",
            ["user_id", "local_date"],
            unique=True,
            sqlite_where=sa.text("source = 'bot'"),
        )


def downgrade() -> None:
    with op.batch_alter_table("xp_events", schema=None) as batch_op:
        batch_op.drop_index("ux_xp_events_bot_day", sqlite_where=sa.text("source = 'bot'"))
        batch_op.drop_index("ix_xp_events_user_date")

    op.drop_table("xp_events")
    with op.batch_alter_table("session_answers", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_session_answers_exercise_id"))
        batch_op.drop_index("ix_session_answers_exercise")

    op.drop_table("session_answers")
    op.drop_table("exercise_options")
    op.drop_table("exercise_answers")
    with op.batch_alter_table("sessions", schema=None) as batch_op:
        batch_op.drop_index("ix_sessions_user_started")
        batch_op.drop_index(batch_op.f("ix_sessions_skill_id"))
        batch_op.drop_index(batch_op.f("ix_sessions_lesson_id"))

    op.drop_table("sessions")
    op.drop_table("exercises")
    with op.batch_alter_table("skill_progress", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_skill_progress_skill_id"))

    op.drop_table("skill_progress")
    op.drop_table("lessons")
    with op.batch_alter_table("user_stats", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_user_stats_league_tier"))

    op.drop_table("user_stats")
    op.drop_table("user_settings")
    with op.batch_alter_table("user_achievements", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_user_achievements_achievement_id"))

    op.drop_table("user_achievements")
    op.drop_table("skills")
    with op.batch_alter_table("league_memberships", schema=None) as batch_op:
        batch_op.drop_index("ix_memberships_user")

    op.drop_table("league_memberships")
    with op.batch_alter_table("gem_transactions", schema=None) as batch_op:
        batch_op.drop_index("ux_gem_once", sqlite_where=sa.text("ref IS NOT NULL"))
        batch_op.drop_index("ix_gem_user_time")

    op.drop_table("gem_transactions")
    op.drop_table("daily_activity")
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_users_current_course_id"))

    op.drop_table("users")
    op.drop_table("units")
    with op.batch_alter_table("league_cohorts", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_league_cohorts_tier"))
        batch_op.drop_index("ix_cohorts_week")

    op.drop_table("league_cohorts")
    op.drop_table("shop_items")
    op.drop_table("leagues")
    op.drop_table("courses")
    op.drop_table("app_settings")
    op.drop_table("achievements")
