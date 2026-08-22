from datetime import datetime, timezone

from app.engine.navamsa import navamsa_sign, navamsa_table
from app.engine.panchang import karana_of, panchang_for, tithi_of, yoga_of
from app.engine.transits import compute_transits
from app.engine.yogas import detect_yogas


def test_navamsa_sign_formula():
    assert navamsa_sign(0.0) == 0
    assert navamsa_sign(30.0) == 9
    assert navamsa_sign(60.0) == 6
    assert navamsa_sign(90.0) == 3
    assert navamsa_sign(120.0) == 0


def test_vargottama_detection():
    planets = {
        "Sun": {"longitude": 1.0, "sign_index": 0},
        "Moon": {"longitude": 35.0, "sign_index": 1},
    }
    table = navamsa_table(planets)
    assert table["Sun"]["vargottama"] is True
    assert table["Moon"]["vargottama"] is False


def test_tithi_boundaries():
    t1 = tithi_of(0.5, 0.0)
    assert t1["index"] == 1 and t1["paksha"] == "Shukla" and t1["name"] == "Pratipada"
    t_full = tithi_of(174.0, 0.0)
    assert t_full["name"] == "Purnima" and t_full["paksha"] == "Shukla"
    t_krishna = tithi_of(180.5, 0.0)
    assert t_krishna["paksha"] == "Krishna" and t_krishna["name"] == "Pratipada"
    t_ama = tithi_of(359.5, 0.0)
    assert t_ama["index"] == 30 and t_ama["name"] == "Amavasya"


def test_yoga_bounds():
    y = yoga_of(100.0, 50.0)
    assert 1 <= y["index"] <= 27


def test_karana_names():
    k1 = karana_of(0.5, 0.0)
    assert k1["name"] == "Kimstughna"
    k2 = karana_of(6.5, 0.0)
    assert k2["name"] == "Bava"
    k_last = karana_of(359.5, 0.0)
    assert k_last["index"] == 60 and k_last["name"] == "Kimstughna"


def test_transits_returns_all_planets():
    positions = compute_transits(datetime.now(timezone.utc))
    assert set(positions.keys()) == {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"}
    rahu = positions["Rahu"]["longitude"]
    ketu = positions["Ketu"]["longitude"]
    assert round((rahu + 180) % 360, 4) == round(ketu, 4)


def _chart_stub():
    def p(sign_idx, house, dignity="Neutral"):
        return {"sign_index": sign_idx, "house": house, "dignity": dignity,
                "sign": "", "degree": "", "longitude": 0, "nakshatra": {}}

    return {
        "lagna": {"sign_index": 0},
        "planets": {
            "Sun": p(0, 1), "Moon": p(4, 5), "Mars": p(9, 10, "Exalted"),
            "Mercury": p(0, 1), "Jupiter": p(4, 5), "Venus": p(11, 12),
            "Saturn": p(9, 10), "Rahu": p(7, 8), "Ketu": p(1, 2),
        },
    }


def test_gajakesari_and_budhaditya():
    yogas = detect_yogas(_chart_stub())
    names = [y["name"] for y in yogas]
    assert "Gajakesari Yoga" in names
    assert "Budhaditya Yoga" in names


def test_panch_mahapurush_detected_when_own_sign_in_kendra():
    stub = _chart_stub()
    yogas = detect_yogas(stub)
    names = [y["name"] for y in yogas]
    assert any("Ruchaka" in n for n in names)


def test_panchang_today_smoke():
    p = panchang_for(datetime.now(timezone.utc), "Asia/Kolkata")
    assert 1 <= p["tithi"]["index"] <= 30
    assert 1 <= p["yoga"]["index"] <= 27
    assert p["weekday"] in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
