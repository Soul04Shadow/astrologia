from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import swisseph as swe

from .constants import (
    DASHA_ORDER,
    DASHA_YEARS,
    DASHA_YEARS_TOTAL,
    NAKSHATRAS,
    PLANET_ORDER,
    SIGN_LORDS,
    SIGN_NAMES,
    SIGN_SANSKRIT,
)
from .core import FLAGS, build_planets, deg_to_dms, nakshatra_of, raw_positions, setup, sign_info

# Tajika Triplicity Rulers (Element: Day Lord, Night Lord)
TRIPLICITY_LORDS = {
    # Fire signs: Aries (0), Leo (4), Sagittarius (8)
    "fire": {"day": "Sun", "night": "Jupiter"},
    # Earth signs: Taurus (1), Virgo (5), Capricorn (9)
    "earth": {"day": "Venus", "night": "Moon"},
    # Air signs: Gemini (2), Libra (6), Aquarius (10)
    "air": {"day": "Saturn", "night": "Mercury"},
    # Water signs: Cancer (3), Scorpio (7), Pisces (11)
    "water": {"day": "Venus", "night": "Mars"},
}

SIGN_ELEMENTS = {
    0: "fire", 1: "earth", 2: "air", 3: "water",
    4: "fire", 5: "earth", 6: "air", 7: "water",
    8: "fire", 9: "earth", 10: "air", 11: "water",
}

# Mudda Dasha days out of 365.25 days
MUDDA_DAYS = {
    p: (DASHA_YEARS[p] / DASHA_YEARS_TOTAL) * 365.25
    for p in DASHA_ORDER
}

DIGNITY_WEIGHTS = {
    "Exalted": 5,
    "Moolatrikona": 4,
    "Own Sign": 3,
    "Neutral": 2,
    "Debilitated": 1,
}


def compute_solar_return_jd(natal_sun_lon: float, target_year: int, natal_month: int, natal_day: int) -> float:
    """Find the exact Julian Day when the Sun returns to natal sidereal longitude."""
    setup()
    jd = swe.julday(target_year, natal_month, natal_day, 12.0)
    for _ in range(25):
        pos, _ = swe.calc_ut(jd, swe.SUN, FLAGS)
        cur_lon = pos[0] % 360
        speed = pos[3]
        diff = (natal_sun_lon - cur_lon + 180) % 360 - 180
        if abs(diff) < 1e-7:
            break
        jd += diff / speed
    return jd


def jd_to_datetime_utc(jd: float) -> datetime:
    """Convert Julian Day to Python datetime with UTC timezone."""
    y, m, d, h_dec = swe.revjul(jd)
    h = int(h_dec)
    m_val = int((h_dec - h) * 60)
    s_val = int(round(((h_dec - h) * 60 - m_val) * 60))
    if s_val >= 60:
        s_val = 0
        m_val += 1
    if m_val >= 60:
        m_val = 0
        h += 1
    if h >= 24:
        h = 0
        # simple roll
        base = datetime(y, m, d, tzinfo=timezone.utc) + timedelta(days=1)
        return base.replace(hour=h, minute=m_val, second=s_val)
    return datetime(y, m, d, h, m_val, s_val, tzinfo=timezone.utc)


