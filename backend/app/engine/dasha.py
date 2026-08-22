from __future__ import annotations

from datetime import datetime, timedelta

from .constants import DASHA_ORDER, DASHA_YEAR_DAYS, DASHA_YEARS, DASHA_YEARS_TOTAL
from .core import nakshatra_of


def _fmt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def vimshottari(moon_longitude: float, birth_utc: datetime, years_ahead: float = 120.0) -> dict:
    nak = nakshatra_of(moon_longitude)
    start_lord = nak["lord"]
    start_idx = DASHA_ORDER.index(start_lord)
    first_years = DASHA_YEARS[start_lord] * (1.0 - nak["frac_elapsed"])
    year_days = DASHA_YEAR_DAYS

    mahadashas = []
    cursor = birth_utc
    total_end_days = DASHA_YEARS_TOTAL * (years_ahead / DASHA_YEARS_TOTAL)
    i = 0
    while True:
        lord = DASHA_ORDER[(start_idx + i) % 9]
        maha_days = (first_years if i == 0 else DASHA_YEARS[lord]) * year_days
        maha_start = cursor
        maha_end = maha_start + timedelta(days=maha_days)
        antars = []
        a_cursor = maha_start
        a_idx = (start_idx + i) % 9
        for j in range(9):
            sub_lord = DASHA_ORDER[(a_idx + j) % 9]
            sub_days = maha_days * (DASHA_YEARS[sub_lord] / DASHA_YEARS_TOTAL)
            sub_start = a_cursor
            sub_end = a_cursor + timedelta(days=sub_days)
            antars.append({"lord": sub_lord, "start": sub_start, "end": sub_end,
                           "start_date": _fmt(sub_start), "end_date": _fmt(sub_end)})
            a_cursor = sub_end
        mahadashas.append({"lord": lord, "start": maha_start, "end": maha_end,
                           "start_date": _fmt(maha_start), "end_date": _fmt(maha_end),
                           "antardashas": antars})
        if (maha_end - birth_utc).days > years_ahead * year_days or i > 10:
            break
        cursor = maha_end
        i += 1

    return {
        "system": "Vimshottari",
        "year_length_days": year_days,
        "start_nakshatra": nak["name"],
        "start_lord": start_lord,
        "balance_at_birth_years": round(first_years, 4),
        "mahadashas": mahadashas,
    }


def current_period(dasha: dict, when_utc: datetime) -> dict:
    for m in dasha["mahadashas"]:
        if m["start"] <= when_utc < m["end"]:
            current_antar = None
            next_antar = None
            for idx, a in enumerate(m["antardashas"]):
                if a["start"] <= when_utc < a["end"]:
                    current_antar = a
                    next_antar = m["antardashas"][idx + 1] if idx + 1 < len(m["antardashas"]) else None
                    break
            return {
                "mahadasha": {"lord": m["lord"], "start_date": m["start_date"], "end_date": m["end_date"]},
                "antardasha": {"lord": current_antar["lord"], "start_date": current_antar["start_date"],
                               "end_date": current_antar["end_date"]} if current_antar else None,
                "next_antardasha": {"lord": next_antar["lord"], "start_date": next_antar["start_date"]}
                if next_antar else None,
            }
    return {"mahadasha": None, "antardasha": None, "next_antardasha": None}


def timeline_for_llm(dasha: dict, when_utc: datetime, max_mahas: int = 12) -> str:
    lines = []
    cur = current_period(dasha, when_utc)
    if cur["mahadasha"]:
        lines.append(f"CURRENT MAHADASHA: {cur['mahadasha']['lord']} ({cur['mahadasha']['start_date']} to {cur['mahadasha']['end_date']})")
        if cur["antardasha"]:
            lines.append(f"CURRENT ANTARDASHA: {cur['antardasha']['lord']} ({cur['antardasha']['start_date']} to {cur['antardasha']['end_date']})")
        if cur["next_antardasha"]:
            lines.append(f"NEXT ANTARDASHA begins: {cur['next_antardasha']['start_date']} ({cur['next_antardasha']['lord']})")
    count = 0
    for m in dasha["mahadashas"]:
        lines.append(f"{m['lord']} Mahadasha: {m['start_date']} to {m['end_date']}")
        count += 1
        if count >= max_mahas:
            break
    return "\n".join(lines)
