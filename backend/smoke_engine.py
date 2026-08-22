import sys

sys.path.insert(0, ".")

from app.engine import compute_full_chart
from app.services.pdf import render_report_pdf

chart = compute_full_chart(1990, 5, 21, 14, 30, "Asia/Kolkata", 28.6139, 77.2090)
print("Lagna:", chart["lagna"]["sign"], chart["lagna"]["degree"])
print("Planets:", {p: v["sign"] for p, v in chart["planets"].items()})
print("Current dasha:", chart["dasha"]["current"]["mahadasha"]["lord"], "/",
      (chart["dasha"]["current"]["antardasha"] or {}).get("lord"))
print("Yogas:", [y["name"] for y in chart["yogas"]])

pdf = render_report_pdf(chart, "Test Native")
with open("test_report.pdf", "wb") as f:
    f.write(pdf)
print(f"PDF written: test_report.pdf ({len(pdf)} bytes)")
