from __future__ import annotations

import io


def _abbrev(name: str) -> str:
    return {"Rahu": "Ra", "Ketu": "Ke"}.get(name, name[:2])


def render_north_indian_png(chart: dict, width_px: int = 900) -> bytes:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Polygon

    lagna_num = chart["lagna"]["sign_index"] + 1
    house_planets = {h: [] for h in range(1, 13)}
    for pname, p in chart["planets"].items():
        mark = _abbrev(pname) + ("*" if p["dignity"] == "Exalted" else ("(R)" if p.get("retrograde") else ""))
        house_planets[p["house"]].append(mark)

    fig, ax = plt.subplots(figsize=(width_px / 100, width_px / 100), dpi=100)
    ax.set_xlim(0, 4)
    ax.set_ylim(0, 4)
    ax.axis("off")

    square = [(0, 0), (4, 0), (4, 4), (0, 4)]
    ax.add_patch(Polygon(square, fill=False, edgecolor="#EA580C", linewidth=2.5))
    ax.plot([0, 4], [0, 4], color="#F97316", linewidth=1.2)
    ax.plot([0, 4], [4, 0], color="#F97316", linewidth=1.2)
    ax.plot([2, 0], [2, 4], color="#F97316", linewidth=1.2)
    ax.plot([2, 4], [2, 4], color="#F97316", linewidth=1.2)
    ax.plot([2, 0], [2, 0], color="#F97316", linewidth=1.2)
    ax.plot([2, 4], [2, 0], color="#F97316", linewidth=1.2)

    sign_for_house = {h: ((lagna_num + h - 2) % 12) + 1 for h in range(1, 13)}

    centers = {
        1: (2, 3.55), 2: (1.15, 3.62), 3: (0.38, 3.05), 4: (0.45, 2.0),
        5: (0.38, 0.95), 6: (1.15, 0.38), 7: (2, 0.45), 8: (2.85, 0.38),
        9: (3.62, 0.95), 10: (3.55, 2.0), 11: (3.62, 3.05), 12: (2.85, 3.62),
    }

    for h, (cx, cy) in centers.items():
        ax.text(cx, cy + 0.28, str(sign_for_house[h]), ha="center", va="center",
                fontsize=11, color="#9A3412", fontweight="bold")
        planets = house_planets[h]
        for i, pl in enumerate(planets):
            offset = (i - (len(planets) - 1) / 2) * 0.22
            ax.text(cx + offset, cy - 0.06, pl, ha="center", va="center",
                    fontsize=10.5, color="#1F2937" if "*" not in pl and "(R)" not in pl else "#B45309",
                    fontweight="bold")

    ax.text(2, 4.18, f"Lagna: {chart['lagna']['sign']} {chart['lagna']['degree']}",
            ha="center", fontsize=11, color="#C2410C")
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", facecolor="white")
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
