from app.engine.core import sublord_of, nakshatra_of, compute_d1

def test_sublord_ashwini_boundary():
    # Ashwini starts at 0.0 deg (lord Ketu).
    # 1st sub is Ketu: 0.0 to (13.333333 * 7 / 120 = 0.777778 deg)
    assert sublord_of(0.1) == "Ketu"
    # 2nd sub is Venus: 0.777778 to (0.777778 + 13.333333 * 20 / 120 = 3.0 deg)
    assert sublord_of(1.5) == "Venus"

def test_chart_has_sublords():
    chart = compute_d1(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    assert "sublord" in chart["lagna"]
    assert chart["lagna"]["sublord"] in ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
    for pname, p in chart["planets"].items():
        assert "sublord" in p
        assert p["sublord"] in ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
