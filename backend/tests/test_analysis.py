from __future__ import annotations

from app.engine.analysis import compute_drishti, compute_health_and_maraka_analysis, compute_house_lordships
from app.engine import compute_full_chart


def test_house_lordships_leo_lagna():
    # Leo is sign index 4
    lordships = compute_house_lordships(4)
    planet_roles = lordships["planet_roles"]

    # Sun rules House 1 (Lagna lord)
    assert "Lagna Lord" in planet_roles["Sun"]["roles"]
    assert planet_roles["Sun"]["houses_ruled"] == [1]

    # Mars rules Scorpio (House 4, Kendra) and Aries (House 9, Trikona) -> Yogakaraka
    assert "Yogakaraka" in planet_roles["Mars"]["roles"]
    assert sorted(planet_roles["Mars"]["houses_ruled"]) == [4, 9]

    # Mercury rules Virgo (House 2) and Gemini (House 11) -> Maraka
    assert any("Maraka" in r for r in planet_roles["Mercury"]["roles"])
    assert 2 in planet_roles["Mercury"]["houses_ruled"]

    # Saturn rules Capricorn (House 6) and Aquarius (House 7) -> Dusthana & Maraka
    assert any("Dusthana" in r for r in planet_roles["Saturn"]["roles"])
    assert any("Maraka" in r for r in planet_roles["Saturn"]["roles"])
    assert sorted(planet_roles["Saturn"]["houses_ruled"]) == [6, 7]


def test_drishti_special_aspects():
    planets = {
        "Mars": {"house": 1},
        "Jupiter": {"house": 5},
        "Saturn": {"house": 10},
        "Sun": {"house": 7},
    }
    drishti = compute_drishti(planets)

    # Mars in House 1 aspects Houses 4, 7, 8
    assert sorted(drishti["Mars"]["aspected_houses"]) == [4, 7, 8]

    # Jupiter in House 5 aspects Houses 9, 11, 1 (5+4=9, 5+6=11, 5+8=1)
    assert sorted(drishti["Jupiter"]["aspected_houses"]) == [1, 9, 11]

    # Saturn in House 10 aspects Houses 12, 4, 7 (10+2=12, 10+6=4, 10+9=7)
    assert sorted(drishti["Saturn"]["aspected_houses"]) == [4, 7, 12]

    # Sun in House 7 aspects House 1
    assert drishti["Sun"]["aspected_houses"] == [1]


def test_health_and_maraka_analysis():
    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    analysis = chart["analysis"]

    assert "h6" in analysis
    assert "h8" in analysis
    assert "h12" in analysis
    assert "marakas" in analysis
    assert "sade_sati" in analysis
    assert "health_profile" in analysis
    assert len(analysis["marakas"]["lords"]) >= 1


def test_ashtakavarga_337_invariant_and_kakshya():
    from app.engine.ashtakavarga import compute_ashtakavarga, get_kakshya

    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    av = compute_ashtakavarga(chart["planets"], chart["lagna"]["sign_index"])

    assert av["total_bindus"] == 337
    assert sum(av["sav_by_house"].values()) == 337
    assert sum(av["sav_by_sign"].values()) == 337
    assert len(av["bav"]) == 7

    # Check Kakshya
    k0 = get_kakshya(1.5)
    assert k0["kakshya_num"] == 1
    assert k0["lord"] == "Saturn"

    k8 = get_kakshya(28.0)
    assert k8["kakshya_num"] == 8
    assert k8["lord"] == "Lagna"


def test_shadbala_calculations():
    from app.engine.shadbala import compute_shadbala, MIN_RUPAS_REQUIRED

    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    sb = compute_shadbala(chart["planets"])

    assert len(sb) == 7
    for p, d in sb.items():
        assert d["total_rupas"] > 0
        assert d["required_rupas"] == MIN_RUPAS_REQUIRED[p]
        assert d["strength_ratio"] == round(d["total_rupas"] / d["required_rupas"], 2)


def test_vargas_formulas():
    from app.engine.vargas import d3_sign, d7_sign, d9_sign, d10_sign, d12_sign, d30_sign

    # Aries (0) 5°
    assert d3_sign(5.0) == 0      # 1st Drekkana
    assert d3_sign(15.0) == 4     # 2nd Drekkana (Leo)
    assert d3_sign(25.0) == 8     # 3rd Drekkana (Sagittarius)

    # Taurus (1, Even) 5°
    assert d7_sign(35.0) == (1 + 6 + 1) % 12  # Scorpio + 1 = Sagittarius (8)

    # D10 for Aries 1° (Odd) -> Aries (0)
    assert d10_sign(1.0) == 0
    # D10 for Taurus 1° (Even) -> Capricorn (9)
    assert d10_sign(31.0) == 9

    # D30 for Aries 2° (Odd: Mars -> Aries)
    assert d30_sign(2.0) == 0
    # D30 for Taurus 2° (Even: Venus -> Taurus)
    assert d30_sign(32.0) == 1


def test_ground_truth_block_generation():
    from app.engine import ground_truth_block

    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    gt = ground_truth_block(chart, "Test Native")
    assert "DETERMINISTIC ASTROLOGICAL GROUND TRUTH" in gt
    assert "Ashtakavarga (Sarvashtakavarga SAV Points per House, Total=337)" in gt
    assert "Shadbala Planetary Strengths" in gt
    assert "Dashamsha (D10 Career Chart)" in gt
