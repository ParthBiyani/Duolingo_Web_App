"""Dependencies shared by every route: database session, clock, settings and the learner."""

from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import Clock, get_clock
from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import SESSION_COOKIE, read_session
from app.models import User

DbSession = Annotated[Session, Depends(get_db)]
ClockDep = Annotated[Clock, Depends(get_clock)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
SessionToken = Annotated[str | None, Cookie(alias=SESSION_COOKIE, include_in_schema=False)]


def get_current_user(db: DbSession, settings: SettingsDep, token: SessionToken = None) -> User:
    """Resolve the signed-in learner from the session cookie, or answer 401.

    The cookie is set by ``POST /api/v1/auth/login`` (docs/adr/0003). This is the only place
    that decides who the learner is, so another way of signing in (passwords, OAuth) can
    replace it later without touching any route or service.
    """
    username = read_session(token, settings.secret_key) if token else None
    user = (
        db.scalar(select(User).where(User.username == username, User.is_bot.is_(False)))
        if username
        else None
    )
    if user is None:
        raise AppError(401, "not_authenticated", "Unauthorized", "Log in to continue.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
