from __future__ import annotations

import base64
import io
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.services.pdf_chart import chart_summary_rows, render_north_indian_png

_env = Environment(
    loader=FileSystemLoader("app/templates"),
    autoescape=True,
)

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def render_report_html(chart: dict, profile_name: str, place_name: str | None = None) -> str:
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
        place_name=place_name,
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


def _print_pdf_via_edge(html: str, out_path: str) -> bool:
    for exe in EDGE_CANDIDATES:
        if not os.path.exists(exe):
            continue
        tmp_dir = tempfile.mkdtemp(prefix="vedic_report_")
        html_path = Path(tmp_dir) / "report.html"
        html_path.write_text(html, encoding="utf-8")
        try:
            subprocess.run(
                [
                    exe,
                    "--headless",
                    "--disable-gpu",
                    "--no-pdf-header-footer",
                    f"--print-to-pdf={out_path}",
                    html_path.as_uri(),
                ],
                timeout=30,
                capture_output=True,
            )
            if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
                return True
        except (subprocess.TimeoutExpired, OSError):
            continue
        finally:
            try:
                html_path.unlink(missing_ok=True)
                os.rmdir(tmp_dir)
            except OSError:
                pass
    return False


def render_report_pdf(chart: dict, profile_name: str, place_name: str | None = None) -> bytes:
    html = render_report_html(chart, profile_name, place_name=place_name)

    tmp_dir = tempfile.mkdtemp(prefix="vedic_pdf_")
    out_path = str(Path(tmp_dir) / "report.pdf")
    try:
        if _print_pdf_via_edge(html, out_path):
            with open(out_path, "rb") as f:
                return f.read()
    finally:
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
            os.rmdir(tmp_dir)
        except OSError:
            pass

    from xhtml2pdf import pisa

    buf = io.BytesIO()
    status = pisa.CreatePDF(html, dest=buf, encoding="utf-8")
    if status.err:
        raise RuntimeError(f"PDF generation failed with {status.err} errors")
    return buf.getvalue()
