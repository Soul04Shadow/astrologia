from __future__ import annotations

from app.engine import compute_full_chart
from app.engine.varshphal import compute_varshphal, compute_solar_return_jd
import swisseph as swe
from app.engine.core import FLAGS


def test_birth_panchang_calculated():
    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    assert "panchang_birth" in chart
    bp = chart["panchang_birth"]
    assert "tithi" in bp
    assert "nakshatra" in bp
    assert "yoga" in bp
    assert "karana" in bp
    assert "weekday" in bp
    assert bp["weekday"] == "Monday"
    # Moon in Revati
    assert bp["nakshatra"]["name"] == "Revati"
    assert bp["nakshatra"]["lord"] == "Mercury"


def test_varshphal_astronomical_precision():
    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    natal_sun_lon = chart["planets"]["Sun"]["longitude"]

    # Target year 2026
    v2026 = compute_varshphal(chart, target_year=2026)
    assert v2026["target_year"] == 2026
    assert v2026["completed_age"] == 36
    assert v2026["running_year_age"] == 37

    # Varsha Sun longitude must match natal Sun longitude within 0.0001 deg
    v_sun_lon = v2026["planets"]["Sun"]["longitude"]
    diff = abs(natal_sun_lon - v_sun_lon) % 360
    diff = min(diff, 360 - diff)
    assert diff < 0.0001, f"Varsha Sun longitude difference too large: {diff}"


def test_muntha_progression():
    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    natal_lagna_idx = chart["lagna"]["sign_index"]

    # Age 0 (year 1990) -> Muntha in Natal Lagna sign
    v1990 = compute_varshphal(chart, target_year=1990)
    assert v1990["muntha"]["sign_index"] == natal_lagna_idx

    # Age 1 (year 1991) -> Muntha in Natal Lagna + 1
    v1991 = compute_varshphal(chart, target_year=1991)
    assert v1991["muntha"]["sign_index"] == (natal_lagna_idx + 1) % 12

    # Age 36 (year 2026) -> Muntha in (natal_lagna_idx + 36) % 12 == natal_lagna_idx
    v2026 = compute_varshphal(chart, target_year=2026)
    assert v2026["muntha"]["sign_index"] == (natal_lagna_idx + 36) % 12


def test_varsheshwara_and_mudda_dasha():
    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
    v = compute_varshphal(chart, target_year=2026)

    # Panchaadhikaris
    assert "panchaadhikaris" in v
    assert "varsheshwara" in v["panchaadhikaris"]
    varshesh = v["panchaadhikaris"]["varsheshwara"]
    assert varshesh in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

    # Mudda dasha: exactly 9 periods covering the 365.25 day annual cycle
    mudda = v["mudda_dasha"]
    assert len(mudda) == 9
    total_days = sum(m["duration_days"] for m in mudda)
    assert 364.5 <= total_days <= 366.0


def test_varshphal_endpoint_and_profile_enrichment(client=None):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db import get_db, init_db, Profile, User
    from app.services.auth import get_current_user

    init_db()
    test_user = User(id="test-user-varsh", email="testvarsh@example.com")

    app.dependency_overrides[get_current_user] = lambda: test_user
    c = TestClient(app)

    try:
        # Create profile
        p_res = c.post("/api/profiles", json={
            "name": "Varsh Native",
            "birth_date": "1990-05-21",
            "birth_time": "14:30",
            "place_name": "New Delhi",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "tz_name": "Asia/Kolkata",
        })
        assert p_res.status_code == 200, p_res.text
        p_data = p_res.json()
        assert p_data["nakshatra"] == "Revati"
        assert p_data["nakshatra_lord"] == "Mercury"
        pid = p_data["id"]

        # Call varshphal endpoint
        v_res = c.get(f"/api/charts/{pid}/varshphal?year=2026")
        assert v_res.status_code == 200, v_res.text
        v_json = v_res.json()
        assert "varshphal" in v_json
        assert v_json["varshphal"]["target_year"] == 2026
        assert "muntha" in v_json["varshphal"]
        assert "panchaadhikaris" in v_json["varshphal"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

