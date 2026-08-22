from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import swisseph as swe

from .constants import (
    KARANA_MOVABLE,
    NAKSHATRAS,
    SIGN_NAMES,
    TITHI_NAMES,
    VAR_LORDS,
    WEEKDAYS,
    YOGA_NAMES,
)
from .core import FLAGS, SWE_PLANETS


def tithi_of(moon_lon: float, sun_lon: float) -> dict:
    diff = (moon_lon - sun_lon) % 360
    idx = int(diff // 12)
    paksha = "Shukla" if idx < 15 else "Krishna"
    within = idx % 15
    if idx == 14:
        name = "Purnima"
    elif idx == 29:
        name = "Amavasya"
    else:
        name = TITHI_NAMES[within]
    return {"index": idx + 1, "paksha": paksha, "name": name}


def yoga_of(moon_lon: float, sun_lon: float) -> dict:
    total = (moon_lon + sun_lon) % 360
    span = 360.0 / 27.0
    idx = int(total // span)
    return {"index": idx + 1, "name": YOGA_NAMES[idx]}


def karana_of(moon_lon: float, sun_lon: float) -> dict:
    diff = (moon_lon - sun_lon) % 360
    k = int(diff // 6) + 1
    if k == 1:
        name = "Kimstughna"
    elif k >= 57:
        name = ["Shakuni", "Chatushpada", "Naga", "Kimstughna"][k - 57]
    else:
        name = KARANA_MOVABLE[(k - 2) % 7]
    return {"index": k, "name": name}


def panchang_for(when_utc: datetime, tz_name: str) -> dict:
    jd = swe.julday(when_utc.year, when_utc.month, when_utc.day,
                    when_utc.hour + when_utc.minute / 60 + when_utc.second / 3600)
    sun, _ = swe.calc_ut(jd, SWE_PLANETS["Sun"], FLAGS)
    moon, _ = swe.calc_ut(jd, SWE_PLANETS["Moon"], FLAGS)
    sun_lon = sun[0] % 360
    moon_lon = moon[0] % 360

    local_date = when_utc.astimezone(ZoneInfo(tz_name))
    weekday = WEEKDAYS[local_date.weekday()]
    nak_span = 360.0 / 27.0
    nak_idx = int(moon_lon // nak_span)

    return {
        "date": local_date.strftime("%Y-%m-%d"),
        "tz_name": tz_name,
        "weekday": weekday,
        "var_lord": VAR_LORDS[weekday],
        "tithi": tithi_of(moon_lon, sun_lon),
        "nakshatra": {"name": NAKSHATRAS[nak_idx][0], "lord": NAKSHATRAS[nak_idx][1]},
        "yoga": yoga_of(moon_lon, sun_lon),
        "karana": karana_of(moon_lon, sun_lon),
        "sun_sign": SIGN_NAMES[int(sun_lon // 30)],
        "moon_sign": SIGN_NAMES[int(moon_lon // 30)],
    }
