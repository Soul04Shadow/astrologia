from __future__ import annotations

from .constants import SIGN_NAMES, SIGN_TYPE


def navamsa_sign(lon: float) -> int:
    k = int((lon % 360) * 9) // 30
    return k % 12


def navamsa_table(planets: dict[str, dict]) -> dict[str, dict]:
    table = {}
    for name, p in planets.items():
        n_idx = navamsa_sign(p["longitude"])
        table[name] = {
            "sign": SIGN_NAMES[n_idx],
            "sign_index": n_idx,
            "vargottama": n_idx == p["sign_index"],
        }
    return table


def varga_type_offset(sign_index: int) -> int:
    t = SIGN_TYPE[sign_index]
    return {"movable": 0, "fixed": 8, "dual": 4}[t]
