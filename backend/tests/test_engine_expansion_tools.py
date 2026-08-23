from __future__ import annotations

import json
import pytest
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
async def test_get_ashtakavarga_tool():
    raw = await execute("get_ashtakavarga", {}, SAMPLE_CHART)
    data = json.loads(raw)
    assert "ashtakavarga" in data
    assert data["ashtakavarga"]["total_bindus"] == 337


@pytest.mark.anyio
async def test_get_shadbala_tool():
    raw = await execute("get_shadbala", {}, SAMPLE_CHART)
    data = json.loads(raw)
    assert "shadbala" in data
    assert len(data["shadbala"]) == 7


@pytest.mark.anyio
async def test_get_varga_chart_tool():
    raw = await execute("get_varga_chart", {"varga": "D10"}, SAMPLE_CHART)
    data = json.loads(raw)
    assert "varga_chart" in data
    assert data["varga_chart"]["varga"] == "D10"


@pytest.mark.anyio
async def test_get_sade_sati_details_tool():
    raw = await execute("get_sade_sati_details", {}, SAMPLE_CHART)
    data = json.loads(raw)
    assert "sade_sati" in data
    assert "guru_gochar" in data
