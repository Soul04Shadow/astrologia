from __future__ import annotations

import base64
import io
import os
import shutil
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

BROWSER_CANDIDATES = [
    # Linux system paths
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
    "/snap/bin/chromium",
    # Windows system paths
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]


def _find_headless_browser() -> str | None:
    for cmd in ["google-chrome", "chromium", "chromium-browser", "microsoft-edge", "msedge"]:
        path = shutil.which(cmd)
        if path and os.path.exists(path):
            return path
    for exe in BROWSER_CANDIDATES:
        if os.path.exists(exe):
            return exe
    return None


def _clean_place_name(place: str | None) -> str:
    if not place:
        return "Location Not Specified"
    parts = [p.strip() for p in place.split(",") if p.strip()]
    if len(parts) <= 3:
        return place
    filtered = [p for p in parts if not p.isdigit() and len(p) > 1]
    if len(filtered) >= 4:
        return f"{filtered[0]}, {filtered[-2]}, {filtered[-1]}"
    return ", ".join(filtered)


def render_report_html(
    chart: dict,
    profile_name: str,
    place_name: str | None = None,
    is_preview: bool = False,
) -> str:
    d1_png = render_north_indian_png(chart, varga="D1", width_px=800)
    d1_b64 = base64.b64encode(d1_png).decode()

    d9_png = render_north_indian_png(chart, varga="D9", width_px=800)
    d9_b64 = base64.b64encode(d9_png).decode()

    rows = chart_summary_rows(chart)
    dasha = chart.get("dasha", {})
    current = dasha.get("current", {}) or {}
    template = _env.get_template("report.html")

    # Format Julian Day and Coordinates
    birth = chart.get("birth_details", {})
    lat = birth.get("latitude", 0.0)
    lon = birth.get("longitude", 0.0)
    lat_str = f"{abs(lat):.2f}° {'N' if lat >= 0 else 'S'}"
    lon_str = f"{abs(lon):.2f}° {'E' if lon >= 0 else 'W'}"
    clean_place = _clean_place_name(place_name)

    return template.render(
        name=profile_name,
        generated=datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC"),
        birth=birth,
        lat_str=lat_str,
        lon_str=lon_str,
        place_name=clean_place,
        is_preview=is_preview,
        lagna=chart.get("lagna", {}),
        moon=chart.get("moon_rashi", {}),
        d1_png=f"data:image/png;base64,{d1_b64}",
        d9_png=f"data:image/png;base64,{d9_b64}",
        chart_png=f"data:image/png;base64,{d1_b64}",
        rows=rows,
        current_maha=(current.get("mahadasha") or {}),
        current_antar=(current.get("antardasha") or {}),
        mahadashas=dasha.get("mahadashas", []),
        yogas=chart.get("yogas", []),
        panchang=chart.get("panchang_today"),
        ashtakavarga=chart.get("ashtakavarga"),
        shadbala=chart.get("shadbala", {}),
        d9=chart.get("navamsa_d9", {}),
    )


def _print_pdf_via_browser(html: str, out_path: str) -> bool:
    exe = _find_headless_browser()
    if not exe:
        return False
    tmp_dir = tempfile.mkdtemp(prefix="vedic_report_")
    html_path = Path(tmp_dir) / "report.html"
    html_path.write_text(html, encoding="utf-8")
    try:
        subprocess.run(
            [
                exe,
                "--headless",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--no-pdf-header-footer",
                "--no-sandbox",
                f"--print-to-pdf={out_path}",
                html_path.as_uri(),
            ],
            timeout=35,
            capture_output=True,
        )
        if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
            return True
    except (subprocess.TimeoutExpired, OSError):
        pass
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
        if _print_pdf_via_browser(html, out_path):
            with open(out_path, "rb") as f:
                return f.read()
    finally:
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
            os.rmdir(tmp_dir)
        except OSError:
            pass

    import re
    from xhtml2pdf import pisa

    # Extra defensive cleanup: strip any nested @bottom-right or similar at-rules xhtml2pdf parser fails on
    clean_html = re.sub(r"@[a-z\-]+\s*\{[^}]*\}", "", html)
    buf = io.BytesIO()
    status = pisa.CreatePDF(clean_html, dest=buf, encoding="utf-8")
    if status.err:
        raise RuntimeError(f"PDF generation failed with {status.err} errors")
    return buf.getvalue()
