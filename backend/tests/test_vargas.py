from __future__ import annotations

import pytest
from app.engine.constants import PLANET_ORDER, SIGN_NAMES
from app.engine.vargas import (
    VARGA_DESCRIPTIONS,
    VARGA_FORMULAS,
    compute_varga_chart,
    d3_sign,
    d7_sign,
    d9_sign,
    d10_sign,
    d12_sign,
    d30_sign,
)


def test_varga_sign_indices_invariant_range():
    """
    Mathematical Invariant:
    Every Varga function must return integer sign indices strictly in the range [0, 11]
    across the entire 0° to 360° zodiac spectrum.
    """
    for deg in [0.0, 0.001, 2.999, 3.0, 10.0, 15.0, 29.999, 30.0, 32.5, 95.0, 180.0, 270.0, 359.999]:
        for code, fn in VARGA_FORMULAS.items():
            s_idx = fn(deg)
            assert isinstance(s_idx, int), f"{code}({deg}) returned non-int"
            assert 0 <= s_idx <= 11, f"{code}({deg}) returned {s_idx}, out of [0, 11]"


def test_d10_dashamsha_odd_and_even_signs():
    """
    Dashamsha (D10): 3° divisions (10 parts per sign).
    - Odd signs (Aries=0, Gemini=2, Leo=4...): starts from natal sign itself.
    - Even signs (Taurus=1, Cancer=3, Virgo=5...): starts from 9th sign (+8).
    """
    # 1. Odd Sign: Aries (sign 0, lon 0..30°)
    # 0.0° - 3.0° -> Part 0 -> Aries (0)
    assert d10_sign(0.0) == 0
    assert d10_sign(2.999) == 0
    # 3.0° - 6.0° -> Part 1 -> Taurus (1)
    assert d10_sign(3.0) == 1
    assert d10_sign(5.999) == 1
    # 27.0° - 30.0° -> Part 9 -> Capricorn (9)
    assert d10_sign(27.0) == 9
    assert d10_sign(29.999) == 9

    # 2. Odd Sign: Leo (sign 4, lon 120..150°)
    # 120.0° (0° in Leo) -> Part 0 -> Leo (4)
    assert d10_sign(120.0) == 4
    # 123.0° (3° in Leo) -> Part 1 -> Virgo (5)
    assert d10_sign(123.0) == 5

    # 3. Even Sign: Taurus (sign 1, lon 30..60°)
    # 9th from Taurus (1) is Capricorn (1 + 8 = 9)
    # 30.0° (0° in Taurus) -> Part 0 -> Capricorn (9)
    assert d10_sign(30.0) == 9
    assert d10_sign(32.999) == 9
    # 33.0° (3° in Taurus) -> Part 1 -> Aquarius (10)
    assert d10_sign(33.0) == 10
    # 57.0° (27° in Taurus) -> Part 9 -> (9 + 9) % 12 = 6 -> Libra (6)
    assert d10_sign(57.0) == 6
    assert d10_sign(59.999) == 6

    # 4. Even Sign: Cancer (sign 3, lon 90..120°)
    # 9th from Cancer (3) is Pisces (3 + 8 = 11)
    # 90.0° -> Pisces (11)
    assert d10_sign(90.0) == 11
    # 93.0° -> Aries (0)
    assert d10_sign(93.0) == 0


def test_d7_saptamsha_odd_and_even_signs():
    """
    Saptamsha (D7): 30/7 = ~4.2857° per division.
    - Odd signs: starts from natal sign itself.
    - Even signs: starts from 7th sign (+6).
    """
    # 1. Odd Sign: Aries (0)
    # Part 0 (0 to 4.2857°) -> Aries (0)
    assert d7_sign(0.0) == 0
    assert d7_sign(4.0) == 0
    # Part 1 (4.2857 to 8.5714°) -> Taurus (1)
    assert d7_sign(4.3) == 1
    # Part 6 (25.714 to 30.0°) -> Libra (6)
    assert d7_sign(28.0) == 6
    assert d7_sign(29.999) == 6

    # 2. Even Sign: Taurus (1) -> 7th from Taurus is Scorpio (1 + 6 = 7)
    # Part 0 in Taurus (lon 30.0 to 34.2857°) -> Scorpio (7)
    assert d7_sign(30.0) == 7
    assert d7_sign(34.0) == 7
    # Part 1 in Taurus (lon 34.2857 to 38.5714°) -> Sagittarius (8)
    assert d7_sign(35.0) == 8


def test_d3_drekkana_formula_and_cusps():
    """
    Drekkana (D3): 10° divisions (1st: 1st sign, 2nd: 5th sign (+4), 3rd: 9th sign (+8)).
    """
    # Aries (0):
    # 0 - 10° -> Aries (0)
    assert d3_sign(0.0) == 0
    assert d3_sign(9.999) == 0
    # 10 - 20° -> Leo (4)
    assert d3_sign(10.0) == 4
    assert d3_sign(19.999) == 4
    # 20 - 30° -> Sagittarius (8)
    assert d3_sign(20.0) == 8
    assert d3_sign(29.999) == 8

    # Scorpio (sign 7, lon 210..240°):
    # 210° (0° Scorpio) -> Scorpio (7)
    assert d3_sign(210.0) == 7
    # 225° (15° Scorpio) -> Pisces ((7 + 4) % 12 = 11)
    assert d3_sign(225.0) == 11
    # 235° (25° Scorpio) -> Cancer ((7 + 8) % 12 = 3)
    assert d3_sign(235.0) == 3


