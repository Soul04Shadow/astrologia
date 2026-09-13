from __future__ import annotations

import math
from .constants import (
    DEBILITATION_SIGN,
    EXALTATION_SIGN,
    MOOLATRIKONA,
    OWN_SIGN,
    SIGN_LORDS,
    SIGN_NAMES,
)

# Minimum required Shadbala in Rupas according to Parashara
MIN_RUPAS_REQUIRED = {
    "Sun": 6.5,      # 390 Virupas
    "Moon": 6.0,     # 360 Virupas
    "Mars": 5.0,     # 300 Virupas
    "Mercury": 7.0,  # 420 Virupas
    "Jupiter": 6.5,  # 390 Virupas
    "Venus": 5.5,    # 330 Virupas
    "Saturn": 5.0,   # 300 Virupas
}

# Fixed Naisargika Bala (Natural Strength in Virupas: Sun=60, Saturn=8.57)
NAISARGIKA_BALA = {
    "Sun": 60.0,
    "Moon": 51.43,
    "Venus": 42.86,
    "Jupiter": 34.29,
    "Mercury": 25.71,
    "Mars": 17.14,
    "Saturn": 8.57,
}

# Deep exaltation degree in exaltation sign
EXALTATION_DEGREE = {
    "Sun": 10.0,      # Aries 10°
    "Moon": 3.0,      # Taurus 3°
    "Mars": 28.0,     # Capricorn 28°
    "Mercury": 15.0,  # Virgo 15°
    "Jupiter": 5.0,   # Cancer 5°
    "Venus": 27.0,    # Pisces 27°
    "Saturn": 20.0,   # Libra 20°
}

# Dig Bala peak house (1-indexed)
DIG_BALA_PEAK_HOUSE = {
    "Jupiter": 1,
    "Mercury": 1,
    "Venus": 4,
    "Moon": 4,
    "Saturn": 7,
    "Sun": 10,
    "Mars": 10,
}


def _uchcha_bala(planet: str, lon: float) -> float:
    """
    Computes Uchcha Bala (Exaltation strength) from 0 to 60 Virupas.
    Based on distance to the deep debilitation point (180° opposite deep exaltation).
    """
    if planet not in EXALTATION_SIGN:
        return 30.0
    ex_sign = EXALTATION_SIGN[planet]
    ex_deg = EXALTATION_DEGREE.get(planet, 15.0)
    deep_ex_lon = (ex_sign * 30.0) + ex_deg
    deep_deb_lon = (deep_ex_lon + 180.0) % 360.0

    diff = abs(lon - deep_deb_lon) % 360.0
    diff = min(diff, 360.0 - diff)
    # diff ranges from 0 (at deep debilitation) to 180 (at deep exaltation)
    return round((diff / 180.0) * 60.0, 2)


def _dig_bala(planet: str, house: int, degree_in_sign: float) -> float:
    """
    Computes Dig Bala (Directional strength) from 0 to 60 Virupas.
    Peak is at the peak house cusp, zero at 180° opposite (7th house away).
    """
    peak_h = DIG_BALA_PEAK_HOUSE.get(planet, 1)
    # Approximate angular difference in houses (each house ~ 30°)
    h_diff = abs(house - peak_h)
    if h_diff > 6:
        h_diff = 12 - h_diff
    # 0 diff -> 60 Virupas, 6 diff -> 0 Virupas
    bala = (6.0 - h_diff) / 6.0 * 60.0
    return round(max(0.0, min(60.0, bala)), 2)


def _sthana_bala(planet: str, p_data: dict, planets: dict) -> float:
    """
    Computes Sthana Bala (Positional Strength) combining:
    - Uchcha Bala (0-60)
    - Kendra Bala (15, 30, or 60)
    - Ojhayugma Bala (Odd/Even sign suitability: 0 or 15)
    - Drekkana Bala (0 or 15)
    - Saptavargaja / Dignity factor (15-45)
    """
    lon = p_data["longitude"]
    h = p_data.get("house", 1)
    sign_idx = p_data.get("sign_index", 0)

    uchcha = _uchcha_bala(planet, lon)

    # Kendra (1, 4, 7, 10) = 60; Panaphara (2, 5, 8, 11) = 30; Apoklima (3, 6, 9, 12) = 15
    if h in (1, 4, 7, 10):
        kendra = 60.0
    elif h in (2, 5, 8, 11):
        kendra = 30.0
    else:
        kendra = 15.0

    # Ojhayugmarashi Bala (Odd sign: Aries=0, Gemini=2, Leo=4... Even sign: Taurus=1, Cancer=3...)
    is_odd_sign = (sign_idx % 2 == 0)  # 0=Aries (Odd sign in Jyotish), 1=Taurus (Even)
    if planet in ("Sun", "Mars", "Jupiter", "Mercury"):
        ojha = 15.0 if is_odd_sign else 0.0
    else:  # Moon, Venus, Saturn get strength in Even signs
        ojha = 15.0 if not is_odd_sign else 0.0

    # Dignity factor
    dignity = p_data.get("dignity", "Neutral")
    if dignity == "Exalted":
        dignity_bonus = 45.0
    elif dignity == "Moolatrikona":
        dignity_bonus = 37.5
    elif dignity == "Own Sign":
        dignity_bonus = 30.0
    elif dignity == "Debilitated":
        dignity_bonus = 7.5
    else:
        dignity_bonus = 15.0

    return round(uchcha + kendra + ojha + dignity_bonus, 2)


