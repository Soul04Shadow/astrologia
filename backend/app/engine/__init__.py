from __future__ import annotations

from datetime import datetime, timezone

from .analysis import compute_drishti, compute_health_and_maraka_analysis, compute_house_lordships
from .constants import SIGN_NAMES
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
    from .navamsa import navamsa_sign
    lagna_nav = navamsa_sign(chart["lagna"]["longitude"])
    chart["navamsa_d9"] = {
        "Lagna": {
            "sign": SIGN_NAMES[lagna_nav],
            "sign_index": lagna_nav,
            "vargottama": lagna_nav == chart["lagna"]["sign_index"],
        },
        **chart["navamsa_d9"],
    }
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

    # Compute comprehensive lordships, aspects, and health/Maraka profile
    chart["analysis"] = compute_health_and_maraka_analysis(chart)

    return chart


def ground_truth_block(chart: dict, name: str = "") -> str:
    b = chart["birth_details"]
    l = chart["lagna"]
    m = chart["moon_rashi"]
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    
    analysis = chart.get("analysis")
    if not analysis:
        analysis = compute_health_and_maraka_analysis(chart)
        
    lordships = analysis["lordships"]
    planet_roles = lordships["planet_roles"]
    
    lines = [
        "### DETERMINISTIC ASTROLOGICAL GROUND TRUTH (Swiss Ephemeris, Lahiri sidereal)",
        f"Subject: {name or 'the native'} | Birth: {b['date']} {b['time']} ({b['tz_name']}) at {b['latitude']:.4f}, {b['longitude']:.4f}",
        f"Today's real date: {today}",
        f"Lagna (Ascendant): {l['sign']} {l['degree']} | Lagna Lord: {l['lord']}",
        f"Moon Rashi: {m['sign']} | Nakshatra: {m['nakshatra']} pada {m['pada']} (lord {m['nakshatra_lord']})",
        "",
        "Planetary positions & House Lordships (D1 Rasi chart):",
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
        roles_info = planet_roles.get(pname, {}).get("summary", "")
        role_part = f" | {roles_info}" if roles_info else ""
        lines.append(f"- {pname}: {p['sign']} {p['degree']}, House {p['house']}{flag_str} | Nakshatra {nak['name']} pada {nak['pada']} (lord {nak['lord']}){role_part}")

    lines.append("")
    lines.append("Functional Roles & House Governance:")
    roles_list = []
    for pname, prole in planet_roles.items():
        if prole["roles"]:
            roles_list.append(f"- {pname}: {', '.join(prole['roles'])} (Rules House {', '.join(str(h) for h in prole['houses_ruled'])})")
    lines.extend(roles_list)
    lines.append(f"- Badhaka: House {lordships['badhaka']['house']} (Lord: {lordships['badhaka']['lord']})")

    lines.append("")
    lines.append("Planetary Aspects (Drishti):")
    drishti = analysis["drishti"]
    for pname, d in drishti.items():
        lines.append(f"- {d['summary']}")

    lines.append("")
    lines.append("Health (Roga), Longevity (Ayurdaya), Dusthana & Maraka Analysis:")
    h6 = analysis["h6"]
    h8 = analysis["h8"]
    h12 = analysis["h12"]
    marakas = analysis["marakas"]
    
    h6_occ = f", Planets in 6th: {', '.join(h6['occupants'])}" if h6['occupants'] else ", No planets residing"
    h6_asp = f", Aspected by: {', '.join(h6['aspects'])}" if h6['aspects'] else ", No aspects"
    lines.append(f"- 6th House (Roga / Acute Diseases / Immunity): {h6['sign']} (Lord: {h6['lord']}{h6_occ}{h6_asp})")

    h8_occ = f", Planets in 8th: {', '.join(h8['occupants'])}" if h8['occupants'] else ", No planets residing"
    h8_asp = f", Aspected by: {', '.join(h8['aspects'])}" if h8['aspects'] else ", No aspects"
    lines.append(f"- 8th House (Ayurdaya / Longevity / Chronic Illness / Crises): {h8['sign']} (Lord: {h8['lord']}{h8_occ}{h8_asp})")

    h12_occ = f", Planets in 12th: {', '.join(h12['occupants'])}" if h12['occupants'] else ", No planets residing"
    lines.append(f"- 12th House (Vyaya / Hospitalization / Isolation): {h12['sign']} (Lord: {h12['lord']}{h12_occ})")

    lines.append(f"- Maraka Sthanas (2nd & 7th Houses): Primary Maraka Lords = {', '.join(marakas['lords'])}; Resident planets in Maraka houses = {', '.join(marakas['occupants']) if marakas['occupants'] else 'None'}")
    
    if analysis["current_dasha_vulnerabilities"]:
        lines.append("- Active Dasha Timing Alerts:")
        for alert in analysis["current_dasha_vulnerabilities"]:
            lines.append(f"  * {alert}")
    else:
        lines.append("- Active Dasha Timing: No acute Maraka or Dusthana lord active currently.")

    lines.append(f"- Sade Sati Status: {analysis['sade_sati']}")

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
