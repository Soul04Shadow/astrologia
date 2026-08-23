from __future__ import annotations

from .constants import SIGN_NAMES

# Classical Parashari Ashtakavarga Bindu (Rekha) Allocation Rules
# Each planet contributes points in specific houses (1-indexed from donor's natal sign)
# Total bindus per planet:
# Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39. Total SAV = 337.

PARASHARA_BAV_RULES = {
    "Sun": {
        "Sun": [1, 2, 4, 7, 8, 9, 10, 11],
        "Moon": [3, 6, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [5, 6, 9, 11],
        "Venus": [6, 7, 12],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Lagna": [3, 4, 6, 10, 11, 12],
    },
    "Moon": {
        "Sun": [3, 6, 7, 8, 10, 11],
        "Moon": [1, 3, 6, 7, 10, 11],
        "Mars": [2, 3, 5, 6, 9, 10, 11],
        "Mercury": [1, 3, 4, 5, 7, 8, 10, 11],
        "Jupiter": [1, 4, 7, 8, 10, 11, 12],
        "Venus": [3, 4, 5, 7, 9, 10, 11],
        "Saturn": [3, 5, 6, 11],
        "Lagna": [3, 6, 10, 11],
    },
    "Mars": {
        "Sun": [3, 5, 6, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [3, 5, 6, 11],
        "Jupiter": [6, 10, 11, 12],
        "Venus": [6, 8, 11, 12],
        "Saturn": [1, 4, 7, 8, 9, 10, 11],
        "Lagna": [1, 3, 6, 10, 11],
    },
    "Mercury": {
        "Sun": [5, 6, 9, 11, 12],
        "Moon": [2, 4, 6, 8, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [1, 3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [6, 8, 11, 12],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 11],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Lagna": [1, 2, 4, 6, 8, 10, 11],
    },
    "Jupiter": {
        "Sun": [1, 2, 3, 4, 7, 8, 9, 10, 11],
        "Moon": [2, 5, 7, 9, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [1, 2, 4, 5, 6, 9, 10, 11],
        "Jupiter": [1, 2, 3, 4, 7, 8, 10, 11],
        "Venus": [2, 5, 6, 9, 10, 11],
        "Saturn": [3, 5, 6, 12],
        "Lagna": [1, 2, 4, 5, 6, 7, 9, 10, 11],
    },
    "Venus": {
        "Sun": [8, 11, 12],
        "Moon": [1, 2, 3, 4, 5, 8, 9, 11, 12],
        "Mars": [3, 4, 6, 9, 11, 12],
        "Mercury": [3, 5, 6, 9, 11],
        "Jupiter": [5, 8, 9, 10, 11],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 10, 11],
        "Saturn": [3, 4, 5, 8, 9, 10, 11],
        "Lagna": [1, 2, 3, 4, 5, 8, 9, 11],
    },
    "Saturn": {
        "Sun": [1, 2, 4, 7, 8, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [3, 5, 6, 10, 11, 12],
        "Mercury": [6, 8, 9, 10, 11, 12],
        "Jupiter": [5, 6, 11, 12],
        "Venus": [6, 11, 12],
        "Saturn": [3, 5, 6, 11],
        "Lagna": [1, 3, 4, 6, 10, 11],
    },
}

# 8 Kakshya rulers in standard order (each rules 3°45' of a 30° sign)
KAKSHYA_LORDS = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Lagna"]


def compute_ashtakavarga(planets: dict[str, dict], lagna_sign_idx: int) -> dict:
    """
    Computes Bhinnashtakavarga (BAV) for 7 classical planets and
    Sarvashtakavarga (SAV) points for all 12 signs and 12 houses.
    """
    # Map donor planet name to its natal sign index (0-11)
    donor_signs: dict[str, int] = {}
    for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        if p in planets:
            donor_signs[p] = planets[p]["sign_index"]
        else:
            donor_signs[p] = 0
    donor_signs["Lagna"] = lagna_sign_idx

    bav: dict[str, list[int]] = {}
    sav_by_sign = [0] * 12

    for receiver, donor_rules in PARASHARA_BAV_RULES.items():
        rec_bav = [0] * 12
        for donor, houses in donor_rules.items():
            donor_pos = donor_signs.get(donor, 0)
            for h in houses:
                target_sign = (donor_pos + (h - 1)) % 12
                rec_bav[target_sign] += 1
        bav[receiver] = rec_bav
        for s in range(12):
            sav_by_sign[s] += rec_bav[s]

    # Map SAV from signs to houses (House 1 = Lagna sign)
    sav_by_house: dict[int, int] = {}
    house_strengths: dict[int, dict] = {}

    for h in range(1, 13):
        sign_idx = (lagna_sign_idx + (h - 1)) % 12
        pts = sav_by_sign[sign_idx]
        sav_by_house[h] = pts
        
        # Classification: 28 is neutral average
        if pts >= 30:
            status = "Strong / Auspicious"
        elif pts >= 26:
            status = "Moderate / Average"
        else:
            status = "Low / Challenging"
            
        house_strengths[h] = {
            "house": h,
            "sign": SIGN_NAMES[sign_idx],
            "sign_index": sign_idx,
            "points": pts,
            "status": status,
        }

    total_bindus = sum(sav_by_sign)

    return {
        "bav": bav,
        "sav_by_sign": {SIGN_NAMES[i]: sav_by_sign[i] for i in range(12)},
        "sav_by_house": sav_by_house,
        "house_strengths": house_strengths,
        "total_bindus": total_bindus,
        "average_per_house": round(total_bindus / 12, 1),
    }


def get_kakshya(longitude_in_sign: float) -> dict:
    """
    Returns Kakshya number (1-8) and Lord for a given degree within a sign (0-30°).
    Each Kakshya span = 3.75° (3°45').
    """
    deg = max(0.0, min(29.999999, longitude_in_sign % 30))
    kakshya_idx = min(7, max(0, int(deg // 3.75)))
    kakshya_num = kakshya_idx + 1
    lord = KAKSHYA_LORDS[kakshya_idx]
    return {
        "kakshya_num": kakshya_num,
        "lord": lord,
        "span": f"{kakshya_idx * 3.75:.2f}° - {(kakshya_idx + 1) * 3.75:.2f}°",
    }
