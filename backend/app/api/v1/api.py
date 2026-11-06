from fastapi import APIRouter
from app.api.v1.routers import auth, conversations, friends, media, realtime, users

api_v1_router = APIRouter()
api_v1_router.include_router(auth.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(conversations.router)
api_v1_router.include_router(friends.router)
api_v1_router.include_router(realtime.router)
api_v1_router.include_router(media.router)


