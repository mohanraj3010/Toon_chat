import asyncio
import os
import sys
import ssl
from urllib.parse import urlsplit, parse_qs

# Ensure app package is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncpg
from app.core.config import settings

TOONCHAT_TABLES = [
    "avatars",
    "blocks",
    "conversation_members",
    "conversations",
    "friendships",
    "group_invites",
    "groups",
    "media",
    "message_reactions",
    "messages",
    "notifications",
    "profiles",
    "sticker_packs",
    "stickers",
    "stories",
    "story_reactions",
    "story_views",
    "user_sessions",
    "user_settings",
    "users",
    "world_presence",
]


async def inspect_supabase():
    print("=" * 70)
    print("TOONCHAT — READ-ONLY SUPABASE SCHEMA INSPECTION")
    print("=" * 70)

    target_url = settings.SUPABASE_DATABASE_URL
    if not target_url:
        print("[ERROR] SUPABASE_DATABASE_URL is not set.")
        return 1

    parsed = urlsplit(target_url)
    raw_query = parse_qs(parsed.query)
    ssl_mode = raw_query.get("ssl", ["require"])[0]

    ssl_context = ssl.create_default_context()
    if ssl_mode in ("require", "verify-ca", "verify-full"):
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

    print("[INFO] Connecting to Supabase via read-only inspection session...")

    try:
        conn = await asyncpg.connect(
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path.lstrip("/") or "postgres",
            ssl=ssl_context,
            timeout=15,
        )
    except Exception as e:
        print(f"[ERROR] Connection failed: {type(e).__name__}")
        return 1

    try:
        # 1. Version
        version = await conn.fetchval("SELECT version();")
        print(f"\n[1. PostgreSQL Engine Version]\n{version}")

        # 2. Installed extensions
        extensions = await conn.fetch(
            "SELECT extname, extversion FROM pg_extension ORDER BY extname;"
        )
        ext_list = [f"{r['extname']} ({r['extversion']})" for r in extensions]
        print(f"\n[2. Installed PostgreSQL Extensions ({len(ext_list)})]")
        print(", ".join(ext_list))

        # 3. Schemas present
        schemas = await conn.fetch(
            "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;"
        )
        schema_names = [r["schema_name"] for r in schemas]
        print(f"\n[3. Available Schemas ({len(schema_names)})]")
        print(", ".join(schema_names))

        # 4. Existing public tables
        pub_tables = await conn.fetch(
            """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
            """
        )
        existing_table_names = [r["table_name"] for r in pub_tables]
        print(f"\n[4. Existing Tables in 'public' Schema ({len(existing_table_names)})]")
        if existing_table_names:
            print(", ".join(existing_table_names))
        else:
            print("Zero tables found in 'public' schema (Fresh public database).")

        # 5. Check for conflicts with ToonChat tables
        conflicts = [t for t in TOONCHAT_TABLES if t in existing_table_names]
        print(f"\n[5. Table Name Conflict Analysis]")
        if conflicts:
            print(f"WARNING: The following {len(conflicts)} table names already exist in 'public':")
            for c in conflicts:
                print(f"  - {c}")
        else:
            print("SUCCESS: Zero name collisions! None of the 21 ToonChat tables exist in 'public'.")

        # 6. Inspect Auth Schema status (read-only metadata, no private user records)
        auth_users_exists = await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'auth' AND table_name = 'users'
            );
            """
        )
        print(f"\n[6. Supabase Managed Auth Schema]")
        print(f"auth.users table present: {auth_users_exists}")
        if auth_users_exists:
            auth_cols = await conn.fetch(
                """
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'auth' AND table_name = 'users'
                ORDER BY ordinal_position;
                """
            )
            print(f"auth.users columns: {', '.join([c['column_name'] for c in auth_cols])}")

        # 7. Current database roles
        roles = await conn.fetch(
            """
            SELECT rolname FROM pg_roles 
            WHERE rolname IN ('postgres', 'anon', 'authenticated', 'service_role', 'supabase_admin');
            """
        )
        print(f"\n[7. Standard Supabase Roles Detected]")
        print(", ".join([r["rolname"] for r in roles]))

        return 0

    finally:
        await conn.close()


if __name__ == "__main__":
    code = asyncio.run(inspect_supabase())
    sys.exit(code)
