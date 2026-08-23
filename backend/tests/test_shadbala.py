from __future__ import annotations

import pytest
from app.engine.shadbala import (
    DIG_BALA_PEAK_HOUSE,
    EXALTATION_DEGREE,
    MIN_RUPAS_REQUIRED,
    NAISARGIKA_BALA,
    _cheshta_bala,
    _dig_bala,
    _drik_bala,
    _kaala_bala,
    _sthana_bala,
    _uchcha_bala,
    compute_shadbala,
)


def test_min_rupas_and_naisargika_constants():
    """
    Verify classical Parashari minimum required Rupas and fixed natural strengths (Naisargika Bala).
    """
    expected_min_rupas = {
        "Sun": 6.5,
        "Moon": 6.0,
        "Mars": 5.0,
        "Mercury": 7.0,
        "Jupiter": 6.5,
        "Venus": 5.5,
        "Saturn": 5.0,
    }
    assert MIN_RUPAS_REQUIRED == expected_min_rupas

    # Naisargika Bala order from brightest (Sun=60) to darkest (Saturn=8.57)
    assert NAISARGIKA_BALA["Sun"] == 60.0
    assert NAISARGIKA_BALA["Moon"] == 51.43
    assert NAISARGIKA_BALA["Venus"] == 42.86
    assert NAISARGIKA_BALA["Jupiter"] == 34.29
    assert NAISARGIKA_BALA["Mercury"] == 25.71
    assert NAISARGIKA_BALA["Mars"] == 17.14
    assert NAISARGIKA_BALA["Saturn"] == 8.57


def test_uchcha_bala_deep_exaltation_and_debilitation():
    """
    Verify Uchcha Bala is exactly 60.0 Virupas at deep exaltation degree
    and 0.0 Virupas at deep debilitation degree (180° opposite).
    """
    # Sun: Aries 10° (lon 10°) exalted, Libra 10° (lon 190°) debilitated
    assert _uchcha_bala("Sun", 10.0) == 60.0
    assert _uchcha_bala("Sun", 190.0) == 0.0

    # Moon: Taurus 3° (lon 33°) exalted, Scorpio 3° (lon 213°) debilitated
    assert _uchcha_bala("Moon", 33.0) == 60.0
    assert _uchcha_bala("Moon", 213.0) == 0.0

    # Mars: Capricorn 28° (lon 298°) exalted, Cancer 28° (lon 118°) debilitated
    assert _uchcha_bala("Mars", 298.0) == 60.0
    assert _uchcha_bala("Mars", 118.0) == 0.0

    # Mercury: Virgo 15° (lon 165°) exalted, Pisces 15° (lon 345°) debilitated
    assert _uchcha_bala("Mercury", 165.0) == 60.0
    assert _uchcha_bala("Mercury", 345.0) == 0.0

    # Jupiter: Cancer 5° (lon 95°) exalted, Capricorn 5° (lon 275°) debilitated
    assert _uchcha_bala("Jupiter", 95.0) == 60.0
    assert _uchcha_bala("Jupiter", 275.0) == 0.0

    # Venus: Pisces 27° (lon 357°) exalted, Virgo 27° (lon 177°) debilitated
    assert _uchcha_bala("Venus", 357.0) == 60.0
    assert _uchcha_bala("Venus", 177.0) == 0.0

    # Saturn: Libra 20° (lon 200°) exalted, Aries 20° (lon 20°) debilitated
    assert _uchcha_bala("Saturn", 200.0) == 60.0
    assert _uchcha_bala("Saturn", 20.0) == 0.0


def test_dig_bala_all_peaks_and_nadir():
    """
    Verify Directional Strength (Dig Bala):
    - 60.0 Virupas at peak house
    - 0.0 Virupas at 7th house away (180° opposite)
    - Intermediate values for other houses
    """
    # 1. Jupiter & Mercury peak in House 1 (Lagna), zero in House 7
    for p in ["Jupiter", "Mercury"]:
        assert _dig_bala(p, house=1, degree_in_sign=15.0) == 60.0
        assert _dig_bala(p, house=7, degree_in_sign=15.0) == 0.0
        assert _dig_bala(p, house=4, degree_in_sign=15.0) == 30.0

    # 2. Venus & Moon peak in House 4 (Nadir), zero in House 10
    for p in ["Venus", "Moon"]:
        assert _dig_bala(p, house=4, degree_in_sign=15.0) == 60.0
        assert _dig_bala(p, house=10, degree_in_sign=15.0) == 0.0
        assert _dig_bala(p, house=1, degree_in_sign=15.0) == 30.0

    # 3. Saturn peaks in House 7 (Descendant), zero in House 1
    assert _dig_bala("Saturn", house=7, degree_in_sign=15.0) == 60.0
    assert _dig_bala("Saturn", house=1, degree_in_sign=15.0) == 0.0
    assert _dig_bala("Saturn", house=4, degree_in_sign=15.0) == 30.0

    # 4. Sun & Mars peak in House 10 (Zenith), zero in House 4
    for p in ["Sun", "Mars"]:
        assert _dig_bala(p, house=10, degree_in_sign=15.0) == 60.0
        assert _dig_bala(p, house=4, degree_in_sign=15.0) == 0.0
        assert _dig_bala(p, house=7, degree_in_sign=15.0) == 30.0


