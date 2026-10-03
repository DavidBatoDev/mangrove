"""Tests run against the Neon *test* branch only (docs/tests.md §4), never the demo branch.

Seed it first:  py -3.12 db/apply.py --target test --reset
then ingest GMW: data/ingest/.venv/Scripts/python data/ingest/gmw_ingest.py --target test --sites-only --stack-dir <dir>
then Sentinel-2: data/ingest/.venv/Scripts/python data/ingest/s2_ingest.py --target test
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg
import pytest
from dotenv import load_dotenv
from psycopg.rows import dict_row

API = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API))
load_dotenv(API.parent / ".env")

_test_app = os.environ.get("TEST_DATABASE_URL")
_test_owner = os.environ.get("TEST_DATABASE_URL_DIRECT")
if not _test_app or not _test_owner:
    pytest.exit("TEST_DATABASE_URL and TEST_DATABASE_URL_DIRECT must be set (.env)", returncode=2)
if _test_app == os.environ.get("DATABASE_URL") or _test_owner == os.environ.get("DATABASE_URL_DIRECT"):
    pytest.exit("refusing to run: the test database URL equals the demo database URL", returncode=2)

# Everything the app opens from here on points at the test branch.
os.environ["DATABASE_URL"] = _test_app
os.environ["DATABASE_URL_DIRECT"] = _test_owner

SITE = {k: f"00000000-0000-4000-8000-0000000000{k.lower()}0" for k in "ABCDE"}
RECORD_A = "00000000-0000-4000-8000-0000000001a0"
# Real, sourced Post-Yolanda sites and records (ADR-056, data/sites/real/README.md).
REAL_SITE = {k: f"00000000-0000-4000-8000-0000000000{k.lower()}" for k in ("F1", "F2", "F3", "F4")}
REAL_RECORD = {k: f"00000000-0000-4000-8000-0000000001{k.lower()}" for k in ("F1", "F2", "F3", "F4")}


def _connect(url: str) -> psycopg.Connection:
    return psycopg.connect(url, row_factory=dict_row, prepare_threshold=None)


@pytest.fixture(scope="session")
def app_conn():
    """App-role connection (SELECT + INSERT only on the append-only tables). Roll back what you write."""
    with _connect(_test_app) as conn:
        yield conn


@pytest.fixture(scope="session")
def owner_conn():
    with _connect(_test_owner) as conn:
        yield conn


@pytest.fixture()
def rollback(app_conn):
    """A transaction on the app-role connection that is always rolled back."""
    app_conn.rollback()
    yield app_conn
    app_conn.rollback()


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app, base_url="http://localhost") as c:
        yield c
