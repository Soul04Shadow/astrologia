from __future__ import annotations

import json
from datetime import datetime, timezone
import pytest
from app.engine.constants import SIGN_NAMES
from app.engine.transits import compute_guru_gochar, compute_sade_sati_details
from app.services.tools import execute, TOOLS


SAMPLE_CHART = {
    "birth_details": {
        "date": "1995-02-14",
        "time": "14:30",
        "tz_name": "Asia/Kolkata",
        "utc_time": "1995-02-14T09:00:00Z",
        "latitude": 28.6139,
        "longitude": 77.2090,
    },
    "lagna": {
        "sign": "Leo",
        "sign_index": 4,
        "longitude": 146.5,
        "degree": "26°30'00\"",
        "lord": "Sun",
    },
    "moon_rashi": {
        "sign": "Cancer",
        "sign_index": 3,
        "house": 12,
        "nakshatra": "Pushya",
        "pada": 2,
        "nakshatra_lord": "Saturn",
    },
    "planets": {
        "Sun": {"sign": "Aquarius", "sign_index": 10, "longitude": 301.5, "house": 7, "dignity": "Neutral", "degree_in_sign": 1.5, "retrograde": False, "nakshatra": {"name": "Dhanishta", "lord": "Mars", "pada": 3}},
        "Moon": {"sign": "Cancer", "sign_index": 3, "longitude": 102.3, "house": 12, "dignity": "Own Sign", "degree_in_sign": 12.3, "retrograde": False, "nakshatra": {"name": "Pushya", "lord": "Saturn", "pada": 2}},
        "Mars": {"sign": "Leo", "sign_index": 4, "longitude": 128.5, "house": 1, "dignity": "Neutral", "degree_in_sign": 8.5, "retrograde": True, "nakshatra": {"name": "Magha", "lord": "Ketu", "pada": 3}},
        "Mercury": {"sign": "Aquarius", "sign_index": 10, "longitude": 315.0, "house": 7, "dignity": "Neutral", "degree_in_sign": 15.0, "retrograde": False, "nakshatra": {"name": "Shatabhisha", "lord": "Rahu", "pada": 3}},
        "Jupiter": {"sign": "Scorpio", "sign_index": 7, "longitude": 222.0, "house": 4, "dignity": "Neutral", "degree_in_sign": 12.0, "retrograde": False, "nakshatra": {"name": "Jyeshtha", "lord": "Mercury", "pada": 2}},
        "Venus": {"sign": "Sagittarius", "sign_index": 8, "longitude": 255.0, "house": 5, "dignity": "Neutral", "degree_in_sign": 15.0, "retrograde": False, "nakshatra": {"name": "Purva Ashadha", "lord": "Venus", "pada": 1}},
        "Saturn": {"sign": "Aquarius", "sign_index": 10, "longitude": 318.0, "house": 7, "dignity": "Moolatrikona", "degree_in_sign": 18.0, "retrograde": False, "nakshatra": {"name": "Shatabhisha", "lord": "Rahu", "pada": 4}},
        "Rahu": {"sign": "Libra", "sign_index": 6, "longitude": 195.0, "house": 3, "dignity": "Neutral", "degree_in_sign": 15.0, "retrograde": False, "nakshatra": {"name": "Swati", "lord": "Rahu", "pada": 3}},
        "Ketu": {"sign": "Aries", "sign_index": 0, "longitude": 15.0, "house": 9, "dignity": "Neutral", "degree_in_sign": 15.0, "retrograde": False, "nakshatra": {"name": "Bharani", "lord": "Venus", "pada": 1}},
    },
}


@pytest.mark.anyio
async def test_get_ashtakavarga_tool_dynamic_and_cached():
    """
    Test get_ashtakavarga tool execution:
    1. Computed dynamically when missing from chart dict
    2. Returned directly when already cached in chart dict
    """
    # 1. Dynamic calculation
    raw_dynamic = await execute("get_ashtakavarga", {}, SAMPLE_CHART)
    data_dyn = json.loads(raw_dynamic)
    assert "ashtakavarga" in data_dyn
    av_dyn = data_dyn["ashtakavarga"]
    assert av_dyn["total_bindus"] == 337
    assert len(av_dyn["bav"]) == 7
    assert len(av_dyn["sav_by_house"]) == 12

    # 2. Cached in chart
    cached_chart = {**SAMPLE_CHART, "ashtakavarga": {"total_bindus": 337, "cached": True}}
    raw_cached = await execute("get_ashtakavarga", {}, cached_chart)
    data_cached = json.loads(raw_cached)
    assert data_cached["ashtakavarga"]["cached"] is True


