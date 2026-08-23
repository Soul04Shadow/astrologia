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
    assert len(analysis["marakas"]["lords"]) >= 1
