from abc import ABC, abstractmethod
import asyncio
import secrets
import time
from typing import Dict, Optional
import uuid

from app.core.logging import get_logger

logger = get_logger("toonchat.realtime.ticket_store")


def mask_ticket(ticket: str) -> str:
    """Masks a ticket string to prevent leaking secrets into logs or traces."""
    if not ticket or len(ticket) <= 8:
        return "tkt_****"
    return f"{ticket[:6]}****{ticket[-4:]}"


class ITicketStore(ABC):
    """Abstract ticket store interface for single-use WebSocket connection tickets."""

    @abstractmethod
    async def issue_ticket(
        self,
        user_id: uuid.UUID,
        purpose: str = "websocket_connect",
        ttl_seconds: int = 60,
    ) -> str:
        """Issues and stores a cryptographically secure, single-use ticket."""
        pass

    @abstractmethod
    async def consume_ticket(
        self,
        ticket: str,
        expected_purpose: str = "websocket_connect",
    ) -> Optional[uuid.UUID]:
        """
        Atomically retrieves and deletes a ticket.
        Returns the bound user_id if valid, not expired, and matching purpose.
        Returns None if missing, expired, or already consumed.
        """
        pass

    @abstractmethod
    async def purge_expired(self) -> int:
        """Purges expired tickets and returns the count of purged items."""
        pass


class InMemoryTicketStore(ITicketStore):
    """
    Thread-safe, in-memory single-use ticket store guarded by an asyncio.Lock.
    
    CRITICAL ARCHITECTURAL LIMITATION:
    This in-memory implementation operates strictly within a single Python OS process.
    If Uvicorn is executed with multiple workers (--workers > 1) without sticky routing,
    tickets issued on Worker 1 cannot be consumed on Worker 2.
    For local development, keep single worker execution. For multi-worker or cloud production,
    use a Redis/Valkey backed ticket store.
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._tickets: Dict[str, Dict[str, any]] = {}

    async def issue_ticket(
        self,
        user_id: uuid.UUID,
        purpose: str = "websocket_connect",
        ttl_seconds: int = 60,
    ) -> str:
        ticket = f"tkt_{secrets.token_hex(16)}"
        now = time.time()
        record = {
            "user_id": user_id,
            "purpose": purpose,
            "issued_at": now,
            "expires_at": now + ttl_seconds,
        }

        async with self._lock:
            self._tickets[ticket] = record

        logger.debug(
            f"Issued ticket {mask_ticket(ticket)} for user {user_id} (ttl={ttl_seconds}s)"
        )
        return ticket

    async def consume_ticket(
        self,
        ticket: str,
        expected_purpose: str = "websocket_connect",
    ) -> Optional[uuid.UUID]:
        if not ticket or not isinstance(ticket, str):
            return None

        async with self._lock:
            # Atomic single-use pop: guarantees that concurrent connection attempts
            # with the identical ticket result in exactly one winner.
            record = self._tickets.pop(ticket, None)

        if record is None:
            logger.warning(
                f"Attempted consumption of unknown, re-used, or already-consumed ticket {mask_ticket(ticket)}"
            )
            return None

        now = time.time()
        if now > record["expires_at"]:
            logger.warning(
                f"Rejected expired ticket {mask_ticket(ticket)} for user {record['user_id']}"
            )
            return None

        if record.get("purpose") != expected_purpose:
            logger.warning(
                f"Rejected ticket {mask_ticket(ticket)}: purpose mismatch "
                f"'{record.get('purpose')}' != '{expected_purpose}'"
            )
            return None

        user_id = record["user_id"]
        logger.debug(
            f"Successfully consumed single-use ticket {mask_ticket(ticket)} for user {user_id}"
        )
        return user_id

    async def purge_expired(self) -> int:
        now = time.time()
        purged = 0
        async with self._lock:
            expired_keys = [
                k for k, v in self._tickets.items() if now > v["expires_at"]
            ]
            for k in expired_keys:
                del self._tickets[k]
                purged += 1
        return purged

    async def get_active_count(self) -> int:
        async with self._lock:
            return len(self._tickets)


# Global singleton instance for single-worker local development
ticket_store = InMemoryTicketStore()
