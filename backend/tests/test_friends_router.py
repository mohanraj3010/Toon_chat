import pytest
from app.api.v1.routers.friends import router
from app.schemas.social import FriendUserItem, FriendshipActionResponse, FriendRequestCreate


def test_friends_router_routes_registered():
    route_paths = [r.path for r in router.routes]
    assert "/friends" in route_paths
    assert "/friends/requests" in route_paths
    assert "/friends/sent" in route_paths
    assert "/friends/blocked" in route_paths
    assert "/friends/request" in route_paths
    assert "/friends/accept/{user_id}" in route_paths
    assert "/friends/decline/{user_id}" in route_paths
    assert "/friends/cancel/{user_id}" in route_paths
    assert "/friends/{user_id}" in route_paths
    assert "/friends/block/{user_id}" in route_paths
    assert "/friends/unblock/{user_id}" in route_paths


def test_friend_schemas_validation():
    item = FriendUserItem(
        id="00000000-0000-0000-0000-000000000001",
        username="luna_star",
        display_name="Luna",
        avatar_url=None,
        status="online",
        vibe_text="Shining bright ✨",
        theme_base=2,
        is_online=True,
        friend_status="friends",
        bio="Hello from ToonChat!",
    )
    assert item.username == "luna_star"
    assert item.friend_status == "friends"
    assert item.is_online is True

    action = FriendshipActionResponse(
        success=True,
        message="Friend request sent!",
        status="requested",
    )
    assert action.success is True
    assert action.status == "requested"

