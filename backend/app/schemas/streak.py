from app.schemas.common import ApiModel, DayStatus


class CalendarDay(ApiModel):
    date: str
    status: DayStatus


class StreakGoalView(ApiModel):
    start: int
    target: int


class StreakCalendarResponse(ApiModel):
    month: str  # YYYY-MM
    today: str
    first_month: str  # the month the learner joined; earlier months have no history
    current: int
    longest: int
    extended_today: bool
    freezes: int
    goal: StreakGoalView
    days: list[CalendarDay]
