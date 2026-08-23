from __future__ import annotations

from .constants import SIGN_NAMES, SIGN_LORDS, SIGN_TYPE

# Kendra houses: 1, 4, 7, 10
# Trikona houses: 1, 5, 9
# Dusthana / Trika houses: 6, 8, 12
# Maraka houses: 2, 7


def compute_house_lordships(lagna_sign_idx: int) -> dict:
    """
    Computes house lordships for all 12 houses and classifies planets into:
    - Lagna Lord
    - Yogakaraka (rules a Kendra and Trikona together)
    - Maraka Lords (rules 2nd or 7th)
    - Dusthana Lords (rules 6th, 8th, 12th)
    - Trikona Lords (rules 1st, 5th, 9th)
    - Badhaka Lord (rules 11th for Movable Lagna, 9th for Fixed Lagna, 7th for Dual Lagna)
    """
    house_to_sign = {}
    house_to_lord = {}
    planet_to_houses = {p: [] for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]}

    for h in range(1, 13):
        sign_idx = (lagna_sign_idx + h - 1) % 12
        lord = SIGN_LORDS[sign_idx]
        house_to_sign[h] = {"sign": SIGN_NAMES[sign_idx], "sign_index": sign_idx}
        house_to_lord[h] = lord
        if lord in planet_to_houses:
            planet_to_houses[lord].append(h)

    # Determine Badhaka house
    # Movable (Aries=0, Cancer=3, Libra=6, Capricorn=9) -> 11th house
    # Fixed (Taurus=1, Leo=4, Scorpio=7, Aquarius=10) -> 9th house
    # Dual (Gemini=2, Virgo=5, Sagittarius=8, Pisces=11) -> 7th house
    lagna_type = SIGN_TYPE[lagna_sign_idx]
    if lagna_type == "movable":
        badhaka_house = 11
    elif lagna_type == "fixed":
        badhaka_house = 9
    else:
        badhaka_house = 7
    badhaka_lord = house_to_lord[badhaka_house]

    planet_roles = {}
    kendras = {1, 4, 7, 10}
    trikonas = {1, 5, 9}
    dusthanas = {6, 8, 12}
    marakas = {2, 7}

    for p, houses in planet_to_houses.items():
        roles = []
        if 1 in houses:
            roles.append("Lagna Lord")
        # Yogakaraka: rules at least one kendra (4, 7, 10) AND at least one trikona (5, 9)
        # (e.g. Mars for Leo [4, 9], Mars for Cancer [5, 10], Saturn for Taurus [9, 10], Saturn for Libra [4, 5], Venus for Capricorn [5, 10], Venus for Aquarius [4, 9])
        has_kendra_k = any(h in {4, 7, 10} for h in houses)
        has_trikona_t = any(h in {5, 9} for h in houses)
        if len(houses) >= 2 and has_kendra_k and has_trikona_t:
            roles.append("Yogakaraka")

        if any(h in marakas for h in houses):
            roles.append(f"Maraka Lord (rules {', '.join(str(h) for h in houses if h in marakas)})")
        if any(h in dusthanas for h in houses):
            roles.append(f"Dusthana Lord (rules {', '.join(str(h) for h in houses if h in dusthanas)})")
        if p == badhaka_lord:
            roles.append(f"Badhaka Lord (House {badhaka_house})")
        if any(h in (5, 9) for h in houses):
            roles.append("Trikona Lord")
        planet_roles[p] = {
            "houses_ruled": houses,
            "roles": roles,
            "summary": f"Rules House(s) {', '.join(str(h) for h in houses)}" + (f" [{', '.join(roles)}]" if roles else ""),
        }

    return {
        "house_to_sign": house_to_sign,
        "house_to_lord": house_to_lord,
        "planet_roles": planet_roles,
        "badhaka": {"house": badhaka_house, "lord": badhaka_lord},
        "maraka_lords": list(set([house_to_lord[2], house_to_lord[7]])),
        "dusthana_lords": {
            6: house_to_lord[6],
            8: house_to_lord[8],
            12: house_to_lord[12],
        },
    }


def compute_drishti(planets: dict) -> dict:
    """
    Computes planetary aspects (Drishti) for all 9 planets.
    Returns aspected houses and planets occupying those houses.
    """
    house_occupants = {h: [] for h in range(1, 13)}
    for pname, p in planets.items():
        h = p.get("house")
        if h:
            house_occupants[h].append(pname)

    aspects_from_planet = {}
    for pname, p in planets.items():
        h = p.get("house")
        if not h:
            continue
        aspected_houses = []
        # 7th aspect for all planets
        aspected_houses.append(((h - 1 + 6) % 12) + 1)

        # Mars special aspects: 4th, 8th
        if pname == "Mars":
            aspected_houses.append(((h - 1 + 3) % 12) + 1)
            aspected_houses.append(((h - 1 + 7) % 12) + 1)
        # Jupiter & Rahu & Ketu special aspects: 5th, 9th
        elif pname in ("Jupiter", "Rahu", "Ketu"):
            aspected_houses.append(((h - 1 + 4) % 12) + 1)
            aspected_houses.append(((h - 1 + 8) % 12) + 1)
        # Saturn special aspects: 3rd, 10th
        elif pname == "Saturn":
            aspected_houses.append(((h - 1 + 2) % 12) + 1)
            aspected_houses.append(((h - 1 + 9) % 12) + 1)

        aspected_houses = sorted(list(set(aspected_houses)))
        aspected_details = []
        for ah in aspected_houses:
            occs = house_occupants[ah]
            if occs:
                aspected_details.append(f"House {ah} ({', '.join(occs)})")
            else:
                aspected_details.append(f"House {ah}")
        aspects_from_planet[pname] = {
            "from_house": h,
            "aspected_houses": aspected_houses,
            "details": aspected_details,
            "summary": f"{pname} (House {h}) aspects: {', '.join(aspected_details)}",
        }

    return aspects_from_planet


