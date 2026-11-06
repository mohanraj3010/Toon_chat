import asyncio
from collections import defaultdict
import json
import time
from typing import Dict, List, Optional, Set
import uuid
from fastapi import WebSocket
from starlette.websockets import WebSocketState

from app.core.logging import get_logger
from app.schemas.realtime import ToonChatEnvelope

logger = get_logger("toonchat.realtime.connection_manager")


class ConnectionManager:
    """
    Manages active WebSocket connections, multi-tab user routing, and connection boundaries.
    """

    def __init__(self, max_connections_per_user: int = 5) -> None:
        self.max_connections_per_user = max_connections_per_user
        self._lock = asyncio.Lock()
        # Mapping: user_id -> Set[WebSocket]
        self._user_sockets: Dict[uuid.UUID, Set[WebSocket]] = defaultdict(set)
        # Mapping: WebSocket -> user_id
        self._socket_user: Dict[WebSocket, uuid.UUID] = {}
        # Mapping: WebSocket -> session_id
        self._socket_session: Dict[WebSocket, str] = {}
        # Mapping: session_id -> WebSocket
        self._session_socket: Dict[str, WebSocket] = {}
        # Mapping: WebSocket -> connected_at timestamp
        self._socket_connected_at: Dict[WebSocket, float] = {}
        # Mapping: WebSocket -> Set[conversation_id] actively typing in
        self._socket_typing: Dict[WebSocket, Set[uuid.UUID]] = defaultdict(set)

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> str:
        """
        Registers an accepted WebSocket connection bound to user_id.
        Enforces maximum concurrent sessions per user.
        Returns unique session_id.
        """
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        now = time.time()

        oldest_to_evict: Optional[WebSocket] = None
        async with self._lock:
            existing = self._user_sockets[user_id]
            if len(existing) >= self.max_connections_per_user:
                # Find oldest connection to evict
                oldest_to_evict = min(
                    existing,
                    key=lambda s: self._socket_connected_at.get(s, 0.0),
                )
                self._remove_socket_unlocked(oldest_to_evict)

            self._user_sockets[user_id].add(websocket)
            self._socket_user[websocket] = user_id
            self._socket_session[websocket] = session_id
            self._session_socket[session_id] = websocket
            self._socket_connected_at[websocket] = now

        if oldest_to_evict:
            logger.info(
                f"Evicting oldest connection for user {user_id} (exceeded {self.max_connections_per_user} sessions)"
            )
            try:
                if oldest_to_evict.client_state == WebSocketState.CONNECTED:
                    await oldest_to_evict.close(
                        code=1000, reason="MAX_SESSIONS_EXCEEDED"
                    )
            except Exception as e:
                logger.debug(f"Error closing evicted socket: {e}")

        logger.info(
            f"Registered socket {session_id} for user {user_id} (active tabs: {len(self._user_sockets[user_id])})"
        )
        return session_id

    async def disconnect(self, websocket: WebSocket) -> Optional[uuid.UUID]:
        """
        Unregisters a disconnected WebSocket.
        Returns the user_id the socket was bound to.
        """
        async with self._lock:
            user_id = self._remove_socket_unlocked(websocket)

        if user_id:
            remaining = len(self._user_sockets.get(user_id, set()))
            logger.info(
                f"Unregistered socket for user {user_id} (remaining tabs: {remaining})"
            )
        return user_id

    def _remove_socket_unlocked(self, websocket: WebSocket) -> Optional[uuid.UUID]:
        user_id = self._socket_user.pop(websocket, None)
        session_id = self._socket_session.pop(websocket, None)
        if session_id:
            self._session_socket.pop(session_id, None)
        self._socket_connected_at.pop(websocket, None)

        if user_id and user_id in self._user_sockets:
            self._user_sockets[user_id].discard(websocket)
            if not self._user_sockets[user_id]:
                del self._user_sockets[user_id]
        return user_id

    async def set_typing(
        self, websocket: WebSocket, conversation_id: uuid.UUID, is_typing: bool
    ) -> None:
        async with self._lock:
            if is_typing:
                self._socket_typing[websocket].add(conversation_id)
            else:
                self._socket_typing[websocket].discard(conversation_id)

    async def get_and_clear_typing(self, websocket: WebSocket) -> Set[uuid.UUID]:
        async with self._lock:
            return self._socket_typing.pop(websocket, set())

    async def send_envelope(
        self, websocket: WebSocket, envelope: ToonChatEnvelope, timeout_sec: float = 2.0
    ) -> bool:
        """
        Sends an envelope to a specific WebSocket with a non-blocking timeout.
        Returns True if sent successfully, False otherwise.
        """
        if websocket.client_state != WebSocketState.CONNECTED:
            return False

        payload_json = envelope.model_dump_json()
        try:
            await asyncio.wait_for(
                websocket.send_text(payload_json), timeout=timeout_sec
            )
            return True
        except asyncio.TimeoutError:
            logger.warning("Socket send timed out (slow consumer detected)")
            return False
        except Exception as e:
            logger.debug(f"Socket send failed: {e}")
            return False

    async def broadcast_to_user(
        self, user_id: uuid.UUID, envelope: ToonChatEnvelope
    ) -> int:
        """
        Fans out an envelope to all active sockets belonging to a user.
        Returns the number of sockets successfully delivered to.
        """
        async with self._lock:
            sockets = list(self._user_sockets.get(user_id, set()))

        if not sockets:
            return 0

        tasks = [self.send_envelope(s, envelope) for s in sockets]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return sum(1 for r in results if r is True)

    async def get_user_socket_count(self, user_id: uuid.UUID) -> int:
        async with self._lock:
            return len(self._user_sockets.get(user_id, set()))

    async def is_user_online(self, user_id: uuid.UUID) -> bool:
        async with self._lock:
            return user_id in self._user_sockets and len(self._user_sockets[user_id]) > 0

    async def get_session_id(self, websocket: WebSocket) -> Optional[str]:
        async with self._lock:
            return self._socket_session.get(websocket)


# Global singleton instance
connection_manager = ConnectionManager()