def test_kaala_bala_day_vs_night_and_paksha():
    """
    Verify Temporal Strength (Kaala Bala):
    - Day birth (e.g. 12:00 noon): Sun, Jupiter, Venus get Nathonnatha Bala
    - Night birth (e.g. 00:00 midnight or 23:00): Moon, Mars, Saturn get Nathonnatha Bala
    - Mercury active day and night
    - Shukla Paksha strengthens benefics; Krishna Paksha strengthens malefics
    """
    # Day birth (12.0) & Shukla Paksha (waxing)
    sun_day_shukla = _kaala_bala("Sun", birth_hour_local=12.0, is_shukla_paksha=True)
    sun_night_shukla = _kaala_bala("Sun", birth_hour_local=0.0, is_shukla_paksha=True)
    assert sun_day_shukla > sun_night_shukla

    # Night birth (0.0 / midnight) & Krishna Paksha (waning)
    mars_night_krishna = _kaala_bala("Mars", birth_hour_local=0.0, is_shukla_paksha=False)
    mars_day_shukla = _kaala_bala("Mars", birth_hour_local=12.0, is_shukla_paksha=True)
    assert mars_night_krishna > mars_day_shukla

    # Jupiter benefics in Shukla Paksha
    jup_shukla = _kaala_bala("Jupiter", birth_hour_local=12.0, is_shukla_paksha=True)
    jup_krishna = _kaala_bala("Jupiter", birth_hour_local=12.0, is_shukla_paksha=False)
    assert jup_shukla > jup_krishna

    # Midnight and cusp hours
    assert _kaala_bala("Mercury", birth_hour_local=0.0, is_shukla_paksha=True) > 0
    assert _kaala_bala("Mercury", birth_hour_local=23.99, is_shukla_paksha=True) > 0


def test_cheshta_bala_retrograde_and_luminaries():
    """
    Verify Motional Strength (Cheshta Bala):
    - Retrograde planets get 60.0 Virupas
    - Direct planets get 30.0 Virupas
    - Sun and Moon always get baseline 30.0 Virupas
    """
    # Retrograde planets
    assert _cheshta_bala("Mars", is_retrograde=True, p_data={}) == 60.0
    assert _cheshta_bala("Jupiter", is_retrograde=True, p_data={}) == 60.0
    assert _cheshta_bala("Saturn", is_retrograde=True, p_data={}) == 60.0
    assert _cheshta_bala("Mercury", is_retrograde=True, p_data={}) == 60.0
    assert _cheshta_bala("Venus", is_retrograde=True, p_data={}) == 60.0

    # Direct planets
    assert _cheshta_bala("Mars", is_retrograde=False, p_data={}) == 30.0
    assert _cheshta_bala("Jupiter", is_retrograde=False, p_data={}) == 30.0

    # Luminaries (Sun / Moon) never retrograde in Vedic
    assert _cheshta_bala("Sun", is_retrograde=False, p_data={}) == 30.0
    assert _cheshta_bala("Sun", is_retrograde=True, p_data={}) == 30.0
    assert _cheshta_bala("Moon", is_retrograde=False, p_data={}) == 30.0
    assert _cheshta_bala("Moon", is_retrograde=True, p_data={}) == 30.0


def test_drik_bala_aspects():
    """
    Verify Aspectual Strength (Drik Bala):
    - Benefic aspects (Jupiter, Venus) increase Drik Bala
    - Malefic aspects (Mars, Saturn, Sun) reduce Drik Bala
    - Output is bounded within [-30.0, 30.0]
    """
    planets_with_jupiter_aspect = {
        "Sun": {"house": 6},
        "Jupiter": {"house": 1},  # h_dist = (6 - 1) % 12 = 5 -> aspected by Jupiter
    }
    drik_sun = _drik_bala("Sun", planets_with_jupiter_aspect["Sun"], planets_with_jupiter_aspect)
    assert drik_sun > 0.0

    planets_with_mars_aspect = {
        "Moon": {"house": 5},
        "Mars": {"house": 1},  # h_dist = (5 - 1) % 12 = 4 -> Mars aspect
    }
    drik_moon = _drik_bala("Moon", planets_with_mars_aspect["Moon"], planets_with_mars_aspect)
    assert drik_moon < 0.0

    # Test clamping bounds
    assert -30.0 <= drik_sun <= 30.0
    assert -30.0 <= drik_moon <= 30.0


