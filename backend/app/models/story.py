import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

JSONType = JSONB().with_variant(JSON, "sqlite")


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(
        String(20), default="expression", nullable=False
    )  # 'expression' | 'sticker' | 'text'
    content: Mapped[dict] = mapped_column(JSONType, nullable=False)
    media_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media.id", ondelete="SET NULL"), nullable=True
    )
    media_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship("User")
    views: Mapped[List["StoryView"]] = relationship(
        "StoryView", back_populates="story", cascade="all, delete-orphan"
    )
    reactions: Mapped[List["StoryReaction"]] = relationship(
        "StoryReaction", back_populates="story", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_stories_user_active", user_id, expires_at),
        Index("ix_stories_expires_at", expires_at),
    )


class StoryView(Base):
    __tablename__ = "story_views"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False
    )
    viewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    story: Mapped["Story"] = relationship("Story", back_populates="views")
    viewer: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("story_id", "viewer_id", name="uq_story_view"),
        Index("ix_story_views_lookup", story_id, viewer_id),
    )


class StoryReaction(Base):
    __tablename__ = "story_reactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    emoji: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    story: Mapped["Story"] = relationship("Story", back_populates="reactions")
    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("story_id", "user_id", "emoji", name="uq_story_reaction"),
        Index("ix_story_reactions_lookup", story_id, user_id),
    )
