from __future__ import annotations

import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.engine.ashtakavarga import compute_ashtakavarga
from app.engine.shadbala import compute_shadbala
from app.engine.transits import compute_guru_gochar, compute_sade_sati_details
from app.engine.vargas import compute_varga_chart


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
            "name": "get_ashtakavarga",
            "description": "Get Ashtakavarga Sarvashtakavarga (SAV) points for all 12 houses and Bhinnashtakavarga (BAV) matrices. Use to determine house strength, fruition capacity, and transit resilience.",
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
            "name": "get_shadbala",
            "description": "Get Shadbala 6-fold planetary strengths (in Rupas, Virupas, and strength ratios) to assess which planets have real capacity to deliver results vs. which are weak.",
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
            "name": "get_varga_chart",
            "description": "Get a specific Vedic Divisional Chart (Varga): D10 (Dashamsha - Career & Status), D7 (Saptamsha - Progeny & Relationships), D3 (Drekkana - Siblings & Vitality), D12 (Dwadashamsha - Parents & Ancestral Karma), D30 (Trimshamsha - Arishta & Afflictions), or D9 (Navamsa).",
            "parameters": {
                "type": "object",
                "properties": {
                    "varga": {
                        "type": "string",
                        "enum": ["D10", "D7", "D3", "D9", "D12", "D30"],
                        "description": "The divisional chart code (e.g. 'D10' for career, 'D7' for children, 'D30' for afflictions)",
                    }
                },
                "required": ["varga"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sade_sati_details",
            "description": "Get detailed Saturn Sade Sati status (Rising/Peak/Setting phase), Kantaka Shani, Ashtama Shani, and Jupiter Gochar from natal Moon.",
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
            "description": "Get a compact birth-chart snapshot (lagna, moon rashi, planets with houses/signs, current dasha, Ashtakavarga, Shadbala) for grounding answers. No parameters needed.",
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
    try:
        if "T" in s:
            iso = s.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso)
            if dt.tzinfo is not None:
                return dt.astimezone(timezone.utc)
            s_date = s.split("T")[0]
            d = datetime.strptime(s_date, "%Y-%m-%d")
            return d
        d = datetime.strptime(s, "%Y-%m-%d")
        return d
    except ValueError as e:
        raise ValueError(f"Invalid at_date '{raw}': expected YYYY-MM-DD, got '{raw}'") from e


def _at_date_to_utc(at_date_str: str, tz_name: str) -> tuple[datetime, datetime]:
    d = _parse_at_date(at_date_str)
    tz = ZoneInfo(tz_name)
    local_noon = datetime(d.year, d.month, d.day, 12, 0, 0, tzinfo=tz)
    when_utc = local_noon.astimezone(timezone.utc)
    return d, when_utc


async def execute(name: str, args: dict, chart: dict) -> str:
    birth = chart.get("birth_details", {})
    tz_name = birth.get("tz_name", "UTC")

    if name == "get_transit":
        at_date_str = args.get("at_date")
        if not at_date_str:
            raise ValueError("Parameter 'at_date' (YYYY-MM-DD) is required for get_transit")
        at_date, when_utc = _at_date_to_utc(at_date_str, tz_name)
        from app.engine.transits import compute_transits

        trans = compute_transits(when_utc)
        result = {
            "at_date": str(at_date),
            "when_utc": when_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "transits": trans,
        }
        return json.dumps(result, ensure_ascii=False)

    if name == "get_panchang":
        at_date_str = args.get("at_date")
        if not at_date_str:
            raise ValueError("Parameter 'at_date' (YYYY-MM-DD) is required for get_panchang")
        at_date, when_utc = _at_date_to_utc(at_date_str, tz_name)
        from app.engine.panchang import panchang_for

        panch = panchang_for(when_utc, tz_name)
        result = {
            "at_date": str(at_date),
            "when_utc": when_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "panchang": panch,
        }
        return json.dumps(result, ensure_ascii=False)

    if name == "get_dasha_at":
        at_date_str = args.get("at_date")
        if not at_date_str:
            raise ValueError("Parameter 'at_date' (YYYY-MM-DD) is required for get_dasha_at")
        at_date, when_utc = _at_date_to_utc(at_date_str, tz_name)
        from app.engine.dasha import current_period, vimshottari

        moon_lon = None
        if "planets" in chart and "Moon" in chart["planets"]:
            moon_lon = chart["planets"]["Moon"].get("longitude")
        if moon_lon is None:
            raise ValueError("Chart missing Moon longitude for dasha")
        utc_str = birth.get("utc_time")
        if not utc_str:
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

    if name == "get_ashtakavarga":
        av = chart.get("ashtakavarga")
        if not av and "planets" in chart and "lagna" in chart:
            av = compute_ashtakavarga(chart["planets"], chart["lagna"]["sign_index"])
        return json.dumps({"ashtakavarga": av}, ensure_ascii=False)

    if name == "get_shadbala":
        sb = chart.get("shadbala")
        if not sb and "planets" in chart:
            sb = compute_shadbala(chart["planets"])
        return json.dumps({"shadbala": sb}, ensure_ascii=False)

    if name == "get_varga_chart":
        varga = args.get("varga", "D10").upper()
        vargas = chart.get("vargas", {})
        if varga in vargas:
            return json.dumps({"varga_chart": vargas[varga]}, ensure_ascii=False)
        elif "planets" in chart and "lagna" in chart:
            vc = compute_varga_chart(chart["planets"], chart["lagna"]["longitude"], varga=varga)
            return json.dumps({"varga_chart": vc}, ensure_ascii=False)
        raise ValueError(f"Unable to calculate varga chart '{varga}'")

    if name == "get_sade_sati_details":
        sade_sati = chart.get("sade_sati")
        guru_gochar = chart.get("guru_gochar")
        if not sade_sati and "moon_rashi" in chart:
            sade_sati = compute_sade_sati_details(chart["moon_rashi"]["sign_index"])
        if not guru_gochar and "moon_rashi" in chart:
            guru_gochar = compute_guru_gochar(chart["moon_rashi"]["sign_index"])
        return json.dumps({"sade_sati": sade_sati, "guru_gochar": guru_gochar}, ensure_ascii=False)

    if name == "get_yogas":
        yogas = chart.get("yogas", [])
        return json.dumps({"yogas": yogas}, ensure_ascii=False)

    if name == "get_navamsa":
        nav = chart.get("navamsa_d9", {})
        return json.dumps({"navamsa_d9": nav}, ensure_ascii=False)

    if name == "get_chart_snapshot":
        snap = {
            "birth_details": chart.get("birth_details"),
            "lagna": chart.get("lagna"),
            "moon_rashi": chart.get("moon_rashi"),
            "planets": chart.get("planets"),
            "analysis": chart.get("analysis"),
            "ashtakavarga": chart.get("ashtakavarga"),
            "shadbala": chart.get("shadbala"),
            "sade_sati": chart.get("sade_sati"),
            "dasha": {
                "current": chart.get("dasha", {}).get("current") if isinstance(chart.get("dasha"), dict) else None,
                "_llm_timeline": chart.get("dasha", {}).get("_llm_timeline") if isinstance(chart.get("dasha"), dict) else None,
            },
            "yogas": chart.get("yogas", []),
        }
        return json.dumps(snap, ensure_ascii=False)

    raise ValueError(f"Unknown tool '{name}'")
