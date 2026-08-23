from __future__ import annotations

from .constants import SIGN_NAMES, SIGN_LORDS, SIGN_TYPE, PLANET_ORDER


def d3_sign(lon: float) -> int:
    """Drekkana (D3): 10° divisions (1st: 1st sign, 2nd: 5th sign, 3rd: 9th sign)."""
    sign_idx = int((lon % 360) // 30)
    deg_in_sign = lon % 30
    drekkana_idx = min(2, max(0, int(deg_in_sign // 10)))  # 0, 1, 2
    offset = [0, 4, 8][drekkana_idx]
    return (sign_idx + offset) % 12


def d7_sign(lon: float) -> int:
    """Saptamsha (D7): 4°17'8.57" divisions. Odd sign: from self. Even sign: from 7th."""
    sign_idx = int((lon % 360) // 30)
    deg_in_sign = lon % 30
    part = min(6, max(0, int(deg_in_sign / (30.0 / 7.0))))  # 0 to 6
    is_odd = (sign_idx % 2 == 0)  # 0=Aries (Odd)
    start_sign = sign_idx if is_odd else (sign_idx + 6) % 12
    return (start_sign + part) % 12


def d9_sign(lon: float) -> int:
    """Navamsa (D9): 3°20' divisions."""
    k = int((lon % 360) * 9 / 30.0)
    return k % 12


def d10_sign(lon: float) -> int:
    """
    Dashamsha (D10): 3° divisions for Career & Professional Status.
    - In Odd signs (Aries, Gemini, Leo...): starts from same sign.
    - In Even signs (Taurus, Cancer, Virgo...): starts from 9th sign from it (+8).
    """
    sign_idx = int((lon % 360) // 30)
    deg_in_sign = lon % 30
    part = min(9, max(0, int(deg_in_sign // 3.0)))  # 0 to 9
    is_odd = (sign_idx % 2 == 0)
    start_sign = sign_idx if is_odd else (sign_idx + 8) % 12
    return (start_sign + part) % 12


def d12_sign(lon: float) -> int:
    """Dwadashamsha (D12): 2°30' divisions for Ancestors & Parents. Starts from same sign."""
    sign_idx = int((lon % 360) // 30)
    deg_in_sign = lon % 30
    part = min(11, max(0, int(deg_in_sign // 2.5)))  # 0 to 11
    return (sign_idx + part) % 12


def d30_sign(lon: float) -> int:
    """
    Trimshamsha (D30): Unequal divisions for Arishta, Misfortunes & Subconscious Karma.
    - Odd signs: 0-5° Mars (Aries=0), 5-10° Saturn (Aquarius=10), 10-18° Jupiter (Sagittarius=8),
                 18-25° Mercury (Gemini=2), 25-30° Venus (Libra=6).
    - Even signs: 0-5° Venus (Taurus=1), 5-12° Mercury (Virgo=5), 12-20° Jupiter (Pisces=11),
                  20-25° Saturn (Capricorn=9), 25-30° Mars (Scorpio=7).
    """
    sign_idx = int((lon % 360) // 30)
    deg = max(0.0, min(29.999999, lon % 30))
    is_odd = (sign_idx % 2 == 0)

    if is_odd:
        if deg < 5.0:
            return 0   # Aries
        elif deg < 10.0:
            return 10  # Aquarius
        elif deg < 18.0:
            return 8   # Sagittarius
        elif deg < 25.0:
            return 2   # Gemini
        else:
            return 6   # Libra
    else:
        if deg < 5.0:
            return 1   # Taurus
        elif deg < 12.0:
            return 5   # Virgo
        elif deg < 20.0:
            return 11  # Pisces
        elif deg < 25.0:
            return 9   # Capricorn
        else:
            return 7   # Scorpio


VARGA_FORMULAS = {
    "D1": lambda lon: int((lon % 360) // 30),
    "D3": d3_sign,
    "D7": d7_sign,
    "D9": d9_sign,
    "D10": d10_sign,
    "D12": d12_sign,
    "D30": d30_sign,
}

VARGA_DESCRIPTIONS = {
    "D1": "Rashi (Physical reality & general life)",
    "D3": "Drekkana (Siblings, courage, vitality)",
    "D7": "Saptamsha (Progeny, children, partnerships)",
    "D9": "Navamsa (Dharma, spouse, inner potential)",
    "D10": "Dashamsha (Career, profession, leadership & status)",
    "D12": "Dwadashamsha (Parents, lineage, ancestral karma)",
    "D30": "Trimshamsha (Arishta, afflictions, subconscious challenges)",
}


def compute_varga_chart(planets: dict[str, dict], lagna_lon: float, varga: str = "D10") -> dict:
    """
    Computes divisional chart varga placements for all planets and Lagna.
    Calculates whole-sign houses relative to the Varga Lagna.
    """
    fn = VARGA_FORMULAS.get(varga.upper(), d10_sign)
    varga_name = varga.upper()
    desc = VARGA_DESCRIPTIONS.get(varga_name, "Divisional Chart")

    v_lagna_sign_idx = fn(lagna_lon)

    table: dict[str, dict] = {}
    for name, p in planets.items():
        lon = p["longitude"]
        s_idx = fn(lon)
        # Whole sign house relative to varga lagna
        house = ((s_idx - v_lagna_sign_idx) % 12) + 1
        table[name] = {
            "sign": SIGN_NAMES[s_idx],
            "sign_index": s_idx,
            "house": house,
            "vargottama": s_idx == p.get("sign_index"),
        }

    return {
        "varga": varga_name,
        "description": desc,
        "lagna": {
            "sign": SIGN_NAMES[v_lagna_sign_idx],
            "sign_index": v_lagna_sign_idx,
            "house": 1,
        },
        "planets": {k: table[k] for k in PLANET_ORDER if k in table},
    }
