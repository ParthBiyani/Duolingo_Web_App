from fastapi import APIRouter, Response, status

from app.api.deps import ClockDep, CurrentUser, DbSession
from app.schemas.session import (
    AnswerCreate,
    AnswerResult,
    CompletionResult,
    SessionCreate,
    SessionResponse,
)
from app.services import sessions

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a lesson, practice, review, legendary or timed session",
)
def start_session(
    body: SessionCreate, response: Response, db: DbSession, clock: ClockDep, user: CurrentUser
) -> SessionResponse:
    session, created = sessions.start_session(db, clock.now(), user, body)
    if not created:
        response.status_code = status.HTTP_200_OK  # same id again: replay, not a new session
    return session


@router.post(
    "/{session_id}/answers",
    response_model=AnswerResult,
    summary="Grade one answer (one pair for match exercises)",
)
def submit_answer(
    session_id: str, body: AnswerCreate, db: DbSession, clock: ClockDep, user: CurrentUser
) -> AnswerResult:
    return sessions.submit_answer(db, clock.now(), user, session_id, body)


@router.post(
    "/{session_id}/complete",
    response_model=CompletionResult,
    summary="Finish a session and award XP, streak, goal and progress",
)
def complete_session(
    session_id: str, db: DbSession, clock: ClockDep, user: CurrentUser
) -> CompletionResult:
    return sessions.complete_session(db, clock.now(), user, session_id)


@router.post(
    "/{session_id}/abandon",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Quit a session without rewards",
)
def abandon_session(session_id: str, db: DbSession, clock: ClockDep, user: CurrentUser) -> None:
    sessions.abandon_session(db, clock.now(), user, session_id)
