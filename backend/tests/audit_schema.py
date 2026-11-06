import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.session import engine
from app.db.base import Base
import app.models

async def inspect():
    print("=== MODEL METADATA VERIFICATION ===")
    print("Total tables registered in Base.metadata:", len(Base.metadata.tables))
    for t_name in sorted(Base.metadata.tables.keys()):
        t = Base.metadata.tables[t_name]
        fks = [f"{fk.parent.name}->{fk.target_fullname} ({fk.ondelete})" for fk in t.foreign_keys]
        uqs = [uq.name for uq in t.constraints if hasattr(uq, "columns") and uq.__class__.__name__ == "UniqueConstraint"]
        ixs = [ix.name for ix in t.indexes]
        print(f"Table: {t_name:22} | Columns: {len(t.columns):2} | FKs: {len(fks):2} | UQs: {len(uqs):2} | Indexes: {len(ixs):2}")

    print("\n=== POSTGRESQL LIVE SCHEMA VERIFICATION ===")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"))
        table_count = res.scalar()
        print(f"Live public tables in PostgreSQL: {table_count}")

        fk_res = await conn.execute(text("SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'"))
        print(f"Live Foreign Keys in PostgreSQL: {fk_res.scalar()}")

        uq_res = await conn.execute(text("SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'UNIQUE' AND table_schema = 'public'"))
        print(f"Live Unique Constraints in PostgreSQL: {uq_res.scalar()}")

        ix_res = await conn.execute(text("SELECT count(*) FROM pg_indexes WHERE schemaname = 'public'"))
        print(f"Live Indexes in PostgreSQL: {ix_res.scalar()}")

if __name__ == "__main__":
    asyncio.run(inspect())
