"""The four sample learners, each at a different stage of the course.

Anyone can log in as any of them from the login page (docs/adr/0003). Their histories are
relative to "now", so a fresh seed or a demo reset always tells the same story:

- Parth Biyani (@parthbiyani) joined 50 days ago and kept a 21-day streak, took a break, and is
  now on a 12-day streak that last grew yesterday: 1,240 XP, unit 1 complete with Greetings at
  Legendary, the first lesson of unit 2 done, Silver league, 500 gems.
- Zoe Fernandes (@zoefernandes) signed up last night and has not started: no XP, no streak,
  the leaderboard still locked and a small welcome balance of gems.
- Isha Nair (@ishanair) is a week and a half in, halfway through unit 1: 205 XP, a 4-day
  streak, Bronze league.
- Kabir Malhotra (@kabirmalhotra) has practised for three months and is deep in unit 3:
  4,120 XP, a 64-day streak, Gold league, two skills at Legendary and two streak freezes.
"""

from app.seed.learner import LearnerProfile, Podium, spread_xp

PARTH = LearnerProfile(
    username="parthbiyani",
    display_name="Parth Biyani",
    avatar_color="#1CB0F6",
    daily_goal_xp=20,
    gems=500,
    # A 21-day streak that ended, 17 days without practice, then the current 12-day streak up
    # to yesterday: 785 + 455 = 1,240 XP. The 85 XP day ends with Greetings' Legendary.
    streaks=(
        (25, 37, 41, 38, 35, 42, 32, 46, 32, 15, 38, 40, 85, 37, 44, 36, 17, 33, 40, 36, 36),
        (34, 41, 26, 45, 38, 30, 44, 36, 25, 47, 33, 56),
    ),
    gaps=(17,),
    path_lessons=14,  # unit 1 (13 lessons) and the first lesson of unit 2, done yesterday
    legendary=((13, 0),),
    streak_freezes=1,
    league_tier=1,  # Silver since the end of the first week
    promotions=(0,),
    podiums=(Podium(week=0, rank=2, tier=0), Podium(week=-1, rank=1, tier=0)),
)

ZOE = LearnerProfile(
    username="zoefernandes",
    display_name="Zoe Fernandes",
    avatar_color="#FF9600",
    daily_goal_xp=10,
    gems=50,
)

ISHA = LearnerProfile(
    username="ishanair",
    display_name="Isha Nair",
    avatar_color="#CE82FF",
    daily_goal_xp=10,
    gems=320,
    # A 3-day start, two days off, then a 4-day streak up to yesterday: 75 + 130 = 205 XP.
    streaks=((25, 30, 20), (35, 30, 25, 40)),
    gaps=(2,),
    path_lessons=7,  # the first two skills and their chest, then one lesson of the third
)

# Kabir's 93 days: a 26-day streak, three days off, then 64 days in a row. The big days are
# the Legendary challenges, on day 9 (Greetings) and day 60 (the first skill of unit 2).
_KABIR_PAST = spread_xp(26, 1_000, "kabir-past", fixed={8: 95})
_KABIR_CURRENT = spread_xp(64, 3_120, "kabir-current", fixed={33: 100})

KABIR = LearnerProfile(
    username="kabirmalhotra",
    display_name="Kabir Malhotra",
    avatar_color="#FF4B4B",
    daily_goal_xp=30,
    gems=950,
    streaks=(_KABIR_PAST, _KABIR_CURRENT),
    gaps=(3,),
    path_lessons=34,  # units 1 and 2, then unit 3's first two skills, its chest and 2 lessons
    legendary=((9, 0), (60, 4)),
    streak_freezes=2,
    league_tier=2,  # Gold: promoted out of Bronze in week 1 and out of Silver in week 4
    promotions=(0, 3),
    podiums=(
        Podium(week=0, rank=1, tier=0),
        Podium(week=3, rank=2, tier=1),
        Podium(week=-1, rank=3, tier=2),
    ),
)

LEARNERS: tuple[LearnerProfile, ...] = (PARTH, ZOE, ISHA, KABIR)
"""Every sample learner, in the order the login page lists them."""