@pytest.mark.anyio
async def test_get_shadbala_tool_dynamic_and_structure():
    """
    Test get_shadbala tool execution:
    1. Computes 6-fold Shadbala for all 7 classical planets
    2. Validates Rupas, Virupas, and strength status in response
    """
    raw = await execute("get_shadbala", {}, SAMPLE_CHART)
    data = json.loads(raw)
    assert "shadbala" in data
    sb = data["shadbala"]
    assert len(sb) == 7

    for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        assert p in sb
        assert "total_rupas" in sb[p]
        assert "total_virupas" in sb[p]
        assert "strength_ratio" in sb[p]
        assert "status" in sb[p]
        assert sb[p]["total_rupas"] == round(sb[p]["total_virupas"] / 60.0, 2)


@pytest.mark.anyio
@pytest.mark.parametrize("varga_code", ["D10", "D7", "D3", "D12", "D30", "D9", "d10"])
async def test_get_varga_chart_tool_all_vargas(varga_code: str):
    """
    Test get_varga_chart tool execution for all supported divisional chart codes.
    """
    raw = await execute("get_varga_chart", {"varga": varga_code}, SAMPLE_CHART)
    data = json.loads(raw)
    assert "varga_chart" in data
    vc = data["varga_chart"]
    assert vc["varga"] == varga_code.upper()
    assert "lagna" in vc
    assert "planets" in vc
    assert vc["lagna"]["house"] == 1
    assert all("house" in p for p in vc["planets"].values())


@pytest.mark.anyio
async def test_get_sade_sati_details_tool():
    """
    Test get_sade_sati_details tool execution returning Sade Sati, Kantaka Shani, and Guru Gochar.
    """
    raw = await execute("get_sade_sati_details", {}, SAMPLE_CHART)
    data = json.loads(raw)
    assert "sade_sati" in data
    assert "guru_gochar" in data

    sade = data["sade_sati"]
    assert "saturn_current_sign" in sade
    assert "is_sade_sati" in sade
    assert "natal_moon_sign" in sade
    assert sade["natal_moon_sign"] == "Cancer"

    guru = data["guru_gochar"]
    assert "jupiter_current_sign" in guru
    assert "house_from_natal_moon" in guru
    assert "is_favorable_transit" in guru


def test_sade_sati_phase_continuity():
    """
    Test Sade Sati phase detection logic across all 12 moon signs relative to Saturn's transit position:
    - 12th from Moon (diff=11): 1st Phase (Rising / Aardh)
    - 1st from Moon (diff=0): 2nd Phase (Peak / Janma Shani)
    - 2nd from Moon (diff=1): 3rd Phase (Setting / Asta)
    - 4th from Moon (diff=3): Kantaka Shani
    - 8th from Moon (diff=7): Ashtama Shani
    - Other positions: No major affliction
    """
    # Test for a fixed reference time (e.g. 2026-08-24)
    ref_time = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)

    # Let's compute Sade Sati status for all 12 natal Moon sign indices (0 to 11)
    for moon_idx in range(12):
        res = compute_sade_sati_details(moon_idx, ref_time)
        sat_sign_name = res["saturn_current_sign"]
        sat_idx = SIGN_NAMES.index(sat_sign_name)
        diff = (sat_idx - moon_idx) % 12

        if diff in (11, 0, 1):
            assert res["is_sade_sati"] is True
            assert res["sade_sati_phase"] is not None
            if diff == 11:
                assert "1st Phase" in res["sade_sati_phase"]
            elif diff == 0:
                assert "2nd Phase" in res["sade_sati_phase"]
            elif diff == 1:
                assert "3rd Phase" in res["sade_sati_phase"]
        else:
            assert res["is_sade_sati"] is False
            assert res["sade_sati_phase"] is None

        if diff == 3:
            assert res["is_kantaka_shani"] is True
        else:
            assert res["is_kantaka_shani"] is False

        if diff == 7:
            assert res["is_ashtama_shani"] is True
        else:
            assert res["is_ashtama_shani"] is False


def test_guru_gochar_favorable_houses():
    """
    Test Guru Gochar (Jupiter Transit) auspiciousness:
    Favorable houses from natal Moon are Houses 2, 5, 7, 9, 11.
    Other houses (1, 3, 4, 6, 8, 10, 12) require spiritual alignment.
    """
    ref_time = datetime(2026, 8, 24, 12, 0, 0, tzinfo=timezone.utc)

    for moon_idx in range(12):
        res = compute_guru_gochar(moon_idx, ref_time)
        h = res["house_from_natal_moon"]
        assert 1 <= h <= 12
        expected_favorable = h in (2, 5, 7, 9, 11)
        assert res["is_favorable_transit"] == expected_favorable
