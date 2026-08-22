from __future__ import annotations

import base64
import io
from datetime import datetime, timezone

from jinja2 import Environment, FileSystemLoader

from app.services.pdf_chart import chart_summary_rows, render_north_indian_png

_env = Environment(
    loader=FileSystemLoader("app/templates"),
    autoescape=True,
)


def render_report_html(chart: dict, profile_name: str) -> str:
    png = render_north_indian_png(chart)
    png_b64 = base64.b64encode(png).decode()
    rows = chart_summary_rows(chart)
    dasha = chart.get("dasha", {})
    current = dasha.get("current", {}) or {}
    template = _env.get_template("report.html")
    return template.render(
        name=profile_name,
        generated=datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC"),
        birth=chart["birth_details"],
        lagna=chart["lagna"],
        moon=chart["moon_rashi"],
        chart_png=f"data:image/png;base64,{png_b64}",
        rows=rows,
        current_maha=(current.get("mahadasha") or {}),
        current_antar=(current.get("antardasha") or {}),
        mahadashas=dasha.get("mahadashas", [])[:12],
        yogas=chart.get("yogas", []),
        panchang=chart.get("panchang_today"),
        d9=chart.get("navamsa_d9", {}),
    )


def render_report_pdf(chart: dict, profile_name: str) -> bytes:
    from xhtml2pdf import pisa

    html = render_report_html(chart, profile_name)
    buf = io.BytesIO()
    status = pisa.CreatePDF(html, dest=buf, encoding="utf-8")
    if status.err:
        raise RuntimeError(f"PDF generation failed with {status.err} errors")
    return buf.getvalue()
