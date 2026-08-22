from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import swisseph as swe

from .constants import (
    COMBUST_ORB,
    DEBILITATION_SIGN,
    EXALTATION_SIGN,
    MOOLATRIKONA,
    NAKSHATRAS,
    OWN_SIGN,
    PLANET_ORDER,
    SIGN_LORDS,
    SIGN_NAMES,
    SIGN_SANSKRIT,
)

SWE_PLANETS = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mars": swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS,
    "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE,
}

FLAGS = swe.FLG_MOSEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED


def setup() -> None:
    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)


def local_to_utc(year: int, month: int, day: int, hour: int, minute: int, tz_name: str) -> datetime:
    tz = ZoneInfo(tz_name)
    local = datetime(year, month, day, hour, minute, tzinfo=tz)
    return local.astimezone(ZoneInfo("UTC"))


def utc_to_jd(utc_dt: datetime) -> float:
    return swe.julday(utc_dt.year, utc_dt.month, utc_dt.day,
                      utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600)


def deg_to_dms(deg: float) -> str:
    d = int(deg)
    m_full = (deg - d) * 60
    m = int(m_full)
    s = round((m_full - m) * 60)
    if s == 60:
        s = 0
        m += 1
    if m == 60:
        m = 0
        d += 1
    return f"{d:02d}°{m:02d}'{s:02d}\""


def nakshatra_of(lon: float) -> dict:
    span = 360.0 / 27.0
    idx = int((lon % 360) / span)
    name, lord = NAKSHATRAS[idx % 27]
    rem = lon - idx * span
    pada = int(rem / (span / 4.0)) + 1
    return {"name": name, "lord": lord, "pada": pada, "frac_elapsed": rem / span}


def sign_info(lon: float) -> dict:
    lon %= 360
    idx = int(lon // 30)
    return {"index": idx, "name": SIGN_NAMES[idx], "sanskrit": SIGN_SANSKRIT[SIGN_NAMES[idx]],
            "degree_in_sign": lon % 30, "lord": SIGN_LORDS[idx]}


def dignity_of(planet: str, lon: float) -> str:
    if planet not in EXALTATION_SIGN:
        return "Neutral"
    s = sign_info(lon)["index"]
    deg = lon % 30
    mt = MOOLATRIKONA.get(planet)
    if mt and s == mt[0] and mt[1] <= deg < mt[2]:
        return "Moolatrikona"
    if s == EXALTATION_SIGN[planet]:
        return "Exalted"
    if s == DEBILITATION_SIGN[planet]:
        return "Debilitated"
    if s in OWN_SIGN[planet]:
        return "Own Sign"
    return "Neutral"


def angular_distance(a: float, b: float) -> float:
    diff = abs(a - b) % 360
    return min(diff, 360 - diff)


def raw_positions(jd: float) -> dict[str, dict]:
    out = {}
    for name, pid in SWE_PLANETS.items():
        pos, _ = swe.calc_ut(jd, pid, FLAGS)
        lon = pos[0] % 360
        speed = pos[3]
        out[name] = {"lon": lon, "speed": speed, "retro": bool(speed < 0)}
    rahu = out["Rahu"]["lon"]
    out["Ketu"] = {"lon": (rahu + 180) % 360, "speed": out["Rahu"]["speed"], "retro": False}
    return out


def build_planets(positions: dict[str, dict], lagna_sign: int) -> dict[str, dict]:
    planets = {}
    sun_lon = positions["Sun"]["lon"]
    for name in PLANET_ORDER:
        p = positions[name]
        si = sign_info(p["lon"])
        combust = False
        if name != "Sun" and name != "Rahu" and name != "Ketu":
            combust = angular_distance(p["lon"], sun_lon) < COMBUST_ORB[name]
        planets[name] = {
            "longitude": round(p["lon"], 6),
            "sign": si["name"],
            "sign_index": si["index"],
            "degree": deg_to_dms(si["degree_in_sign"]),
            "house": ((si["index"] - lagna_sign) % 12) + 1,
            "sign_lord": si["lord"],
            "retrograde": p["retro"],
            "combust": combust,
            "dignity": dignity_of(name, p["lon"]),
            **{"nakshatra": nakshatra_of(p["lon"])},
        }
    return planets


def compute_d1(year: int, month: int, day: int, hour: int, minute: int, tz_name: str, lat: float, lon_geo: float) -> dict:
    setup()
    utc_dt = local_to_utc(year, month, day, hour, minute, tz_name)
    jd = utc_to_jd(utc_dt)
    cusps, ascmc = swe.houses_ex(jd, lat, lon_geo, b'W', swe.FLG_SIDEREAL)
    lagna_lon = ascmc[swe.ASC] % 360
    lagna_sign_idx = int(lagna_lon // 30)
    positions = raw_positions(jd)
    planets = build_planets(positions, lagna_sign_idx)
    moon = planets["Moon"]
    lagna_si = sign_info(lagna_lon)
    return {
        "birth_details": {
            "date": f"{year:04d}-{month:02d}-{day:02d}",
            "time": f"{hour:02d}:{minute:02d}",
            "tz_name": tz_name,
            "utc_time": utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "latitude": lat,
            "longitude": lon_geo,
            "julian_day": round(jd, 6),
        },
        "lagna": {
            "sign": lagna_si["name"],
            "sanskrit": lagna_si["sanskrit"],
            "sign_index": lagna_sign_idx,
            "degree": deg_to_dms(lagna_si["degree_in_sign"]),
            "longitude": round(lagna_lon, 6),
            "lord": lagna_si["lord"],
            "nakshatra": nakshatra_of(lagna_lon),
        },
        "moon_rashi": {
            "sign": moon["sign"],
            "house": moon["house"],
            "nakshatra": moon["nakshatra"]["name"],
            "pada": moon["nakshatra"]["pada"],
            "nakshatra_lord": moon["nakshatra"]["lord"],
        },
        "planets": planets,
        "_positions_raw": {k: v["lon"] for k, v in positions.items()},
        "_jd": jd,
    }
