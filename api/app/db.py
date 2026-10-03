"""Database access as the app role (ADR-034), over Neon's pooled connection string (ADR-036)."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

# Neon's pooler runs PgBouncer in transaction mode: server-side prepared statements must be off.
CONNECT_KWARGS = {"row_factory": dict_row, "prepare_threshold": None, "autocommit": False}

_pool: ConnectionPool | None = None


def open_pool(conninfo: str | None = None) -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo or os.environ["DATABASE_URL"],
            min_size=1,
            max_size=int(os.environ.get("DB_POOL_MAX", "8")),
            kwargs=CONNECT_KWARGS,
            check=ConnectionPool.check_connection,  # Neon free plan suspends idle computes
            open=False,
        )
        _pool.open(wait=False)
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def connection() -> Iterator[Connection]:
    """A pooled connection inside one transaction (read-only for every P0 route)."""
    pool = open_pool()
    with pool.connection() as conn:
        yield conn