def test_d12_dwadashamsha_formula():
    """
    Dwadashamsha (D12): 2°30' (2.5°) divisions for ancestors and parents.
    Always starts from the natal sign itself.
    """
    # Aries (0):
    # 0.0° - 2.5° -> Part 0 -> Aries (0)
    assert d12_sign(0.0) == 0
    assert d12_sign(2.499) == 0
    # 2.5° - 5.0° -> Part 1 -> Taurus (1)
    assert d12_sign(2.5) == 1
    # 27.5° - 30.0° -> Part 11 -> Pisces (11)
    assert d12_sign(27.5) == 11
    assert d12_sign(29.999) == 11

    # Gemini (sign 2, lon 60..90°):
    # 60.0° (0° Gemini) -> Gemini (2)
    assert d12_sign(60.0) == 2
    # 63.0° (3° Gemini) -> Cancer (3)
    assert d12_sign(63.0) == 3


def test_d30_trimshamsha_odd_and_even_divisions():
    """
    Trimshamsha (D30): Unequal divisions for subconscious karma and afflictions.
    - Odd signs:
      0-5°: Mars (Aries = 0)
      5-10°: Saturn (Aquarius = 10)
      10-18°: Jupiter (Sagittarius = 8)
      18-25°: Mercury (Gemini = 2)
      25-30°: Venus (Libra = 6)
    - Even signs:
      0-5°: Venus (Taurus = 1)
      5-12°: Mercury (Virgo = 5)
      12-20°: Jupiter (Pisces = 11)
      20-25°: Saturn (Capricorn = 9)
      25-30°: Mars (Scorpio = 7)
    """
    # Odd Sign (Aries = 0, lon 0..30°)
    assert d30_sign(0.0) == 0
    assert d30_sign(4.999) == 0
    assert d30_sign(5.0) == 10
    assert d30_sign(9.999) == 10
    assert d30_sign(10.0) == 8
    assert d30_sign(17.999) == 8
    assert d30_sign(18.0) == 2
    assert d30_sign(24.999) == 2
    assert d30_sign(25.0) == 6
    assert d30_sign(29.999) == 6

    # Even Sign (Taurus = 1, lon 30..60°)
    # 30-35° (0-5°) -> Taurus (1)
    assert d30_sign(30.0) == 1
    assert d30_sign(34.999) == 1
    # 35-42° (5-12°) -> Virgo (5)
    assert d30_sign(35.0) == 5
    assert d30_sign(41.999) == 5
    # 42-50° (12-20°) -> Pisces (11)
    assert d30_sign(42.0) == 11
    assert d30_sign(49.999) == 11
    # 50-55° (20-25°) -> Capricorn (9)
    assert d30_sign(50.0) == 9
    assert d30_sign(54.999) == 9
    # 55-60° (25-30°) -> Scorpio (7)
    assert d30_sign(55.0) == 7
    assert d30_sign(59.999) == 7


def test_compute_varga_chart_full_integration():
    """
    Test compute_varga_chart function:
    - Relative whole-sign houses from Varga Lagna
    - Vargottama detection
    - Output dictionary structure and descriptions
    """
    sample_planets = {
        "Sun": {"sign_index": 0, "longitude": 1.5},    # Aries 1.5° -> D10: Aries (0) -> Vargottama!
        "Moon": {"sign_index": 1, "longitude": 31.5},  # Taurus 1.5° -> D10: Capricorn (9)
        "Mars": {"sign_index": 4, "longitude": 124.5}, # Leo 4.5° -> D10: Virgo (5)
        "Jupiter": {"sign_index": 8, "longitude": 241.0}, # Sag 1.0° -> D10: Sag (8) -> Vargottama!
    }
    lagna_lon = 1.0  # Aries 1.0° -> D10 Lagna = Aries (0)

    chart_d10 = compute_varga_chart(sample_planets, lagna_lon, varga="D10")

    assert chart_d10["varga"] == "D10"
    assert "Career" in chart_d10["description"]
    assert chart_d10["lagna"]["sign"] == "Aries"
    assert chart_d10["lagna"]["sign_index"] == 0
    assert chart_d10["lagna"]["house"] == 1

    # Sun in Aries (0) relative to Lagna Aries (0) -> House 1
    assert chart_d10["planets"]["Sun"]["house"] == 1
    assert chart_d10["planets"]["Sun"]["vargottama"] is True

    # Moon in Capricorn (9) relative to Lagna Aries (0) -> House 10
    assert chart_d10["planets"]["Moon"]["house"] == 10
    assert chart_d10["planets"]["Moon"]["vargottama"] is False

    # Mars in Virgo (5) relative to Lagna Aries (0) -> House 6
    assert chart_d10["planets"]["Mars"]["house"] == 6

    # Test other vargas: D3, D7, D12, D30, D9
    for v_code in ["D3", "D7", "D12", "D30", "D9"]:
        vc = compute_varga_chart(sample_planets, lagna_lon, varga=v_code)
        assert vc["varga"] == v_code
        assert vc["lagna"]["house"] == 1
        for p in sample_planets:
            if p in vc["planets"]:
                assert 1 <= vc["planets"][p]["house"] <= 12
                assert 0 <= vc["planets"][p]["sign_index"] <= 11
