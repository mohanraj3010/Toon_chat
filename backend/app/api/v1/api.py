from fastapi import APIRouter
from app.api.v1.routers import auth, conversations, friends, media, realtime, users

api_v1_router = APIRouter()
api_v1_router.include_router(auth.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(conversations.router)
api_v1_router.include_router(friends.router)
api_v1_router.include_router(realtime.router)
api_v1_router.include_router(media.router)

# Route aliases for compatibility across different client endpoint patterns
api_v1_router.add_api_route(
    "/ticket",
    realtime.issue_realtime_ticket,
    methods=["POST"],
    response_model=realtime.RealtimeTicketResponse,
    include_in_schema=False,
)


