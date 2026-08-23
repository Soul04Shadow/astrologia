from __future__ import annotations

import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "get_transit",
            "description": "Get planetary transits (gochar) for a given date using Swiss Ephemeris. Use when the user asks about timing, future months, or what planets will be doing on a specific date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "at_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Date in YYYY-MM-DD format, e.g. 2027-06-01",
                    }
                },
                "required": ["at_date"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_panchang",
            "description": "Get Vedic panchang (tithi, nakshatra, yoga, karana, weekday, var-lord) for a given date at the birth place timezone.",
            "parameters": {
                "type": "object",
                "properties": {
                    "at_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Date in YYYY-MM-DD format, e.g. 2027-06-01",
                    }
                },
                "required": ["at_date"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_dasha_at",
            "description": "Get Vimshottari dasha (mahadasha / antardasha) active on a given date for this native. Use for timing and period questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "at_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Date in YYYY-MM-DD format, e.g. 2027-06-01",
                    }
                },
                "required": ["at_date"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_yogas",
            "description": "Get yogas detected in the birth chart (e.g., Gajakesari, Budhaditya, Panch Mahapurush). No parameters needed.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_navamsa",
            "description": "Get Navamsa D9 chart (sign per planet, vargottama) for this native. No parameters needed.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_chart_snapshot",
            "description": "Get a compact birth-chart snapshot (lagna, moon rashi, planets with houses/signs, current dasha) for grounding answers. No parameters needed.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
        },
    },
]


def _parse_at_date(raw: str) -> datetime:
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("at_date is required (YYYY-MM-DD)")
    s = raw.strip()
    # allow YYYY-MM-DD only; reject other garbage
    try:
        if "T" in s:
            # ISO datetime like 2027-06-01T00:00:00 or with Z
            iso = s.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso)
            # if no tz, leave naive; caller will localize
            if dt.tzinfo is not None:
                return dt.astimezone(timezone.utc)
            # treat as date part only
            # fall through to date parsing for naive
            # extract date part
            s_date = s.split("T")[0]
            d = datetime.strptime(s_date, "%Y-%m-%d")
            return d
        d = datetime.strptime(s, "%Y-%m-%d")
        return d
    except ValueError as e:
        raise ValueError(f"Invalid at_date '{raw}': expected YYYY-MM-DD, got '{raw}'") from e


def _at_date_to_utc(at_date_str: str, tz_name: str) -> datetime:
    d = _parse_at_date(at_date_str)
    # d is naive datetime at midnight; we convert to local noon in birth tz then UTC
    # if d already has tzinfo (from iso), it is already UTC
    if d.tzinfo is not None:
        return d.astimezone(timezone.utc)
    # naive -> treat as local noon on that date
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")
    local = datetime(d.year, d.month, d.day, 12, 0, tzinfo=tz)
    return local.astimezone(timezone.utc)


async def execute(name: str, args: dict | None, chart: dict) -> str:
    args = args or {}
    birth = chart.get("birth_details") or {}
    tz_name = birth.get("tz_name") or "UTC"
    lat = birth.get("latitude")
    lon = birth.get("longitude")

    if name == "get_transit":
        at_date = args.get("at_date")
        if not at_date:
            raise ValueError("get_transit requires at_date (YYYY-MM-DD)")
        when_utc = _at_date_to_utc(str(at_date), tz_name)
        from app.engine.transits import compute_transits

        positions = compute_transits(when_utc)
        result = {"at_date": str(at_date), "tz_name": tz_name, "computed_at_utc": when_utc.strftime("%Y-%m-%dT%H:%M:%SZ"), "positions": positions}
        return json.dumps(result, ensure_ascii=False)

    if name == "get_panchang":
        at_date = args.get("at_date")
        if not at_date:
            raise ValueError("get_panchang requires at_date (YYYY-MM-DD)")
        when_utc = _at_date_to_utc(str(at_date), tz_name)
        from app.engine.panchang import panchang_for

        result = panchang_for(when_utc, tz_name)
        return json.dumps(result, ensure_ascii=False)

    if name == "get_dasha_at":
        at_date = args.get("at_date")
        if not at_date:
            raise ValueError("get_dasha_at requires at_date (YYYY-MM-DD)")
        when_utc = _at_date_to_utc(str(at_date), tz_name)
        from app.engine.dasha import current_period, vimshottari

        # moon longitude from chart
        moon_lon = None
        if "planets" in chart and "Moon" in chart["planets"]:
            moon_lon = chart["planets"]["Moon"].get("longitude")
        if moon_lon is None:
            raise ValueError("Chart missing Moon longitude for dasha")
        # birth utc
        utc_str = birth.get("utc_time")
        if not utc_str:
            # fallback: birth date/time + tz
            try:
                bdate = birth.get("date")
                btime = birth.get("time")
                if bdate and btime:
                    y, m, d = map(int, bdate.split("-"))
                    hh, mm = map(int, btime.split(":"))
                    from app.engine.core import local_to_utc

                    birth_utc = local_to_utc(y, m, d, hh, mm, tz_name)
                else:
                    raise ValueError("Chart missing birth_details for dasha")
            except Exception as e:
                raise ValueError(f"Cannot determine birth UTC: {e}") from e
        else:
            try:
                birth_utc = datetime.strptime(utc_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
            except Exception as e:
                raise ValueError(f"Invalid birth utc_time '{utc_str}'") from e
        dasha = vimshottari(moon_lon, birth_utc)
        cur = current_period(dasha, when_utc)
        result = {"at_date": str(at_date), "when_utc": when_utc.strftime("%Y-%m-%dT%H:%M:%SZ"), "current": cur}
        return json.dumps(result, ensure_ascii=False)

    if name == "get_yogas":
        yogas = chart.get("yogas", [])
        return json.dumps({"yogas": yogas}, ensure_ascii=False)

    if name == "get_navamsa":
        nav = chart.get("navamsa_d9", {})
        return json.dumps({"navamsa_d9": nav}, ensure_ascii=False)

    if name == "get_chart_snapshot":
        # compact snapshot for grounding
        snap = {
            "birth_details": chart.get("birth_details"),
            "lagna": chart.get("lagna"),
            "moon_rashi": chart.get("moon_rashi"),
            "planets": chart.get("planets"),
            "dasha": {
                "current": chart.get("dasha", {}).get("current") if isinstance(chart.get("dasha"), dict) else None,
                "_llm_timeline": chart.get("dasha", {}).get("_llm_timeline") if isinstance(chart.get("dasha"), dict) else None,
            },
            "yogas": chart.get("yogas", []),
        }
        return json.dumps(snap, ensure_ascii=False)

    raise ValueError(f"Unknown tool '{name}'")