def test_sthana_bala_kendra_and_dignity():
    """
    Verify Positional Strength (Sthana Bala):
    - Kendra houses (1, 4, 7, 10) = 60 Virupas
    - Panaphara houses (2, 5, 8, 11) = 30 Virupas
    - Apoklima houses (3, 6, 9, 12) = 15 Virupas
    - Exalted bonus (45.0) > Moolatrikona (37.5) > Own Sign (30.0) > Neutral (15.0) > Debilitated (7.5)
    """
    # Sun in Aries (sign 0, Odd), House 10 (Kendra), Exalted at 10°
    p_exalted = {
        "longitude": 10.0,
        "house": 10,
        "sign_index": 0,
        "dignity": "Exalted",
    }
    sthana_exalted = _sthana_bala("Sun", p_exalted, {})
    # uchcha(60) + kendra(60) + ojha(15) + dignity(45) = 180.0
    assert sthana_exalted == 180.0

    # Sun in Libra (sign 6, Odd sign in modulo arithmetic), House 3 (Apoklima), Debilitated at 190°
    p_debilitated = {
        "longitude": 190.0,
        "house": 3,
        "sign_index": 6,
        "dignity": "Debilitated",
    }
    sthana_deb = _sthana_bala("Sun", p_debilitated, {})
    # uchcha(0) + kendra(15) + ojha(15) + dignity(7.5) = 37.5
    assert sthana_deb == 37.5


def test_full_shadbala_integration_and_status():
    """
    Test complete 6-fold Shadbala calculation across all 7 classical planets,
    verifying Virupas, Rupas, ratios, and status categorization.
    """
    chart_planets = {
        "Sun": {"sign_index": 0, "longitude": 10.0, "house": 10, "degree_in_sign": 10.0, "dignity": "Exalted", "retrograde": False},
        "Moon": {"sign_index": 1, "longitude": 33.0, "house": 4, "degree_in_sign": 3.0, "dignity": "Moolatrikona", "retrograde": False},
        "Mars": {"sign_index": 9, "longitude": 298.0, "house": 10, "degree_in_sign": 28.0, "dignity": "Exalted", "retrograde": True},
        "Mercury": {"sign_index": 5, "longitude": 165.0, "house": 1, "degree_in_sign": 15.0, "dignity": "Exalted", "retrograde": False},
        "Jupiter": {"sign_index": 3, "longitude": 95.0, "house": 1, "degree_in_sign": 5.0, "dignity": "Exalted", "retrograde": False},
        "Venus": {"sign_index": 11, "longitude": 357.0, "house": 4, "degree_in_sign": 27.0, "dignity": "Exalted", "retrograde": False},
        "Saturn": {"sign_index": 6, "longitude": 200.0, "house": 7, "degree_in_sign": 20.0, "dignity": "Exalted", "retrograde": True},
    }

    results = compute_shadbala(chart_planets, birth_hour_local=14.5, is_shukla_paksha=True)

    assert len(results) == 7
    for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        assert p in results
        data = results[p]

        # Invariants:
        # All individual components must be non-negative (except drik which can be bounded [-30, 30])
        assert data["sthana_bala"] > 0
        assert data["dig_bala"] >= 0
        assert data["kaala_bala"] > 0
        assert data["cheshta_bala"] >= 30.0
        assert data["naisargika_bala"] == NAISARGIKA_BALA[p]
        assert -30.0 <= data["drik_bala"] <= 30.0

        # Mathematical link between Virupas and Rupas
        assert data["total_virupas"] > 0
        assert data["total_rupas"] == round(data["total_virupas"] / 60.0, 2)
        assert data["required_rupas"] == MIN_RUPAS_REQUIRED[p]
        assert data["strength_ratio"] == round(data["total_rupas"] / data["required_rupas"], 2)

        # Status text validation
        if data["strength_ratio"] >= 1.15:
            assert data["status"] == "Strong (High Capacity)"
        elif data["strength_ratio"] >= 0.95:
            assert data["status"] == "Moderate (Balanced)"
        else:
            assert data["status"] == "Weak / Afflicted (Requires Support)"
