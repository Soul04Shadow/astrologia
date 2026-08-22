from __future__ import annotations

from datetime import datetime

import swisseph as swe

from .constants import PLANET_ORDER, SIGN_NAMES
from .core import FLAGS, SWE_PLANETS, deg_to_dms, dignity_of, nakshatra_of, sign_info


def compute_transits(when_utc: datetime) -> dict[str, dict]:
    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)
    jd = swe.julday(when_utc.year, when_utc.month, when_utc.day,
                    when_utc.hour + when_utc.minute / 60 + when_utc.second / 3600)
    out = {}
    for name in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"]:
        pos, _ = swe.calc_ut(jd, SWE_PLANETS[name], FLAGS)
        lon = pos[0] % 360
        si = sign_info(lon)
        out[name] = {
            "longitude": round(lon, 6),
            "sign": si["name"],
            "degree": deg_to_dms(si["degree_in_sign"]),
            "retrograde": bool(pos[3] < 0),
            "dignity": dignity_of(name, lon),
            "nakshatra": nakshatra_of(lon)["name"],
        }
    ketu_lon = (out["Rahu"]["longitude"] + 180) % 360
    ksi = sign_info(ketu_lon)
    out["Ketu"] = {"longitude": round(ketu_lon, 6), "sign": ksi["name"],
                   "degree": deg_to_dms(ksi["degree_in_sign"]), "retrograde": False,
                   "dignity": "Neutral", "nakshatra": nakshatra_of(ketu_lon)["name"]}
    return {k: out[k] for k in PLANET_ORDER}
