from __future__ import annotations

from datetime import datetime, timezone

from .core import compute_d1, local_to_utc
from .dasha import current_period, timeline_for_llm, vimshottari
from .navamsa import navamsa_table
from .panchang import panchang_for
from .transits import compute_transits
from .yogas import detect_yogas


def compute_full_chart(year: int, month: int, day: int, hour: int, minute: int,
                       tz_name: str, lat: float, lon_geo: float,
                       include_transits: bool = True) -> dict:
    chart = compute_d1(year, month, day, hour, minute, tz_name, lat, lon_geo)

    birth_utc = datetime.strptime(chart["birth_details"]["utc_time"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    moon_lon = chart["planets"]["Moon"]["longitude"]

    dasha = vimshottari(moon_lon, birth_utc)
    chart["dasha"] = {
        "system": dasha["system"],
        "start_nakshatra": dasha["start_nakshatra"],
        "start_lord": dasha["start_lord"],
        "balance_at_birth_years": dasha["balance_at_birth_years"],
        "current": current_period(dasha, datetime.now(timezone.utc)),
        "mahadashas": [
            {"lord": m["lord"], "start_date": m["start_date"], "end_date": m["end_date"],
             "antardashas": [{"lord": a["lord"], "start_date": a["start_date"], "end_date": a["end_date"]}
                             for a in m["antardashas"]]}
            for m in dasha["mahadashas"]
        ],
        "_llm_timeline": timeline_for_llm(dasha, datetime.now(timezone.utc)),
    }

    chart["navamsa_d9"] = navamsa_table(chart["planets"])
    chart["yogas"] = detect_yogas(chart)
    chart.pop("_positions_raw", None)
    chart.pop("_jd", None)

    if include_transits:
        now_utc = datetime.now(timezone.utc)
        chart["transits_now"] = {"computed_at": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                                 "positions": compute_transits(now_utc)}
        try:
            chart["panchang_today"] = panchang_for(now_utc, tz_name)
        except Exception as e:
            chart["panchang_today"] = {"error": str(e)}

    return chart


def ground_truth_block(chart: dict, name: str = "") -> str:
    b = chart["birth_details"]
    l = chart["lagna"]
    m = chart["moon_rashi"]
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    lines = [
        "### DETERMINISTIC ASTROLOGICAL GROUND TRUTH (Swiss Ephemeris, Lahiri sidereal)",
        f"Subject: {name or 'the native'} | Birth: {b['date']} {b['time']} ({b['tz_name']}) at {b['latitude']:.4f}, {b['longitude']:.4f}",
        f"Today's real date: {today}",
        f"Lagna (Ascendant): {l['sign']} {l['degree']} | Lord: {l['lord']}",
        f"Moon Rashi: {m['sign']} | Nakshatra: {m['nakshatra']} pada {m['pada']} (lord {m['nakshatra_lord']})",
        "",
        "Planetary positions (D1 Rasi chart):",
    ]
    for pname, p in chart["planets"].items():
        flags = []
        if p["dignity"] != "Neutral":
            flags.append(p["dignity"])
        if p.get("retrograde"):
            flags.append("Retrograde")
        if p.get("combust"):
            flags.append("Combust")
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        nak = p["nakshatra"]
        lines.append(f"- {pname}: {p['sign']} {p['degree']}, House {p['house']}{flag_str} | Nakshatra {nak['name']} pada {nak['pada']} (lord {nak['lord']})")

    lines.append("")
    d9 = chart.get("navamsa_d9", {})
    if d9:
        lines.append("Navamsa (D9) signs:")
        lines.append(", ".join(f"{p}: {v['sign']}" for p, v in d9.items()))
        lines.append("")

    if chart.get("dasha"):
        lines.append("Vimshottari Dasha status:")
        lines.append(chart["dasha"]["_llm_timeline"])
        lines.append("")

    if chart.get("yogas"):
        lines.append("Yogas detected in this chart:")
        for y in chart["yogas"]:
            lines.append(f"- {y['name']}: {y['basis']}")
        lines.append("")

    if chart.get("transits_now"):
        t = chart["transits_now"]["positions"]
        lines.append(f"Current transits (gochar) as of {chart['transits_now']['computed_at']}:")
        lines.append(", ".join(f"{p} in {v['sign']}{' (R)' if v['retrograde'] else ''}" for p, v in t.items()))

    return "\n".join(lines)
