"""Demo tools: move the simulated clock and reset learner data.

Enabled only when the DEMO_TOOLS setting is true; otherwise every route answers 404.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import ClockDep, DbSession
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.schemas.demo import ClockAdvance, ClockResponse
from app.services import demo


def require_demo_tools(settings: Annotated[Settings, Depends(get_settings)]) -> None:
    if not settings.demo_tools:
        raise AppError(404, "not_found", "Not found", "Demo tools are disabled.")


router = APIRouter(prefix="/demo", tags=["demo"], dependencies=[Depends(require_demo_tools)])


@router.get("/clock", response_model=ClockResponse, summary="Current simulated time")
def get_clock(db: DbSession, clock: ClockDep) -> ClockResponse:
    return demo.get_clock(db, clock.now())


@router.post("/clock/advance", response_model=ClockResponse, summary="Move the clock forward")
def advance_clock(body: ClockAdvance, db: DbSession, clock: ClockDep) -> ClockResponse:
    return demo.advance_clock(db, clock.now(), body.seconds)


@router.post("/reset", status_code=status.HTTP_204_NO_CONTENT, summary="Reset demo data")
def reset(db: DbSession) -> None:
    demo.reset_demo(db)
