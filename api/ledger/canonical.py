"""Canonical JSON (RFC 8785, JCS) and SHA-256 for EQ-011 (docs/methods.md §3).

Everything that is hashed goes through `normalize` first, so a value read back from PostgreSQL
(Decimal, datetime, date, UUID) hashes the same as the value that was written.
"""

from __future__ import annotations

import hashlib
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

import rfc8785


def normalize(value: Any) -> Any:
    """Map Python and database values onto plain JSON types, deterministically."""
    if value is None or isinstance(value, (bool, str)):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            raise ValueError("naive datetime cannot be hashed; use UTC")
        return value.astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, dict):
        return {str(k): normalize(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [normalize(v) for v in value]
    raise TypeError(f"cannot canonicalize {type(value).__name__}")


def canonical_bytes(payload: Any) -> bytes:
    """UTF-8 bytes of the RFC 8785 canonical form."""
    return rfc8785.dumps(normalize(payload))


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def content_hash(payload: Any) -> str:
    """EQ-011: SHA-256(UTF-8(JCS(payload)))."""
    return sha256_hex(canonical_bytes(payload))


def chained_hash(prev_hash: str, payload: Any) -> str:
    """EQ-011: SHA-256(prev_hash ‖ UTF-8(JCS(event_payload)))."""
    return sha256_hex(prev_hash.encode("ascii") + canonical_bytes(payload))
