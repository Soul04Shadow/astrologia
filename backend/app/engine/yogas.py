from __future__ import annotations

from .constants import DEBILITATION_SIGN, EXALTATION_SIGN, OWN_SIGN, SIGN_LORDS

KENDRA_HOUSES = {1, 4, 7, 10}
TRIKONA_HOUSES = {1, 5, 9}

PANCH_MAHAPURUSH = {
    "Mars": "Ruchaka",
    "Mercury": "Bhadra",
    "Jupiter": "Hamsa",
    "Venus": "Malavya",
    "Saturn": "Shasha",
}


def _house_from(anchor_sign: int, other_sign: int) -> int:
    return ((other_sign - anchor_sign) % 12) + 1


def detect_yogas(chart: dict) -> list[dict]:
    planets = chart["planets"]
    lagna_sign = chart["lagna"]["sign_index"]
    moon_sign = planets["Moon"]["sign_index"]
    yogas: list[dict] = []

    jup = planets["Jupiter"]["sign_index"]
    if _house_from(moon_sign, jup) in KENDRA_HOUSES:
        yogas.append({"name": "Gajakesari Yoga", "basis": f"Jupiter in kendra (house {_house_from(moon_sign, jup)}) from Moon"})

    if planets["Sun"]["sign_index"] == planets["Mercury"]["sign_index"]:
        yogas.append({"name": "Budhaditya Yoga", "basis": "Sun and Mercury conjunct in the same sign"})

    for pname, dsign in DEBILITATION_SIGN.items():
        p = planets.get(pname)
        if not p or p["sign_index"] != dsign:
            continue
        dispositor_lord = SIGN_LORDS[dsign]
        disp = planets.get(dispositor_lord)
        cancelled = False
        basis_parts = []
        if disp and _house_from(lagna_sign, disp["sign_index"]) in KENDRA_HOUSES:
            cancelled = True
            basis_parts.append(f"dispositor {dispositor_lord} in kendra from Lagna")
        if disp and _house_from(moon_sign, disp["sign_index"]) in KENDRA_HOUSES:
            cancelled = True
            basis_parts.append(f"dispositor {dispositor_lord} in kendra from Moon")
        exalt_lord_sign = EXALTATION_SIGN[dispositor_lord] if dispositor_lord in EXALTATION_SIGN else None
        if exalt_lord_sign is not None and disp and disp["sign_index"] == exalt_lord_sign:
            cancelled = True
            basis_parts.append(f"dispositor {dispositor_lord} exalted")
        if cancelled:
            yogas.append({"name": "Neecha Bhanga Raja Yoga",
                          "basis": f"{pname} debilitated in {p['sign']}; cancellation: " + "; ".join(basis_parts)})

    for pname, yoga_name in PANCH_MAHAPURUSH.items():
        p = planets[pname]
        if p["house"] in KENDRA_HOUSES and p["dignity"] in ("Exalted", "Own Sign", "Moolatrikona"):
            yogas.append({"name": f"{yoga_name} Yoga (Panch Mahapurush)",
                          "basis": f"{pname} {p['dignity'].lower()} in kendra house {p['house']}"})

    lords_by_sign_house = {}
    for h in range(1, 13):
        sign_idx = (lagna_sign + h - 1) % 12
        lords_by_sign_house[h] = planets[SIGN_LORDS[sign_idx]]
    if lords_by_sign_house[2]["sign_index"] == lords_by_sign_house[11]["sign_index"]:
        yogas.append({"name": "Dhana Yoga (2-11 combination)",
                      "basis": "Lords of 2nd and 11th houses conjunct"})

    seen = set()
    unique = []
    for y in yogas:
        if y["name"] not in seen:
            seen.add(y["name"])
            unique.append(y)
    return unique