def compute_health_and_maraka_analysis(chart: dict) -> dict:
    """
    Computes a comprehensive health, longevity, and Maraka analysis block:
    - 6th House (Roga Bhava): Sign, 6th Lord, resident planets, aspecting planets
    - 8th House (Ayur & Randhra Bhava): Sign, 8th Lord, resident planets, aspecting planets, Saturn (Ayushkaraka)
    - 12th House (Vyaya Bhava): Sign, 12th Lord, resident planets
    - Maraka Sthanas: 2nd & 7th house lords and resident planets
    - Current Dasha vulnerability evaluation (is current Maha/Antardasha ruled by Maraka/Dusthana lord?)
    - Sade Sati status
    """
    lagna_sign_idx = chart["lagna"]["sign_index"]
    planets = chart["planets"]
    moon_sign_idx = planets["Moon"]["sign_index"]

    lordships = compute_house_lordships(lagna_sign_idx)
    drishti = compute_drishti(planets)

    house_occupants = {h: [] for h in range(1, 13)}
    for pname, p in planets.items():
        h = p.get("house")
        if h:
            house_occupants[h].append(pname)

    aspects_on_house = {h: [] for h in range(1, 13)}
    for pname, asp in drishti.items():
        for ah in asp["aspected_houses"]:
            aspects_on_house[ah].append(pname)

    # 6th house (Roga)
    h6_sign = lordships["house_to_sign"][6]["sign"]
    h6_lord = lordships["house_to_lord"][6]
    h6_planets = house_occupants[6]
    h6_aspects = aspects_on_house[6]

    # 8th house (Ayur / Longevity / Chronic ailments)
    h8_sign = lordships["house_to_sign"][8]["sign"]
    h8_lord = lordships["house_to_lord"][8]
    h8_planets = house_occupants[8]
    h8_aspects = aspects_on_house[8]

    # 12th house (Vyaya / Hospitalization / Isolation)
    h12_sign = lordships["house_to_sign"][12]["sign"]
    h12_lord = lordships["house_to_lord"][12]
    h12_planets = house_occupants[12]
    h12_aspects = aspects_on_house[12]

    # Maraka houses (2nd & 7th)
    maraka_lords = lordships["maraka_lords"]
    maraka_occupants = house_occupants[2] + house_occupants[7]

    # Current Dasha vulnerability
    dasha_current = chart.get("dasha", {}).get("current", {}) or {}
    maha_lord = (dasha_current.get("mahadasha") or {}).get("lord")
    antar_lord = (dasha_current.get("antardasha") or {}).get("lord")

    active_flags = []
    if maha_lord in maraka_lords:
        active_flags.append(f"Running Mahadasha lord ({maha_lord}) is a primary Maraka lord (rules 2nd/7th house)")
    if antar_lord in maraka_lords:
        active_flags.append(f"Running Antardasha lord ({antar_lord}) is a primary Maraka lord (rules 2nd/7th house)")
    if maha_lord in (h6_lord, h8_lord, h12_lord):
        active_flags.append(f"Running Mahadasha lord ({maha_lord}) is a Dusthana lord (rules 6th/8th/12th house)")
    if antar_lord in (h6_lord, h8_lord, h12_lord):
        active_flags.append(f"Running Antardasha lord ({antar_lord}) is a Dusthana lord (rules 6th/8th/12th house)")

    # Sade Sati
    sade_sati = "Not active"
    transits = chart.get("transits_now", {}).get("positions", {})
    if "Saturn" in transits:
        sat_sign_name = transits["Saturn"]["sign"]
        if sat_sign_name in SIGN_NAMES:
            sat_sign_idx = SIGN_NAMES.index(sat_sign_name)
            diff = (sat_sign_idx - moon_sign_idx) % 12
            if diff == 11:
                sade_sati = "Active (Rising / 1st Phase — Saturn transiting 12th from natal Moon)"
            elif diff == 0:
                sade_sati = "Active (Peak / 2nd Phase — Saturn transiting over natal Moon)"
            elif diff == 1:
                sade_sati = "Active (Setting / 3rd Phase — Saturn transiting 2nd from natal Moon)"
            elif diff == 3:
                sade_sati = "Active (Kantaka Shani — Saturn in 4th from Moon, emotional/domestic vulnerability)"
            elif diff == 7:
                sade_sati = "Active (Ashtama Shani — Saturn in 8th from Moon, critical physical/health transit)"

    return {
        "lordships": lordships,
        "drishti": drishti,
        "h6": {"sign": h6_sign, "lord": h6_lord, "occupants": h6_planets, "aspects": h6_aspects},
        "h8": {"sign": h8_sign, "lord": h8_lord, "occupants": h8_planets, "aspects": h8_aspects},
        "h12": {"sign": h12_sign, "lord": h12_lord, "occupants": h12_planets, "aspects": h12_aspects},
        "marakas": {"lords": maraka_lords, "occupants": maraka_occupants},
        "current_dasha_vulnerabilities": active_flags,
        "sade_sati": sade_sati,
    }
