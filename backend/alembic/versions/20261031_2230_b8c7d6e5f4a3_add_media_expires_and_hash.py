"""add media expires and hash

Revision ID: b8c7d6e5f4a3
Revises: 3af42119792d
Create Date: 2026-10-31 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c7d6e5f4a3'
down_revision: Union[str, None] = '3af42119792d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('media', sa.Column('sha256_hash', sa.String(length=64), nullable=True))
    op.add_column('media', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_media_expires_at', 'media', ['expires_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_media_expires_at', table_name='media')
    op.drop_column('media', 'expires_at')
    op.drop_column('media', 'sha256_hash')