def _kaala_bala(planet: str, birth_hour_local: float, is_shukla_paksha: bool) -> float:
    """
    Computes Kaala Bala (Temporal Strength in Virupas).
    - Nathonnatha Bala (Day/Night suitability)
    - Paksha Bala (Waxing / Waning Lunar phase)
    - Tribhaga Bala
    """
    is_day = 6.0 <= birth_hour_local < 18.0

    # Nathonnatha Bala (0-60)
    if planet in ("Sun", "Jupiter", "Venus"):
        natho = 60.0 if is_day else 0.0
    elif planet in ("Moon", "Mars", "Saturn"):
        natho = 60.0 if not is_day else 0.0
    else:  # Mercury is always active
        natho = 60.0

    # Paksha Bala (0-60)
    if is_shukla_paksha:
        # Benefics strong in Shukla Paksha
        paksha = 50.0 if planet in ("Jupiter", "Venus", "Moon", "Mercury") else 20.0
    else:
        # Malefics strong in Krishna Paksha
        paksha = 50.0 if planet in ("Sun", "Mars", "Saturn") else 20.0

    # Tribhaga (fixed contribution)
    tribhaga = 20.0

    return round(natho + paksha + tribhaga, 2)


def _cheshta_bala(planet: str, is_retrograde: bool, p_data: dict) -> float:
    """
    Computes Cheshta Bala (Motional Strength in Virupas).
    Retrograde planets (Vakra) get high motional strength (60 Virupas).
    Direct normal motion gets ~30 Virupas. Sun/Moon get baseline.
    """
    if planet in ("Sun", "Moon"):
        return 30.0
    if is_retrograde:
        return 60.0
    return 30.0


def _drik_bala(planet: str, p_data: dict, planets: dict) -> float:
    """
    Computes Drik Bala (Aspectual strength in Virupas).
    Benefic aspects (Jupiter, Venus) add positive strength; malefic aspects subtract.
    """
    net_drik = 0.0
    h = p_data.get("house", 1)

    # Simplified aspect evaluation from other planets
    for other_name, other_p in planets.items():
        if other_name == planet or other_name in ("Rahu", "Ketu"):
            continue
        other_h = other_p.get("house", 1)
        h_dist = (h - other_h) % 12
        if h_dist in (4, 7, 8) and other_name == "Mars":
            net_drik -= 5.0
        elif h_dist in (5, 7, 9) and other_name == "Jupiter":
            net_drik += 10.0
        elif h_dist in (3, 7, 10) and other_name == "Saturn":
            net_drik -= 5.0
        elif h_dist == 7:
            if other_name in ("Venus", "Mercury"):
                net_drik += 5.0
            elif other_name == "Sun":
                net_drik -= 3.0

    return round(max(-30.0, min(30.0, net_drik)), 2)


def compute_shadbala(planets: dict, birth_hour_local: float = 12.0, is_shukla_paksha: bool = True) -> dict:
    """
    Computes 6-fold Shadbala for the 7 classical planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn).
    Returns total Virupas, Rupas (1 Rupa = 60 Virupas), required minimums, and relative strength ratios.
    """
    results = {}

    for planet in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        if planet not in planets:
            continue
        p_data = planets[planet]
        is_retro = p_data.get("retrograde", False)

        sthana = _sthana_bala(planet, p_data, planets)
        dig = _dig_bala(planet, p_data.get("house", 1), p_data.get("degree_in_sign", 0.0))
        kaala = _kaala_bala(planet, birth_hour_local, is_shukla_paksha)
        cheshta = _cheshta_bala(planet, is_retro, p_data)
        naisargika = NAISARGIKA_BALA.get(planet, 30.0)
        drik = _drik_bala(planet, p_data, planets)

        total_virupas = round(sthana + dig + kaala + cheshta + naisargika + drik, 2)
        total_rupas = round(total_virupas / 60.0, 2)
        required_rupas = MIN_RUPAS_REQUIRED.get(planet, 6.0)
        ratio = round(total_rupas / required_rupas, 2)

        if ratio >= 1.0:
            status = "Poorna Bala (Strong)"
        elif ratio >= 0.85:
            status = "Madhyama Bala (Moderate)"
        else:
            status = "Alpa Bala (Deficient)"

        results[planet] = {
            "planet": planet,
            "sthana_bala": sthana,
            "dig_bala": dig,
            "kaala_bala": kaala,
            "cheshta_bala": cheshta,
            "naisargika_bala": naisargika,
            "drik_bala": drik,
            "total_virupas": total_virupas,
            "total_rupas": total_rupas,
            "required_rupas": required_rupas,
            "strength_ratio": ratio,
            "status": status,
        }

    return results
