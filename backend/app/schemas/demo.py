from datetime import datetime

from pydantic import Field

from app.schemas.common import ApiModel


class ClockResponse(ApiModel):
    now: datetime
    offset_seconds: int


class ClockAdvance(ApiModel):
    seconds: int = Field(ge=1, le=60 * 60 * 24 * 30)


class HealthResponse(ApiModel):
    status: str
    db: str
    seeded: bool
    version: str
