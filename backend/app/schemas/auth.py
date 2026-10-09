from pydantic import Field

from app.schemas.common import ApiModel


class SampleLearner(ApiModel):
    """A sample learner as the login page shows it."""

    username: str
    display_name: str
    avatar_color: str
    initials: str
    xp_total: int
    streak: int
    unit_number: int
    unit_title: str
    league_name: str


class LoginRequest(ApiModel):
    username: str = Field(min_length=3, max_length=30)
