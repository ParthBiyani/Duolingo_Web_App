"""Command line: ``python -m app.seed --if-empty`` or ``python -m app.seed --reset``.

``--if-empty`` seeds a fresh database and does nothing once the course exists (safe to run on
every deploy). ``--reset`` puts the demo back to its starting state: real time again, and a new
copy of the learner, the rivals and the league week. Course content is kept.
"""

import argparse
import logging

from app.core.clock import SystemClock, set_clock_offset
from app.core.config import get_settings
from app.core.db import session_scope
from app.core.logging import configure_logging
from app.seed.runner import reset_people, seed_database

# Named explicitly: under `python -m`, __name__ is "__main__", outside the "app" logger tree.
logger = logging.getLogger("app.seed")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.seed", description="Seed the database.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--if-empty", action="store_true", help="seed everything unless the course already exists"
    )
    mode.add_argument(
        "--reset",
        action="store_true",
        help="reset the clock and recreate the learner and league (course content is kept)",
    )
    args = parser.parse_args(argv)
    configure_logging(get_settings().log_level)

    with session_scope() as session:
        if args.reset:
            set_clock_offset(session, 0)
            now = SystemClock().now()
            if not seed_database(session, now):
                reset_people(session, now)
            logger.info("Demo data reset")
        elif seed_database(session, SystemClock().now()):
            logger.info("Database seeded")
        else:
            logger.info("Database already seeded; nothing to do")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
