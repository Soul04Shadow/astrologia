"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NorthIndianChart from "@/components/NorthIndianChart";
import { api, type Chart, type Profile } from "@/lib/api";

const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-saffron-700">{title}</h2>
      {children}
    </section>
  );
}

export default function ChartPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    Promise.all([api.getProfile(id), api.getChart(id)])
      .then(([p, c]) => {
        setProfile(p);
        setChart(c.chart);
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  function downloadSvg() {
    if (!svgRef.current) return;
    const source = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([source], { type: "image/svg+xml" });
    triggerDownload(URL.createObjectURL(blob), `kundli_${profile?.name}.svg`);
  }

  function downloadPng() {
    if (!svgRef.current) return;
    const source = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1600;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(URL.createObjectURL(blob), `kundli_${profile?.name}.png`);
      });
    };
    img.src = url;
  }

  function triggerDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  if (error)
    return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!chart || !profile) return <p className="text-muted">Calculating chart…</p>;

  const current = chart.dasha.current;
  const bd = chart.birth_details;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-sm text-muted">
            {bd.date} · {bd.time} ({bd.tz_name}) · {profile.place_name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`${api.base}/api/profiles/${id}/report.pdf`}
            className="rounded-lg bg-saffron-600 px-3 py-2 text-sm font-semibold text-white hover:bg-saffron-700"
          >
            ⬇ Full PDF Report
          </a>
          <button
            onClick={downloadSvg}
            className="rounded-lg border border-saffron-600 px-3 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
          >
            SVG
          </button>
          <button
            onClick={downloadPng}
            className="rounded-lg border border-saffron-600 px-3 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
          >
            PNG
          </button>
          <Link
            href={`/chat/${id}`}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-muted hover:bg-stone-50"
          >
            Consult AI →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card title="Birth Chart (D1)">
          <NorthIndianChart ref={svgRef} chart={chart} title={`${profile.name}`} />
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card title="Overview">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Lagna" value={`${chart.lagna.sign} ${chart.lagna.degree}`} sub={`Lord ${chart.lagna.lord}`} />
              <Stat
                label="Moon Rashi"
                value={chart.moon_rashi.sign}
                sub={`${chart.moon_rashi.nakshatra} pada ${chart.moon_rashi.pada}`}
              />
              <Stat
                label="Current Dasha"
                value={
                  current.mahadasha ? `${current.mahadasha.lord} MD` : "—"
                }
                sub={current.antardasha ? `${current.antardasha.lord} AD` : ""}
              />
            </div>
          </Card>

          <Card title="Planetary Positions">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-saffron-600 text-xs uppercase tracking-wide">
                    <th className="py-2 pr-3">Planet</th>
                    <th className="py-2 pr-3">Sign</th>
                    <th className="py-2 pr-3">Degree</th>
                    <th className="py-2 pr-3">Hs</th>
                    <th className="py-2 pr-3">Nakshatra</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {PLANET_ORDER.map((pname) => {
                    const p = chart.planets[pname];
                    const notes = [
                      p.dignity !== "Neutral" ? p.dignity : "",
                      p.retrograde ? "Retrograde" : "",
                      p.combust ? "Combust" : "",
                    ].filter(Boolean);
                    return (
                      <tr key={pname} className="border-b border-stone-100">
                        <td className="py-2 pr-3 font-semibold">{pname}</td>
                        <td className="py-2 pr-3">{p.sign}</td>
                        <td className="py-2 pr-3 tabular-nums">{p.degree}</td>
                        <td className="py-2 pr-3">{p.house}</td>
                        <td className="py-2 pr-3">
                          {p.nakshatra.name} ({p.nakshatra.pada})
                        </td>
                        <td className="py-2 text-xs font-semibold text-saffron-700">
                          {notes.join(" · ") || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Dasha Timeline">
          {current.mahadasha && (
            <p className="mb-3 rounded-lg bg-saffron-50 p-3 text-sm font-semibold text-saffron-800">
              Now: {current.mahadasha.lord} Mahadasha · {current.antardasha?.lord ?? "—"} Antardasha
              {current.next_antardasha && ` · next: ${current.next_antardasha.lord} on ${current.next_antardasha.start_date}`}
            </p>
          )}
          <div className="max-h-72 space-y-1.5 overflow-y-auto text-sm">
            {chart.dasha.mahadashas.map((m) => (
              <details key={m.lord + m.start_date} className="group">
                <summary className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-saffron-50">
                  <span className="font-semibold">{m.lord}</span>
                  <span className="tabular-nums text-xs text-muted">
                    {m.start_date} → {m.end_date}
                  </span>
                </summary>
                <ul className="ml-4 mt-1 space-y-1 border-l-2 border-saffron-100 pl-3 text-xs text-muted">
                  {m.antardashas.map((a) => (
                    <li key={a.lord + a.start_date} className="flex justify-between">
                      <span>{m.lord}-{a.lord}</span>
                      <span className="tabular-nums">
                        {a.start_date} → {a.end_date}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          {chart.yogas.length > 0 && (
            <Card title={`Yogas (${chart.yogas.length})`}>
              <ul className="space-y-2 text-sm">
                {chart.yogas.map((y) => (
                  <li key={y.name}>
                    <span className="font-semibold text-saffron-700">{y.name}</span>
                    <span className="block text-xs text-muted">{y.basis}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {chart.panchang_today && !("error" in chart.panchang_today) && (
            <Card title="Panchang (birth-day snapshot, today's sky)">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Tithi</dt>
                <dd className="font-semibold">
                  {chart.panchang_today.tithi.paksha} {chart.panchang_today.tithi.name}
                </dd>
                <dt className="text-muted">Nakshatra</dt>
                <dd className="font-semibold">
                  {chart.panchang_today.nakshatra.name} ({chart.panchang_today.nakshatra.lord})
                </dd>
                <dt className="text-muted">Yoga / Karana</dt>
                <dd className="font-semibold">
                  {chart.panchang_today.yoga.name} / {chart.panchang_today.karana.name}
                </dd>
                <dt className="text-muted">Var</dt>
                <dd className="font-semibold">
                  {chart.panchang_today.weekday} ({chart.panchang_today.var_lord})
                </dd>
              </dl>
            </Card>
          )}

          <Card title="Navamsa (D9)">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {Object.entries(chart.navamsa_d9).map(([p, v]) => (
                <span
                  key={p}
                  className={`rounded-md border px-2 py-1 ${
                    v.vargottama
                      ? "border-saffron-600 bg-saffron-100 font-bold text-saffron-800"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  {p}: {v.sign}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {chart.transits_now && (
        <Card title={`Current Transits — ${chart.transits_now.computed_at.slice(0, 16).replace("T", " ")} UTC`}>
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.entries(chart.transits_now.positions).map(([p, v]) => (
              <span key={p} className="rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1">
                <b>{p}</b> {v.sign}
                {v.retrograde && <span className="ml-1 text-xs font-bold text-saffron-700">R</span>}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-saffron-100 bg-saffron-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-bold text-saffron-800">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
