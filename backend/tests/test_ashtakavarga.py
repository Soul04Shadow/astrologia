from __future__ import annotations

import pytest
from app.engine.ashtakavarga import (
    KAKSHYA_LORDS,
    PARASHARA_BAV_RULES,
    compute_ashtakavarga,
    get_kakshya,
)
from app.engine.constants import SIGN_NAMES


def test_parashara_bav_rule_definitions():
    """
    Verify classical Parashari rule matrix counts:
    Sun=48, Moon=49, Mars=39, Mercury=54, Jupiter=56, Venus=52, Saturn=39. Total = 337.
    """
    expected_totals = {
        "Sun": 48,
        "Moon": 49,
        "Mars": 39,
        "Mercury": 54,
        "Jupiter": 56,
        "Venus": 52,
        "Saturn": 39,
    }
    calculated_totals = {}
    for receiver, donor_dict in PARASHARA_BAV_RULES.items():
        total_points = sum(len(houses) for houses in donor_dict.values())
        calculated_totals[receiver] = total_points

    assert calculated_totals == expected_totals
    assert sum(calculated_totals.values()) == 337


@pytest.mark.parametrize(
    "lagna_sign_idx,planet_distribution",
    [
        # All planets in Aries (sign 0)
        (0, {p: {"sign_index": 0, "longitude": 15.0} for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]}),
        # All planets in Pisces (sign 11)
        (11, {p: {"sign_index": 11, "longitude": 345.0} for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]}),
        # Linear spread across signs 0 to 6
        (0, {p: {"sign_index": i, "longitude": i * 30.0 + 15.0} for i, p in enumerate(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"])}),
        # Concentrated stellium in Leo (sign 4)
        (4, {p: {"sign_index": 4, "longitude": 130.0 + i} for i, p in enumerate(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"])}),
        # Real-world chart configuration
        (8, {
            "Sun": {"sign_index": 1, "longitude": 45.2},
            "Moon": {"sign_index": 11, "longitude": 352.1},
            "Mars": {"sign_index": 6, "longitude": 195.4},
            "Mercury": {"sign_index": 0, "longitude": 22.8},
            "Jupiter": {"sign_index": 3, "longitude": 95.9},
            "Venus": {"sign_index": 2, "longitude": 68.3},
            "Saturn": {"sign_index": 9, "longitude": 288.7},
        }),
    ],
)
def test_sav_sum_invariant_across_configurations(lagna_sign_idx: int, planet_distribution: dict):
    """
    Mathematical Invariant:
    Sarvashtakavarga (SAV) points across all 12 signs must equal EXACTLY 337 bindus
    regardless of planet positions or Lagna.
    """
    result = compute_ashtakavarga(planet_distribution, lagna_sign_idx)

    # 1. Total bindus field
    assert result["total_bindus"] == 337

    # 2. Sum over all 12 signs
    sav_sign_values = list(result["sav_by_sign"].values())
    assert len(sav_sign_values) == 12
    assert sum(sav_sign_values) == 337
    assert all(pts >= 0 for pts in sav_sign_values)

    # 3. Sum over all 12 houses
    sav_house_values = list(result["sav_by_house"].values())
    assert len(sav_house_values) == 12
    assert sum(sav_house_values) == 337
    assert all(pts >= 0 for pts in sav_house_values)

    # 4. Average per house
    assert result["average_per_house"] == 28.1

    # 5. Check each planet's BAV total matches Parashari canonical count
    expected_bav_totals = {
        "Sun": 48,
        "Moon": 49,
        "Mars": 39,
        "Mercury": 54,
        "Jupiter": 56,
        "Venus": 52,
        "Saturn": 39,
    }
    for p, exp_sum in expected_bav_totals.items():
        assert p in result["bav"]
        assert len(result["bav"][p]) == 12
        assert sum(result["bav"][p]) == exp_sum


def test_house_strengths_mapping_and_categorization():
    """
    Verify house strengths mapping from Lagna sign and classification categories.
    """
    sample_planets = {
        "Sun": {"sign_index": 0, "longitude": 10.0},
        "Moon": {"sign_index": 1, "longitude": 40.0},
        "Mars": {"sign_index": 2, "longitude": 70.0},
        "Mercury": {"sign_index": 3, "longitude": 100.0},
        "Jupiter": {"sign_index": 4, "longitude": 130.0},
        "Venus": {"sign_index": 5, "longitude": 160.0},
        "Saturn": {"sign_index": 6, "longitude": 190.0},
    }
    lagna_sign_idx = 4  # Leo

    result = compute_ashtakavarga(sample_planets, lagna_sign_idx)
    strengths = result["house_strengths"]

    assert len(strengths) == 12

    for h in range(1, 13):
        h_data = strengths[h]
        expected_sign_idx = (lagna_sign_idx + (h - 1)) % 12
        assert h_data["house"] == h
        assert h_data["sign_index"] == expected_sign_idx
        assert h_data["sign"] == SIGN_NAMES[expected_sign_idx]
        assert h_data["points"] == result["sav_by_house"][h]

        # Classification check
        pts = h_data["points"]
        if pts >= 30:
            assert h_data["status"] == "Strong / Auspicious"
        elif pts >= 26:
            assert h_data["status"] == "Moderate / Average"
        else:
            assert h_data["status"] == "Low / Challenging"


def test_kakshya_calculations_all_divisions():
    """
    Test Kakshya calculation for all 8 Kakshyas (3°45' = 3.75° per division).
    Rulers in order: Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon, Lagna.
    """
    assert KAKSHYA_LORDS == ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Lagna"]

    expected_kakshyas = [
        (1, "Saturn", 0.0, 3.75),
        (2, "Jupiter", 3.75, 7.50),
        (3, "Mars", 7.50, 11.25),
        (4, "Sun", 11.25, 15.00),
        (5, "Venus", 15.00, 18.75),
        (6, "Mercury", 18.75, 22.50),
        (7, "Moon", 22.50, 26.25),
        (8, "Lagna", 26.25, 30.00),
    ]

    for k_num, lord, start_deg, end_deg in expected_kakshyas:
        # Test midpoint
        mid = (start_deg + end_deg) / 2.0
        k_info = get_kakshya(mid)
        assert k_info["kakshya_num"] == k_num
        assert k_info["lord"] == lord
        assert k_info["span"] == f"{start_deg:.2f}° - {end_deg:.2f}°"

        # Test start boundary
        k_start = get_kakshya(start_deg)
        assert k_start["kakshya_num"] == k_num
        assert k_start["lord"] == lord

        # Test slightly before end boundary
        if end_deg < 30.0:
            k_near_end = get_kakshya(end_deg - 0.0001)
            assert k_near_end["kakshya_num"] == k_num
            assert k_near_end["lord"] == lord


def test_kakshya_edge_cases():
    """
    Test Kakshya calculation with edge degree values:
    - 0.0°
    - 29.999999°
    - Greater than 30° (modulo wrap: e.g. 45° -> 15° -> 5th Kakshya)
    - 360.0°
    """
    # 0.0°
    k_zero = get_kakshya(0.0)
    assert k_zero["kakshya_num"] == 1
    assert k_zero["lord"] == "Saturn"

    # 29.999999°
    k_cusp = get_kakshya(29.999999)
    assert k_cusp["kakshya_num"] == 8
    assert k_cusp["lord"] == "Lagna"

    # 45.0° -> 15.0° in sign -> 5th Kakshya (Venus)
    k_wrap = get_kakshya(45.0)
    assert k_wrap["kakshya_num"] == 5
    assert k_wrap["lord"] == "Venus"

    # 360.0° -> 0.0° in sign -> 1st Kakshya (Saturn)
    k_360 = get_kakshya(360.0)
    assert k_360["kakshya_num"] == 1
    assert k_360["lord"] == "Saturn"


def test_ashtakavarga_partial_and_empty_planets():
    """
    Test robustness when planet data is incomplete or empty.
    Should gracefully fallback to default sign index 0 without crashing.
    """
    empty_result = compute_ashtakavarga({}, lagna_sign_idx=0)
    assert empty_result["total_bindus"] == 337
    assert sum(empty_result["sav_by_sign"].values()) == 337

    partial_planets = {
        "Sun": {"sign_index": 5},
        "Jupiter": {"sign_index": 11},
    }
    partial_result = compute_ashtakavarga(partial_planets, lagna_sign_idx=3)
    assert partial_result["total_bindus"] == 337
    assert len(partial_result["bav"]) == 7
