import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class WorldPresence(Base):
    __tablename__ = "world_presence"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    place_id: Mapped[str] = mapped_column(
        String(20), default="park", nullable=False
    )  # 'park' | 'cafe' | 'plaza'
    pos_x: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    pos_y: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    facing: Mapped[str] = mapped_column(
        String(10), default="right", nullable=False
    )  # 'left' | 'right'
    action: Mapped[str] = mapped_column(
        String(20), default="idle", nullable=False
    )  # 'idle' | 'walking' | 'waving' | 'sitting'
    status: Mapped[str] = mapped_column(
        String(20), default="active", nullable=False
    )  # 'active' | 'idle'
    status_text: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    speech_text: Mapped[Optional[str]] = mapped_column(String(140), nullable=True)
    speech_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    emote_emoji: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    emote_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_heartbeat_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="presence")

    __table_args__ = (
        Index("ix_wp_place_heartbeat", place_id, last_heartbeat_at.desc()),
    )
