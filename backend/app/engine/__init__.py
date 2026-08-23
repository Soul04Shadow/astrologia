from __future__ import annotations

from datetime import datetime, timezone

from .analysis import compute_drishti, compute_health_and_maraka_analysis, compute_house_lordships
from .ashtakavarga import compute_ashtakavarga
from .constants import SIGN_NAMES
from .core import compute_d1, local_to_utc
from .dasha import current_period, timeline_for_llm, vimshottari
from .navamsa import navamsa_table
from .panchang import panchang_for
from .shadbala import compute_shadbala
from .transits import compute_guru_gochar, compute_sade_sati_details, compute_transits
from .vargas import compute_varga_chart
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

    # Navamsa D9
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

    # Divisional Charts (D10 Dashamsha, D7 Saptamsha, D3 Drekkana, D12 Dwadashamsha, D30 Trimshamsha)
    chart["vargas"] = {
        "D10": compute_varga_chart(chart["planets"], chart["lagna"]["longitude"], "D10"),
        "D7": compute_varga_chart(chart["planets"], chart["lagna"]["longitude"], "D7"),
        "D3": compute_varga_chart(chart["planets"], chart["lagna"]["longitude"], "D3"),
        "D12": compute_varga_chart(chart["planets"], chart["lagna"]["longitude"], "D12"),
        "D30": compute_varga_chart(chart["planets"], chart["lagna"]["longitude"], "D30"),
    }

    # Ashtakavarga (BAV & SAV 337 points)
    chart["ashtakavarga"] = compute_ashtakavarga(chart["planets"], chart["lagna"]["sign_index"])

    # Shadbala (6-fold Planetary Strengths)
    birth_hour_local = hour + minute / 60.0
    # Determine Shukla / Krishna Paksha
    sun_lon = chart["planets"]["Sun"]["longitude"]
    moon_lon = chart["planets"]["Moon"]["longitude"]
    is_shukla = ((moon_lon - sun_lon) % 360) < 180
    chart["shadbala"] = compute_shadbala(chart["planets"], birth_hour_local=birth_hour_local, is_shukla_paksha=is_shukla)

    # Yogas
    chart["yogas"] = detect_yogas(chart)
    chart.pop("_positions_raw", None)
    chart.pop("_jd", None)

    # Live Transits, Sade Sati & Guru Gochar
    if include_transits:
        now_utc = datetime.now(timezone.utc)
        chart["transits_now"] = {"computed_at": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                                 "positions": compute_transits(now_utc)}
        try:
            chart["panchang_today"] = panchang_for(now_utc, tz_name)
        except Exception as e:
            chart["panchang_today"] = {"error": str(e)}

    chart["sade_sati"] = compute_sade_sati_details(chart["moon_rashi"]["sign_index"])
    chart["guru_gochar"] = compute_guru_gochar(chart["moon_rashi"]["sign_index"])

    # Comprehensive lordships, aspects, and health/Maraka profile
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
        roles_str = f" | {roles_info}" if roles_info else ""
        lines.append(
            f"- {pname}: {p['sign']} {p['degree']} (House {p['house']}){flag_str} "
            f"in {nak['name']} pada {nak['pada']} (lord {nak['lord']}){roles_str}"
        )

    # Ashtakavarga SAV Summary
    av = chart.get("ashtakavarga")
    if av:
        sav_houses = av.get("sav_by_house", {})
        sav_summary = ", ".join(f"H{h}:{pts}pts" for h, pts in sorted(sav_houses.items()))
        lines.extend([
            "",
            f"Ashtakavarga (Sarvashtakavarga SAV Points per House, Total={av.get('total_bindus', 337)}):",
            f"- {sav_summary} (Average=28 pts. ≥30=Strong fruition, ≤25=Friction/Delays)",
        ])

    # Shadbala Summary
    sb = chart.get("shadbala")
    if sb:
        sb_parts = []
        for p, d in sb.items():
            sb_parts.append(f"{p}: {d['total_rupas']}R ({d['strength_ratio']}x req, {d['status'].split(' ')[0]})")
        lines.extend([
            "",
            "Shadbala Planetary Strengths (in Rupas & Ratio to Minimum Required):",
            f"- {', '.join(sb_parts)}",
        ])

    # D10 Dashamsha Summary
    d10 = chart.get("vargas", {}).get("D10")
    if d10:
        d10_lagna = d10["lagna"]["sign"]
        d10_planets = [f"{p} in H{data['house']} ({data['sign']})" for p, data in d10["planets"].items() if p in ("Sun", "Mars", "Jupiter", "Saturn", "Mercury")]
        lines.extend([
            "",
            f"Dashamsha (D10 Career Chart) - D10 Lagna: {d10_lagna}:",
            f"- Key Placements: {', '.join(d10_planets)}",
        ])

    # Sade Sati & Guru Gochar Summary
    sade_sati = chart.get("sade_sati")
    guru_gochar = chart.get("guru_gochar")
    if sade_sati or guru_gochar:
        lines.extend([
            "",
            "Active Saturn & Jupiter Transit Profile:",
        ])
        if sade_sati:
            lines.append(f"- Saturn Transit / Sade Sati: {sade_sati['summary']}")
        if guru_gochar:
            lines.append(f"- Jupiter Gochar: {guru_gochar['summary']}")

    # House Functional Roles
    lines.extend([
        "",
        "Key Functional Role Classifications:",
        f"- Lagna Lord: {l['lord']} (Overall vitality, self, health direction)",
        f"- Yogakaraka: {', '.join(p for p, r in planet_roles.items() if 'Yogakaraka' in r.get('roles', [])) or 'None'}",
        f"- Maraka Lords (2nd & 7th houses of vulnerability): {', '.join(lordships['maraka_lords'])}",
        f"- Dusthana Lords (6th Roga, 8th Ayur, 12th Vyaya): 6th={lordships['dusthana_lords'][6]}, 8th={lordships['dusthana_lords'][8]}, 12th={lordships['dusthana_lords'][12]}",
        f"- Badhaka Lord: {lordships['badhaka']['lord']} (Rules House {lordships['badhaka']['house']})",
    ])

    # Planetary Aspects (Drishti)
    lines.extend([
        "",
        "Planetary Aspects (Drishti):",
    ])
    aspects_map = analysis.get("aspects") or analysis.get("drishti", {})
    for pname, d_info in aspects_map.items():
        if d_info.get("aspected_houses"):
            lines.append(f"- {pname} aspects: {d_info.get('aspect_summary', d_info.get('summary', ''))}")

    # Health, Longevity & Dasha Vulnerability Profile
    health = analysis.get("health_profile")
    if health:
        lines.extend([
            "",
            "Classical Health (Roga) & Longevity (Ayurdaya) Indicators:",
            f"- 6th House (Acute Illness / Roga / Immunity): {health.get('house_6_sign')} (Lord: {health.get('house_6_lord')}) | Occupants: {', '.join(health.get('house_6_occupants', [])) or 'Empty'}",
            f"- 8th House (Longevity / Chronic Conditions / Deep Healing): {health.get('house_8_sign')} (Lord: {health.get('house_8_lord')}) | Occupants: {', '.join(health.get('house_8_occupants', [])) or 'Empty'}",
            f"- 12th House (Hospitalization / Recuperation / Subconscious): {health.get('house_12_sign')} (Lord: {health.get('house_12_lord')}) | Occupants: {', '.join(health.get('house_12_occupants', [])) or 'Empty'}",
            f"- Maraka Houses (2nd & 7th): 2nd House={health.get('house_2_sign')} ({health.get('house_2_lord')}), 7th House={health.get('house_7_sign')} ({health.get('house_7_lord')})",
            f"- Key Health Karakas: {', '.join(f'{k}: {v}' for k, v in health.get('karakas', {}).items())}",
        ])

    # Yogas
    if chart.get("yogas"):
        lines.extend([
            "",
            "Detected Yogas:",
            *[f"- **{y['name']}**: {y.get('basis') or y.get('description', '')}" for y in chart["yogas"]],
        ])

    # Dasha Timeline
    cur = chart["dasha"]["current"]
    lines.extend([
        "",
        f"Active Dasha: {cur['mahadasha']['lord']}-{cur['antardasha']['lord']} "
        f"(ends {cur['antardasha']['end_date']})",
        f"Mahadasha: {cur['mahadasha']['lord']} ({cur['mahadasha']['start_date']} to {cur['mahadasha']['end_date']})",
        "",
        "Vimshottari Dasha Timeline (upcoming periods):",
        chart["dasha"]["_llm_timeline"],
    ])

    return "\n".join(lines)
