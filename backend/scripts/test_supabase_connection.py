import asyncio
import os
import sys
import ssl
from urllib.parse import urlsplit, parse_qs

# Ensure app package is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncpg
from app.core.config import settings


async def run_connection_test():
    print("=" * 60)
    print("TOONCHAT — SUPABASE READ-ONLY CONNECTION AUDIT")
    print("=" * 60)

    target_url = settings.SUPABASE_DATABASE_URL
    if not target_url:
        print("[STATUS] SUPABASE_DATABASE_URL is not currently set in backend/.env.")
        print("\nTo configure securely without printing secrets:")
        print("1. Open backend/.env in your local editor.")
        print("2. Set: SUPABASE_DATABASE_URL=postgresql+asyncpg://postgres.[REF]:[PASS]@[HOST]:5432/[DB]?ssl=require")
        print("3. Re-run this test script.")
        return 1

    try:
        parsed = urlsplit(target_url)
    except Exception as e:
        print(f"[ERROR] Failed to parse connection URL: {type(e).__name__}")
        return 1

    # Verify cloud hostname belongs to Supabase
    hostname = parsed.hostname or ""
    is_pooler = "pooler.supabase.com" in hostname
    is_direct = ".supabase.co" in hostname

    if not (is_pooler or is_direct):
        print(f"[ERROR] Hostname '{hostname}' does not match expected Supabase domains (.supabase.co or pooler.supabase.com).")
        return 1

    username = parsed.username or ""
    masked_user = (
        username[:3] + "****" + username[-4:] if len(username) > 8 else "***"
    )

    print(f"[TARGET] Host: {hostname}")
    print(f"[TARGET] Port: {parsed.port or 5432}")
    print(f"[TARGET] Database: {parsed.path.lstrip('/') or 'postgres'}")
    print(f"[TARGET] User: {masked_user}")
    print(f"[TARGET] Mode: {'Supavisor Session Pooler' if is_pooler else 'Direct Connection'}")
    print(f"[SAFETY] Zero passwords or secrets displayed.")

    raw_query = parse_qs(parsed.query)
    ssl_mode = raw_query.get("ssl", ["require"])[0]

    print("\n[ACTION] Initiating minimal read-only connection test ('SELECT 1;')...")
    print("[ACTION] Timeout set to 15 seconds. Alembic migrations are NOT run.")

    ssl_context = ssl.create_default_context()
    if ssl_mode in ("require", "verify-ca", "verify-full"):
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

    raw_password = parsed.password

    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(
                user=parsed.username,
                password=raw_password,
                host=parsed.hostname,
                port=parsed.port or 5432,
                database=parsed.path.lstrip("/") or "postgres",
                ssl=ssl_context if "ssl" in target_url or is_pooler or is_direct else None,
                timeout=15,
            ),
            timeout=15,
        )
        try:
            val = await conn.fetchval("SELECT 1;")
            if val == 1:
                print("\n[SUCCESS] Supabase PostgreSQL read-only query returned: 1")
                print("[SUCCESS] Connection verified successfully with SSL!")
                print("[SAFETY] Cloud tables, Auth settings, and existing data remain completely untouched.")
                return 0
            else:
                print(f"\n[UNEXPECTED] Query returned: {val}")
                return 1
        finally:
            await conn.close()

    except asyncio.TimeoutError:
        print("\n[FAILURE] Connection timed out after 15 seconds.")
        print("[DIAGNOSIS] Network packet dropped or firewall block.")
        print("            If using Direct Connection (:5432 on db.[ref].supabase.co), your local network")
        print("            may lack IPv6 routing. Switch to Supabase Session Pooler (port 5432 on aws-0-[region].pooler.supabase.com).")
        return 2

    except asyncpg.InvalidPasswordError:
        print("\n[FAILURE] Authentication failed: Invalid password for user.")
        print("[DIAGNOSIS] Verify the database password in your Supabase project dashboard.")
        return 3

    except asyncpg.CannotConnectNowError as e:
        print(f"\n[FAILURE] Server not ready or pool full: {type(e).__name__}")
        return 4

    except Exception as e:
        err_msg = str(e)
        if raw_password and raw_password in err_msg:
            err_msg = err_msg.replace(raw_password, "********")
        print(f"\n[FAILURE] Connection failed with error: {type(e).__name__}: {err_msg}")
        return 5


if __name__ == "__main__":
    code = asyncio.run(run_connection_test())
    sys.exit(code)
