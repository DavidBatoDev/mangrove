"""Apply db/init/*.sql in filename order as the owner role, then seed (docs/data-model.md, ADR-036).

    py -3.12 db/apply.py --target test            # Neon test branch (TEST_DATABASE_URL_DIRECT)
    py -3.12 db/apply.py --target main            # Neon main branch (DATABASE_URL_DIRECT), the demo
    add --reset to drop and recreate the public schema first. --reset on main also needs --yes-main.

Without --reset, schema files are skipped when the tables already exist, except files whose first line
starts with "-- idempotent" (later additions, safe to re-run). The seed skips what is already there. Connection strings are never printed.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))
sys.path.insert(0, str(ROOT / "db"))
load_dotenv(ROOT / ".env")
IDEMPOTENT = "-- idempotent"  # first line of a db/init file that is safe to re-run on an existing schema


def urls(target: str) -> tuple[str, str]:
    """(owner direct url, app pooled url) for the target branch."""
    prefix = "TEST_" if target == "test" else ""
    owner, app = os.environ.get(f"{prefix}DATABASE_URL_DIRECT"), os.environ.get(f"{prefix}DATABASE_URL")
    if not owner or not app:
        sys.exit(f"{prefix}DATABASE_URL_DIRECT and {prefix}DATABASE_URL must be set in .env")
    if target == "test" and owner == os.environ.get("DATABASE_URL_DIRECT"):
        sys.exit("refusing: the test URL equals the main URL")
    return owner, app


def ensure_app_role(conn: psycopg.Connection, app_url: str, app_role: str) -> None:
    """Create the app role in SQL with the password from its own connection string.

    Do not create it with the Neon console, API or neonctl: those roles are members of neon_superuser and
    inherit UPDATE/DELETE on every table, which defeats the grant layer of BR-002 (ADR-034, TC-008).
    """
    info = conninfo_to_dict(app_url)
    if info.get("user") != app_role:
        sys.exit("the DATABASE_URL user must equal DATABASE_APP_ROLE")
    exists = conn.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (app_role,)).fetchone()
    stmt = ("ALTER ROLE {} WITH LOGIN PASSWORD {}" if exists
            else "CREATE ROLE {} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD {}")
    conn.execute(sql.SQL(stmt).format(sql.Identifier(app_role), sql.Literal(info["password"])))
    member_of = conn.execute(
        """SELECT r.rolname FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.roleid
           JOIN pg_roles u ON u.oid = m.member WHERE u.rolname = %s""", (app_role,)).fetchall()
    if member_of:
        sys.exit(f"app role inherits from {[r[0] for r in member_of]}; recreate it in SQL (see ensure_app_role)")
    print(f"app role {'updated' if exists else 'created'} (no inherited roles)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["test", "main"], required=True)
    ap.add_argument("--reset", action="store_true")
    ap.add_argument("--yes-main", action="store_true")
    ap.add_argument("--no-seed", action="store_true")
    args = ap.parse_args()
    if args.reset and args.target == "main" and not args.yes_main:
        sys.exit("--reset on main drops the live demo data; add --yes-main if you mean it")

    owner_url, app_url = urls(args.target)
    app_role = os.environ.get("DATABASE_APP_ROLE") or sys.exit("DATABASE_APP_ROLE must be set")

    with psycopg.connect(owner_url, autocommit=True) as conn:
        ensure_app_role(conn, app_url, app_role)
        if args.reset:
            conn.execute("DROP SCHEMA IF EXISTS public CASCADE")
            conn.execute("CREATE SCHEMA public")
            conn.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(sql.Identifier(app_role)))
            print("reset: public schema recreated")
        exists = conn.execute("SELECT to_regclass('public.site') IS NOT NULL").fetchone()[0]
        if exists:
            print("schema present: skipping db/init except idempotent files (use --reset to rebuild)")
        for f in sorted((ROOT / "db" / "init").glob("*.sql")):
            text = f.read_text(encoding="utf-8")
            if exists and not text.startswith(IDEMPOTENT):
                continue
            if "{app_role}" in text:
                text = text.replace("{app_role}", sql.Identifier(app_role).as_string(conn))
            with conn.transaction():
                conn.execute(text)
            print(f"applied {f.name}")

    if not args.no_seed:
        import seed

        seed.run(owner_url, app_url)


if __name__ == "__main__":
    main()
