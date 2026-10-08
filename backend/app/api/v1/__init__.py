"""Version 1 of the REST API, mounted under /api/v1."""

from fastapi import APIRouter

from app.api.v1 import demo, hearts, leaderboard, me, path, profile, sessions, shop

router = APIRouter(prefix="/api/v1")
router.include_router(me.router)
router.include_router(path.router)
router.include_router(sessions.router)
router.include_router(hearts.router)
router.include_router(shop.router)
router.include_router(leaderboard.router)
router.include_router(profile.router)
router.include_router(demo.router)
