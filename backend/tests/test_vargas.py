from __future__ import annotations

from app.engine.vargas import (
    compute_varga_chart,
    d3_sign,
    d7_sign,
    d9_sign,
    d10_sign,
    d12_sign,
    d30_sign,
)


def test_d10_dashamsha_formula():
    # Odd sign (Aries = 0 lon 0..30)
    # 0-3° -> 1st part -> Aries (0)
    assert d10_sign(1.5) == 0
    # 3-6° -> 2nd part -> Taurus (1)
    assert d10_sign(4.5) == 1
    # 27-30° -> 10th part -> Capricorn (9)
    assert d10_sign(28.5) == 9

    # Even sign (Taurus = 1 lon 30..60)
    # Even signs start from 9th from Taurus -> Capricorn (9)
    # 30-33° -> 1st part -> Capricorn (9)
    assert d10_sign(31.5) == 9
    # 33-36° -> 2nd part -> Aquarius (10)
    assert d10_sign(34.5) == 10


def test_d7_saptamsha_formula():
    # Odd sign (Aries = 0): starts from Aries (0)
    # 0 to 4.285° -> Aries (0)
    assert d7_sign(2.0) == 0
    # 4.285 to 8.57° -> Taurus (1)
    assert d7_sign(5.0) == 1

    # Even sign (Taurus = 1): starts from 7th from Taurus -> Scorpio (7)
    # 30 to 34.285° -> Scorpio (7)
    assert d7_sign(32.0) == 7


def test_d3_drekkana_formula():
    # Aries (0): 0-10° -> Aries (0); 10-20° -> Leo (4); 20-30° -> Sagittarius (8)
    assert d3_sign(5.0) == 0
    assert d3_sign(15.0) == 4
    assert d3_sign(25.0) == 8


def test_d30_trimshamsha_formula():
    # Odd sign (Aries = 0):
    # 0-5° -> Mars (Aries = 0)
    assert d30_sign(2.5) == 0
    # 5-10° -> Saturn (Aquarius = 10)
    assert d30_sign(7.5) == 10
    # 10-18° -> Jupiter (Sagittarius = 8)
    assert d30_sign(14.0) == 8
    # 18-25° -> Mercury (Gemini = 2)
    assert d30_sign(21.0) == 2
    # 25-30° -> Venus (Libra = 6)
    assert d30_sign(27.0) == 6

    # Even sign (Taurus = 1):
    # 30-35° (0-5° in Taurus) -> Venus (Taurus = 1)
    assert d30_sign(32.5) == 1
    # 35-42° (5-12° in Taurus) -> Mercury (Virgo = 5)
    assert d30_sign(38.0) == 5
    # 42-50° (12-20° in Taurus) -> Jupiter (Pisces = 11)
    assert d30_sign(45.0) == 11


def test_compute_varga_chart_structure():
    sample_planets = {
        "Sun": {"sign_index": 0, "longitude": 15.0},
        "Moon": {"sign_index": 1, "longitude": 45.0},
        "Mars": {"sign_index": 4, "longitude": 135.0},
    }
    lagna_lon = 25.0  # Aries 25°

    d10_chart = compute_varga_chart(sample_planets, lagna_lon, varga="D10")
    assert d10_chart["varga"] == "D10"
    assert "lagna" in d10_chart
    assert "planets" in d10_chart
    assert d10_chart["lagna"]["house"] == 1
    assert all("house" in p for p in d10_chart["planets"].values())
