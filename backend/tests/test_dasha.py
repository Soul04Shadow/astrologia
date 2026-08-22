from datetime import datetime, timezone

from app.engine.dasha import current_period, timeline_for_llm, vimshottari
from app.engine.core import nakshatra_of

BIRTH = datetime(1990, 5, 21, 9, 0, tzinfo=timezone.utc)


def _moon_lon_for(frac):
    return frac * (360.0 / 27.0)


def test_dasha_starts_with_moon_nakshatra_lord():
    lon = _moon_lon_for(0.5)
    nak = nakshatra_of(lon)
    d = vimshottari(lon, BIRTH)
    assert d["start_lord"] == nak["lord"]


def test_first_maha_balance_matches_fraction():
    frac = 0.25
    lon = _moon_lon_for(frac)
    d = vimshottari(lon, BIRTH)
    first_years = {"Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
                   "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17}
    expected_balance = first_years[d["start_lord"]] * (1 - frac)
    assert abs(d["balance_at_birth_years"] - expected_balance) < 1e-6


def test_antardasha_sums_to_mahadasha():
    d = vimshottari(_moon_lon_for(0.3), BIRTH)
    for m in d["mahadashas"]:
        total_days = (m["end"] - m["start"]).total_seconds()
        antar_sum = sum((a["end"] - a["start"]).total_seconds() for a in m["antardashas"])
        assert abs(total_days - antar_sum) < 1.0


def test_antardasha_order_starts_from_maha_lord():
    d = vimshottari(_moon_lon_for(0.3), BIRTH)
    for m in d["mahadashas"]:
        lords = [a["lord"] for a in m["antardashas"]]
        start_idx = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"].index(m["lord"])
        order = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
        assert lords == [order[(start_idx + j) % 9] for j in range(9)]


def test_current_period_nested_consistency():
    d = vimshottari(_moon_lon_for(0.3), BIRTH)
    probe = datetime(2015, 6, 15, tzinfo=timezone.utc)
    cur = current_period(d, probe)
    assert cur["mahadasha"] is not None
    assert cur["antardasha"] is not None
    m = next(x for x in d["mahadashas"] if x["lord"] == cur["mahadasha"]["lord"])
    a = next(x for x in m["antardashas"] if x["lord"] == cur["antardasha"]["lord"])
    assert a["start"] <= probe < a["end"]
    assert m["start"] <= probe < m["end"]


def test_timeline_mentions_current():
    d = vimshottari(_moon_lon_for(0.3), BIRTH)
    tl = timeline_for_llm(d, datetime(2026, 8, 23, tzinfo=timezone.utc))
    assert "CURRENT MAHADASHA" in tl
