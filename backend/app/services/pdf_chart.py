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


def render_north_indian_png(chart: dict, width_px: int = 1000) -> bytes:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Polygon

    lagna_index = chart["lagna"]["sign_index"]

    house_planets: dict[int, list[tuple[str, bool]]] = {h: [] for h in range(1, 13)}
    for pname, p in chart["planets"].items():
        delta = ((p["sign_index"] - lagna_index) % 12)
        house = delta + 1
        mark = _abbrev(pname)
        highlight = p["dignity"] == "Exalted" or p.get("retrograde")
        if p["dignity"] == "Exalted":
            mark += "*"
        if p.get("retrograde"):
            mark += "R"
        house_planets[house].append((mark, highlight))

    def sign_for_house(h: int) -> int:
        return ((lagna_index + h - 1) % 12)

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
        ax.text(cx, cy - 26, SIGN_ABBREV[sign_idx], ha="center", va="center",
                fontsize=13, fontweight="bold", color="#C2410C")
        entries = house_planets[h]
        for i, (mark, highlight) in enumerate(entries):
            ax.text(cx, cy - 6 + i * 17, mark, ha="center", va="center",
                    fontsize=12.5, fontweight="bold",
                    color="#B45309" if highlight else "#292524")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", facecolor="#FFFCF2")
    plt.close(fig)
    return buf.getvalue()


def chart_summary_rows(chart: dict) -> list[dict]:
    rows = []
    for pname, p in chart["planets"].items():
        flags = []
        if p["dignity"] != "Neutral":
            flags.append(p["dignity"])
        if p.get("retrograde"):
            flags.append("R")
        if p.get("combust"):
            flags.append("Combust")
        nak = p["nakshatra"]
        rows.append({
            "planet": pname,
            "sign": f"{p['sign']} {p['degree']}",
            "house": p["house"],
            "nakshatra": f"{nak['name']} ({nak['pada']})",
            "flags": ", ".join(flags) or "-",
        })
    return rows
