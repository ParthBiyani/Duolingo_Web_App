"""Dependencies shared by every route: database session, clock and the current learner."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import Clock, get_clock
from app.core.db import get_db
from app.core.errors import AppError
from app.models import User

DEFAULT_USERNAME = "parthbiyani"

DbSession = Annotated[Session, Depends(get_db)]
ClockDep = Annotated[Clock, Depends(get_clock)]


def get_current_user(db: DbSession) -> User:
    """Resolve the signed-in learner.

    Authentication is simplified to a single default learner (see docs/adr/0003). This is the
    only place that decides who the learner is, so real authentication can replace it later
    without touching any route or service.
    """
    user = db.scalar(select(User).where(User.username == DEFAULT_USERNAME))
    if user is None:
        raise AppError(503, "not_seeded", "Not ready", "The database has not been seeded yet.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