def compute_varshphal(natal_chart: dict, target_year: int | None = None) -> dict:
    """
    Compute classical Tajika Varshphal (Annual Solar Return Horoscope)
    for a given natal chart and target year.
    """
    setup()
    birth = natal_chart["birth_details"]
    b_date = birth["date"]
    b_parts = [int(x) for x in b_date.split("-")]
    natal_year, natal_month, natal_day = b_parts[0], b_parts[1], b_parts[2]
    tz_name = birth["tz_name"]
    lat = birth["latitude"]
    lon_geo = birth["longitude"]

    # If target_year not specified, compute currently active annual cycle
    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(ZoneInfo(tz_name))

    if target_year is None:
        # Determine whether birthday in current calendar year has occurred
        cur_cal_year = now_local.year
        # Compare current date to birthday this year
        b_this_year = datetime(cur_cal_year, natal_month, natal_day, tzinfo=ZoneInfo(tz_name))
        if now_local >= b_this_year:
            target_year = cur_cal_year
        else:
            target_year = cur_cal_year - 1

    completed_age = max(0, target_year - natal_year)

    # 1. Exact Varshapravesha moment
    natal_sun_lon = natal_chart["planets"]["Sun"]["longitude"]
    jd_return = compute_solar_return_jd(natal_sun_lon, target_year, natal_month, natal_day)
    return_utc = jd_to_datetime_utc(jd_return)
    return_local = return_utc.astimezone(ZoneInfo(tz_name))

    # Next year's return to define exact annual boundary
    jd_next = compute_solar_return_jd(natal_sun_lon, target_year + 1, natal_month, natal_day)
    return_next_utc = jd_to_datetime_utc(jd_next)
    return_next_local = return_next_utc.astimezone(ZoneInfo(tz_name))

    # 2. Varsha Lagna & Planetary Placements
    cusps, ascmc = swe.houses_ex(jd_return, lat, lon_geo, b'W', swe.FLG_SIDEREAL)
    v_lagna_lon = ascmc[swe.ASC] % 360
    v_lagna_sign_idx = int(v_lagna_lon // 30)
    v_positions = raw_positions(jd_return)
    v_planets = build_planets(v_positions, v_lagna_sign_idx)

    v_lagna_si = sign_info(v_lagna_lon)
    varsha_lagna = {
        "longitude": round(v_lagna_lon, 6),
        "sign": v_lagna_si["name"],
        "sanskrit": v_lagna_si["sanskrit"],
        "sign_index": v_lagna_sign_idx,
        "degree": deg_to_dms(v_lagna_si["degree_in_sign"]),
        "lord": v_lagna_si["lord"],
        "nakshatra": nakshatra_of(v_lagna_lon),
    }

    # 3. Muntha calculation
    natal_lagna_sign_idx = natal_chart["lagna"]["sign_index"]
    muntha_sign_idx = (natal_lagna_sign_idx + completed_age) % 12
    muntha_house = (((muntha_sign_idx - v_lagna_sign_idx) % 12) + 12) % 12 + 1
    munthesh = SIGN_LORDS[muntha_sign_idx]

    muntha_status = (
        "Auspicious (शुभ)"
        if muntha_house in [1, 2, 3, 5, 9, 10, 11]
        else "Challenging / Needs Care (सावधानी / संघर्ष)"
    )

    muntha = {
        "sign_index": muntha_sign_idx,
        "sign": SIGN_NAMES[muntha_sign_idx],
        "sanskrit": SIGN_SANSKRIT[SIGN_NAMES[muntha_sign_idx]],
        "house": muntha_house,
        "lord": munthesh,
        "completed_age": completed_age,
        "target_age_year": completed_age + 1,
        "status": muntha_status,
    }

    # 4. Determine Day/Night Pravesha
    # Simple solar elevation / local hour check: Sun above horizon
    sun_house = v_planets["Sun"]["house"]
    # In whole sign houses with ascendant in house 1, houses 7 through 12 are above horizon (day)
    is_daytime = sun_house in [7, 8, 9, 10, 11, 12]

    # 5. Panchaadhikaris (5 Candidates for Varsheshwara)
    # 1) Janma Lagnesha
    c_janma_lagnesh = natal_chart["lagna"]["lord"]
    # 2) Varsha Lagnesha
    c_varsha_lagnesh = varsha_lagna["lord"]
    # 3) Munthesha
    c_munthesh = munthesh
    # 4) Dina / Ratri Pati
    if is_daytime:
        c_dina_ratri = v_planets["Sun"]["sign_lord"]
    else:
        c_dina_ratri = v_planets["Moon"]["sign_lord"]
    # 5) Tri-Rashi Pati
    elem = SIGN_ELEMENTS[v_lagna_sign_idx]
    c_trirashi = TRIPLICITY_LORDS[elem]["day" if is_daytime else "night"]

    candidates = {
        "janma_lagnesh": c_janma_lagnesh,
        "varsha_lagnesh": c_varsha_lagnesh,
        "munthesh": c_munthesh,
        "dina_ratri_pati": c_dina_ratri,
        "tri_rashi_pati": c_trirashi,
    }

    # Tajika Aspect on Varsha Lagna:
    # A planet aspects Lagna if placed in house 1, 3, 4, 5, 7, 8 (in some texts, but classical Tajika is:
    # Friendly: 3, 5, 9, 11; Direct/Inimical: 1, 4, 7, 10. Neutral/Blind: 2, 6, 8, 12).
    aspecting_lagna_houses = {1, 3, 4, 5, 7, 9, 10, 11}

    # Score each unique candidate
    unique_candidates = list(dict.fromkeys(candidates.values()))
    candidate_scores = {}
    for planet in unique_candidates:
        if planet not in v_planets:
            continue
        p_data = v_planets[planet]
        house = p_data["house"]
        aspects_lagna = house in aspecting_lagna_houses

        # Base score from candidate frequency (how many offices it holds)
        office_count = sum(1 for c in candidates.values() if c == planet)
        dignity_score = DIGNITY_WEIGHTS.get(p_data["dignity"], 2)

        # Aspecting Lagna is mandatory in Tajika for Varsheshwara
        total_score = (100 if aspects_lagna else 0) + (office_count * 10) + dignity_score
        candidate_scores[planet] = {
            "planet": planet,
            "house": house,
            "aspects_lagna": aspects_lagna,
            "office_count": office_count,
            "dignity": p_data["dignity"],
            "score": total_score,
        }

    # Best candidate is Varsheshwara
    best_candidate = max(
        candidate_scores.values(),
        key=lambda x: x["score"],
        default={"planet": varsha_lagna["lord"]},
    )
    varsheshwara = best_candidate["planet"]

    # 6. Mudda Dasha (Annual 365.25 days Vimshottari progression)
    # Sequence starts from Moon nakshatra lord in Varsha Kundli
    v_moon_nak_lord = v_planets["Moon"]["nakshatra"]["lord"]
    start_idx = DASHA_ORDER.index(v_moon_nak_lord)

    mudda_periods = []
    curr_date = return_local
    for i in range(len(DASHA_ORDER)):
        p = DASHA_ORDER[(start_idx + i) % len(DASHA_ORDER)]
        duration_days = MUDDA_DAYS[p]
        end_date = curr_date + timedelta(days=duration_days)
        is_active = (curr_date <= now_local < end_date) and (target_year == now_local.year or target_year == now_local.year - 1)
        mudda_periods.append({
            "lord": p,
            "duration_days": round(duration_days, 1),
            "start_date": curr_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "is_current": is_active,
        })
        curr_date = end_date

    return {
        "target_year": target_year,
        "completed_age": completed_age,
        "running_year_age": completed_age + 1,
        "period": {
            "start_date": return_local.strftime("%Y-%m-%d"),
            "end_date": return_next_local.strftime("%Y-%m-%d"),
            "display": f"{return_local.strftime('%d %b %Y')} – {return_next_local.strftime('%d %b %Y')}",
        },
        "varshapravesha": {
            "utc": return_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "local": return_local.strftime("%Y-%m-%d %H:%M:%S"),
            "tz_name": tz_name,
            "is_daytime": is_daytime,
        },
        "lagna": varsha_lagna,
        "planets": v_planets,
        "muntha": muntha,
        "panchaadhikaris": {
            "candidates": candidates,
            "scores": candidate_scores,
            "varsheshwara": varsheshwara,
        },
        "mudda_dasha": mudda_periods,
    }
