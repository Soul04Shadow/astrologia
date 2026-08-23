from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

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
            "sign_index": si["index"],
            "degree": deg_to_dms(si["degree_in_sign"]),
            "retrograde": bool(pos[3] < 0),
            "dignity": dignity_of(name, lon),
            "nakshatra": nakshatra_of(lon)["name"],
        }
    ketu_lon = (out["Rahu"]["longitude"] + 180) % 360
    ksi = sign_info(ketu_lon)
    out["Ketu"] = {
        "longitude": round(ketu_lon, 6),
        "sign": ksi["name"],
        "sign_index": ksi["index"],
        "degree": deg_to_dms(ksi["degree_in_sign"]),
        "retrograde": False,
        "dignity": "Neutral",
        "nakshatra": nakshatra_of(ketu_lon)["name"],
    }
    return {k: out[k] for k in PLANET_ORDER}


def compute_sade_sati_details(natal_moon_sign_idx: int, when_utc: Optional[datetime] = None) -> dict:
    """
    Computes detailed Sade Sati, Kantaka Shani, and Ashtama Shani status for the natal Moon.
    """
    if when_utc is None:
        when_utc = datetime.now(timezone.utc)

    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)
    jd = swe.julday(when_utc.year, when_utc.month, when_utc.day,
                    when_utc.hour + when_utc.minute / 60 + when_utc.second / 3600)
    pos, _ = swe.calc_ut(jd, SWE_PLANETS["Saturn"], FLAGS)
    sat_lon = pos[0] % 360
    sat_sign_idx = int(sat_lon // 30)

    diff_from_moon = (sat_sign_idx - natal_moon_sign_idx) % 12

    # Sade Sati signs: 12th (diff=11), 1st (diff=0), 2nd (diff=1)
    is_sade_sati = diff_from_moon in (11, 0, 1)
    phase_name = None
    if diff_from_moon == 11:
        phase_name = "1st Phase (Rising / Aardh) - Saturn in 12th from Moon"
    elif diff_from_moon == 0:
        phase_name = "2nd Phase (Peak / Janma Shani) - Saturn conjunct natal Moon"
    elif diff_from_moon == 1:
        phase_name = "3rd Phase (Setting / Asta) - Saturn in 2nd from Moon"

    is_kantaka = diff_from_moon == 3  # 4th from Moon
    is_ashtama = diff_from_moon == 7  # 8th from Moon

    status_summary = []
    if is_sade_sati:
        status_summary.append(f"Active Sade Sati: {phase_name}")
    elif is_kantaka:
        status_summary.append("Active Kantaka / Dhannayya Shani (Saturn in 4th from natal Moon)")
    elif is_ashtama:
        status_summary.append("Active Ashtama Shani (Saturn in 8th from natal Moon - high transformation period)")
    else:
        status_summary.append(f"No major Saturn transit affliction (Saturn in House {diff_from_moon + 1} from Moon)")

    return {
        "saturn_current_sign": SIGN_NAMES[sat_sign_idx],
        "saturn_current_degree": deg_to_dms(sat_lon % 30),
        "saturn_is_retrograde": bool(pos[3] < 0),
        "natal_moon_sign": SIGN_NAMES[natal_moon_sign_idx],
        "is_sade_sati": is_sade_sati,
        "sade_sati_phase": phase_name,
        "is_kantaka_shani": is_kantaka,
        "is_ashtama_shani": is_ashtama,
        "summary": " | ".join(status_summary),
    }


def compute_guru_gochar(natal_moon_sign_idx: int, when_utc: Optional[datetime] = None) -> dict:
    """
    Computes Guru Gochar (Jupiter Transit) from natal Moon.
    Favorable houses from Moon: 2, 5, 7, 9, 11.
    """
    if when_utc is None:
        when_utc = datetime.now(timezone.utc)

    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)
    jd = swe.julday(when_utc.year, when_utc.month, when_utc.day,
                    when_utc.hour + when_utc.minute / 60 + when_utc.second / 3600)
    pos, _ = swe.calc_ut(jd, SWE_PLANETS["Jupiter"], FLAGS)
    jup_lon = pos[0] % 360
    jup_sign_idx = int(jup_lon // 30)

    house_from_moon = ((jup_sign_idx - natal_moon_sign_idx) % 12) + 1
    is_favorable = house_from_moon in (2, 5, 7, 9, 11)

    return {
        "jupiter_current_sign": SIGN_NAMES[jup_sign_idx],
        "jupiter_current_degree": deg_to_dms(jup_lon % 30),
        "jupiter_is_retrograde": bool(pos[3] < 0),
        "house_from_natal_moon": house_from_moon,
        "is_favorable_transit": is_favorable,
        "summary": f"Jupiter transiting House {house_from_moon} from natal Moon ({'Auspicious / Expanding' if is_favorable else 'Requires spiritual alignment'})",
    }
