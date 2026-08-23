from __future__ import annotations

import asyncio
import json


def test_tools_specs_and_execute():
    from app.services.tools import TOOLS, execute
    from app.engine import compute_full_chart

    # 10 tools
    assert len(TOOLS) == 10, f"expected 10 tools got {len(TOOLS)}"
    names = [t["function"]["name"] for t in TOOLS]
    expected = {
        "get_transit",
        "get_panchang",
        "get_dasha_at",
        "get_yogas",
        "get_navamsa",
        "get_chart_snapshot",
        "get_ashtakavarga",
        "get_shadbala",
        "get_varga_chart",
        "get_sade_sati_details",
    }
    assert set(names) == expected, f"names mismatch {names}"

    # JSON Schema validate: each has type function, description, parameters jsonSchema
    for t in TOOLS:
        assert t.get("type") == "function"
        fn = t.get("function")
        assert isinstance(fn, dict)
        assert "name" in fn and isinstance(fn["name"], str)
        assert "description" in fn and isinstance(fn["description"], str) and len(fn["description"]) > 10
        params = fn.get("parameters")
        assert isinstance(params, dict)
        assert params.get("type") == "object"
        assert "properties" in params
        # try jsonschema if available
        try:
            import jsonschema  # type: ignore
            jsonschema.Draft7Validator.check_schema(params)
        except ImportError:
            pass
        except Exception as e:
            assert False, f"schema invalid for {fn['name']}: {e}"

    # execute returns JSON for each tool
    chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.61, 77.20)

    # get_transit
    out = asyncio.run(execute("get_transit", {"at_date": "2027-06-01"}, chart))
    data = json.loads(out)
    assert "transits" in data or "positions" in data
    trans_map = data.get("transits") or data.get("positions")
    assert "Sun" in trans_map

    # get_panchang
    out = asyncio.run(execute("get_panchang", {"at_date": "2027-06-01"}, chart))
    data = json.loads(out)
    assert "panchang" in data
    assert "tithi" in data["panchang"]
    assert "nakshatra" in data["panchang"]

    # get_dasha_at
    out = asyncio.run(execute("get_dasha_at", {"at_date": "2027-06-01"}, chart))
    data = json.loads(out)
    assert "current" in data

    # get_yogas
    out = asyncio.run(execute("get_yogas", {}, chart))
    data = json.loads(out)
    assert "yogas" in data

    # get_navamsa
    out = asyncio.run(execute("get_navamsa", {}, chart))
    data = json.loads(out)
    assert "navamsa_d9" in data

    # get_chart_snapshot
    out = asyncio.run(execute("get_chart_snapshot", {}, chart))
    data = json.loads(out)
    assert "planets" in data
    assert "lagna" in data

    # get_ashtakavarga
    out = asyncio.run(execute("get_ashtakavarga", {}, chart))
    data = json.loads(out)
    assert "ashtakavarga" in data
    assert data["ashtakavarga"]["total_bindus"] == 337

    # get_shadbala
    out = asyncio.run(execute("get_shadbala", {}, chart))
    data = json.loads(out)
    assert "shadbala" in data
    assert "Sun" in data["shadbala"]

    # get_varga_chart (D10, D7, D3, D12, D30)
    for v in ["D10", "D7", "D3", "D12", "D30"]:
        out = asyncio.run(execute("get_varga_chart", {"varga": v}, chart))
        data = json.loads(out)
        assert "varga_chart" in data
        assert data["varga_chart"]["varga"] == v

    # get_sade_sati_details
    out = asyncio.run(execute("get_sade_sati_details", {}, chart))
    data = json.loads(out)
    assert "sade_sati" in data
    assert "guru_gochar" in data

    # bad date raises ValueError not crash
    try:
        asyncio.run(execute("get_transit", {"at_date": "bad"}, chart))
        assert False, "should have raised ValueError for bad date"
    except ValueError:
        pass

    # also bad for panchang
    try:
        asyncio.run(execute("get_panchang", {"at_date": "not-a-date"}, chart))
        assert False, "should have raised ValueError"
    except ValueError:
        pass

    # get_dasha_at bad
    try:
        asyncio.run(execute("get_dasha_at", {"at_date": "bad"}, chart))
        assert False, "should have raised ValueError"
    except ValueError:
        pass
