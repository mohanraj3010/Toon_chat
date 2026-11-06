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


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(String(140), default="", nullable=False)
    category: Mapped[str] = mapped_column(
        String(20), default="hangout", nullable=False
    )  # 'gaming' | 'art' | 'skate' | 'music' | 'hangout' | 'tech'
    privacy: Mapped[str] = mapped_column(
        String(20), default="public", nullable=False
    )  # 'public' | 'private'
    banner_color: Mapped[str] = mapped_column(
        String(30), default="#ffedd5", nullable=False
    )
    avatar_config: Mapped[dict] = mapped_column(JSONType, nullable=False)

    pinned_message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
    )
    pinned_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    pinned_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="group")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    invites: Mapped[List["GroupInvite"]] = relationship(
        "GroupInvite", back_populates="group", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_groups_category", category),
        Index("ix_groups_privacy", privacy),
    )


class GroupInvite(Base):
    __tablename__ = "group_invites"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    inviter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[str] = mapped_column(
        String(20), default="join_request", nullable=False
    )  # 'invite' | 'join_request'
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # 'pending' | 'accepted' | 'declined' | 'canceled'
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    group: Mapped["Group"] = relationship("Group", back_populates="invites")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    inviter: Mapped[Optional["User"]] = relationship("User", foreign_keys=[inviter_id])

    __table_args__ = (
        UniqueConstraint(
            "group_id", "user_id", "type", "status", name="uq_group_invite_pending"
        ),
        Index("ix_group_invites_lookup", group_id, status),
    )
