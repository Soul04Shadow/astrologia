from __future__ import annotations

import io

SIGN_ABBREV = ["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"]

PLANET_ABBREV = {"Rahu": "Ra", "Ketu": "Ke"}

HOUSE_CENTERS = {
    1: (200, 108),
    2: (112, 52),
    3: (44, 100),
    4: (54, 200),
    5: (44, 300),
    6: (112, 348),
    7: (200, 292),
    8: (288, 348),
    9: (356, 300),
    10: (346, 200),
    11: (356, 100),
    12: (288, 52),
}


def _abbrev(name: str) -> str:
    return PLANET_ABBREV.get(name, name[:2])


def render_north_indian_png(chart: dict, varga: str = "D1", width_px: int = 800) -> bytes:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Polygon

    house_planets: dict[int, list[tuple[str, bool]]] = {h: [] for h in range(1, 13)}

    if varga == "D9":
        d9 = chart.get("navamsa_d9", {})
        lagna_index = d9.get("Lagna", {}).get("sign_index", 0)
        house_planets[1].append(("Asc", True))
        for pname, v in d9.items():
            if pname == "Lagna":
                continue
            house = ((v["sign_index"] - lagna_index) % 12) + 1
            mark = _abbrev(pname)
            is_varg = bool(v.get("vargottama"))
            if is_varg:
                mark += "*"
            house_planets[house].append((mark, is_varg))
    else:
        lagna_index = chart["lagna"]["sign_index"]
        lagna_deg = chart.get("lagna", {}).get("degree", "")
        asc_deg = lagna_deg.split("'")[0] + "'" if lagna_deg else ""
        asc_label = f"Asc {asc_deg}".strip() if asc_deg else "Asc"
        house_planets[1].append((asc_label, True))

        for pname, p in chart["planets"].items():
            delta = (p["sign_index"] - lagna_index) % 12
            house = delta + 1
            mark = _abbrev(pname)
            highlight = p["dignity"] == "Exalted" or p.get("retrograde")
            if p["dignity"] == "Exalted":
                mark += "*"
            if p.get("retrograde"):
                mark += "R"
            house_planets[house].append((mark, highlight))

    def sign_for_house(h: int) -> int:
        return (lagna_index + h - 1) % 12

    fig, ax = plt.subplots(figsize=(width_px / 100, width_px / 100), dpi=100)
    ax.set_xlim(0, 400)
    ax.set_ylim(400, 0)
    ax.axis("off")
    fig.subplots_adjust(left=0, right=1, top=1, bottom=0)

    ax.add_patch(Polygon([(4, 4), (396, 4), (396, 396), (4, 396)], closed=True,
                         facecolor="#FFFCF2", edgecolor="#EA580C", linewidth=3))
    ax.plot([4, 396], [4, 396], color="#F97316", linewidth=1.4)
    ax.plot([396, 4], [4, 396], color="#F97316", linewidth=1.4)
    diamond = Polygon([(200, 4), (396, 200), (200, 396), (4, 200)], closed=True,
                      fill=False, edgecolor="#F97316", linewidth=1.4)
    ax.add_patch(diamond)

    for h, (cx, cy) in HOUSE_CENTERS.items():
        sign_idx = sign_for_house(h)
        sign_number = str(sign_idx + 1)
        ax.text(cx, cy - 24, sign_number, ha="center", va="center",
                fontsize=14, fontweight="bold", color="#C2410C")
        entries = house_planets[h]
        for i, (mark, highlight) in enumerate(entries):
            ax.text(cx, cy - 5 + i * 16, mark, ha="center", va="center",
                    fontsize=12.0 if len(mark) > 5 else 13.5, fontweight="bold",
                    color="#C2410C" if highlight else "#1C1917")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", facecolor="#FFFCF2")
    plt.close(fig)
    return buf.getvalue()


def chart_summary_rows(chart: dict) -> list[dict]:
    rows = []

    # Lagna as the foundational first row
    lagna = chart.get("lagna", {})
    lagna_nak = lagna.get("nakshatra", {})
    rows.append({
        "planet": "Lagna (Asc)",
        "sign": lagna.get("sign", ""),
        "sign_lord": lagna.get("lord", ""),
        "degree": lagna.get("degree", ""),
        "house": 1,
        "nakshatra": f"{lagna_nak.get('name', '')} ({lagna_nak.get('pada', '')})",
        "nak_lord": lagna_nak.get("lord", ""),
        "sublord": lagna.get("sublord") or lagna_nak.get("sublord") or "-",
        "flags": f"Lord {lagna.get('lord', '')}",
        "is_lagna": True,
    })

    # 9 Grahas
    for pname, p in chart.get("planets", {}).items():
        flags = []
        if p.get("dignity") and p["dignity"] != "Neutral":
            flags.append(p["dignity"])
        if p.get("retrograde"):
            flags.append("Retro (R)")
        if p.get("combust"):
            flags.append("Combust")
        nak = p.get("nakshatra", {})
        rows.append({
            "planet": pname,
            "sign": p.get("sign", ""),
            "sign_lord": p.get("sign_lord", ""),
            "degree": p.get("degree", ""),
            "house": p.get("house", ""),
            "nakshatra": f"{nak.get('name', '')} ({nak.get('pada', '')})",
            "nak_lord": nak.get("lord", ""),
            "sublord": p.get("sublord") or nak.get("sublord") or "-",
            "flags": ", ".join(flags) or "Direct",
            "is_lagna": False,
        })
    return rows
