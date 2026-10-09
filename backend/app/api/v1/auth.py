"""Logging in and out as one of the sample learners, with a signed session cookie.

These are the only routes that work without a session (docs/adr/0003).
"""

from fastapi import APIRouter, Response, status

from app.api.deps import ClockDep, DbSession, SettingsDep
from app.core.security import SESSION_COOKIE, SESSION_MAX_AGE, sign_session
from app.schemas.auth import LoginRequest, SampleLearner
from app.services import auth

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/learners", response_model=list[SampleLearner], summary="Sample learners")
def list_learners(db: DbSession, clock: ClockDep) -> list[SampleLearner]:
    return auth.list_learners(db, clock.now())


@router.post("/login", response_model=SampleLearner, summary="Log in as a sample learner")
def login(
    body: LoginRequest, response: Response, db: DbSession, clock: ClockDep, settings: SettingsDep
) -> SampleLearner:
    user = auth.find_learner(db, body.username)
    response.set_cookie(
        SESSION_COOKIE,
        sign_session(user.username, settings.secret_key),
        max_age=int(SESSION_MAX_AGE.total_seconds()),
        path="/",
        secure=settings.secure_cookies,
        httponly=True,
        samesite="lax",
    )
    return auth.sample_learner(db, clock.now(), user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Log out")
def logout(response: Response, settings: SettingsDep) -> None:
    response.delete_cookie(
        SESSION_COOKIE, path="/", secure=settings.secure_cookies, httponly=True, samesite="lax"
    )
