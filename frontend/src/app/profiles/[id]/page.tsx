"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Clock3,
  CloudSun,
  Download,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Sparkles,
  Sun,
} from "lucide-react";
import VargaChart, { type PlacementMark } from "@/components/VargaChart";
import { api, type Chart, type Profile } from "@/lib/api";

const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      {title && (
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-saffron-700">{title}</h2>
      )}
      {children}
    </section>
  );
}

const TABS = [
  { id: "d1", label: "Birth Chart (D1)", icon: Sun },
  { id: "d9", label: "Navamsa (D9)", icon: LayoutGrid },
  { id: "dasha", label: "Dashas", icon: Clock3 },
  { id: "panchang", label: "Panchang & Transits", icon: CloudSun },
  { id: "yogas", label: "Yogas", icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ChartPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("d1");
  const d1Ref = useRef<SVGSVGElement | null>(null);
  const d9Ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    Promise.all([api.getProfile(id), api.getChart(id)])
      .then(([p, c]) => {
        setProfile(p);
        setChart(c.chart);
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  const d1Placements: PlacementMark[] = useMemo(() => {
    if (!chart) return [];
    const ABBREV: Record<string, string> = { Rahu: "Ra", Ketu: "Ke" };
    return PLANET_ORDER.map((pname) => {
      const p = chart.planets[pname];
      return {
        label:
          (ABBREV[pname] ?? pname.slice(0, 2)) +
          (p.dignity === "Exalted" ? "*" : "") +
          (p.retrograde ? "R" : ""),
        signIndex: p.sign_index,
        highlight: p.dignity === "Exalted" || p.retrograde,
      };
    });
  }, [chart]);

  const d9Placements: PlacementMark[] = useMemo(() => {
    if (!chart?.navamsa_d9) return [];
    return Object.entries(chart.navamsa_d9).map(([name, v]) => ({
      label:
        name === "Lagna"
          ? "Asc"
          : name +
            (v.vargottama && name !== "Lagna" ? "*" : ""),
      signIndex: v.sign_index,
      highlight: v.vargottama,
    }));
  }, [chart]);

  function downloadSvg(ref: React.RefObject<SVGSVGElement | null>, suffix: string) {
    if (!ref.current) return;
    const source = new XMLSerializer().serializeToString(ref.current);
    const blob = new Blob([source], { type: "image/svg+xml" });
    triggerDownload(URL.createObjectURL(blob), `kundli_${profile?.name}_${suffix}.svg`);
  }

  function downloadPng(ref: React.RefObject<SVGSVGElement | null>, suffix: string) {
    if (!ref.current) return;
    const source = new XMLSerializer().serializeToString(ref.current);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1600;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fffdf6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(URL.createObjectURL(blob), `kundli_${profile?.name}_${suffix}.png`);
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
    <div className="space-y-5">
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
            className="flex items-center gap-1.5 rounded-lg bg-saffron-600 px-3 py-2 text-sm font-semibold text-white hover:bg-saffron-700"
          >
            <FileText size={15} /> Full PDF Report
          </a>
          <Link
            href={`/chat/${id}`}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-muted hover:bg-stone-50"
          >
            Consult AI <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Lagna" value={chart.lagna.sign} sub={`${chart.lagna.degree} · lord ${chart.lagna.lord}`} />
        <Stat
          label="Moon Rashi"
          value={chart.moon_rashi.sign}
          sub={`${chart.moon_rashi.nakshatra} pada ${chart.moon_rashi.pada}`}
        />
        <Stat
          label="Current Dasha"
          value={current.mahadasha ? `${current.mahadasha.lord}` : "—"}
          sub={current.antardasha ? `${current.antardasha.lord} antardasha` : ""}
        />
        <Stat
          label="Julian Day (UT)"
          value={bd.julian_day.toFixed(3)}
          sub={`${bd.latitude.toFixed(2)}°, ${bd.longitude.toFixed(2)}°`}
        />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? "border-saffron-600 bg-white text-saffron-800"
                : "border-transparent text-muted hover:text-saffron-700"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "d1" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-saffron-700">
                Lagna {chart.lagna.sign} {chart.lagna.degree} · * exalted · R retrograde
              </span>
              <span className="flex gap-1.5">
                <button
                  onClick={() => downloadSvg(d1Ref, "D1")}
                  className="flex items-center gap-1 rounded-lg border border-saffron-600 px-2.5 py-1.5 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
                >
                  <ImageIcon size={13} /> SVG
                </button>
                <button
                  onClick={() => downloadPng(d1Ref, "D1")}
                  className="flex items-center gap-1 rounded-lg border border-saffron-600 px-2.5 py-1.5 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
                >
                  <Download size={13} /> PNG
                </button>
              </span>
            </div>
            <div className="mx-auto max-w-[640px]">
              <VargaChart ref={d1Ref} lagnaSignIndex={chart.lagna.sign_index} placements={d1Placements} />
            </div>
          </Card>

          <Card title="Planetary Positions (D1)">
            <PlanetTable chart={chart} />
          </Card>
        </div>
      )}

      {tab === "d9" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-saffron-700">
                Asc = lagna in D9 · * vargottama (same sign in D1 and D9)
              </span>
              <span className="flex gap-1.5">
                <button
                  onClick={() => downloadSvg(d9Ref, "D9")}
                  className="flex items-center gap-1 rounded-lg border border-saffron-600 px-2.5 py-1.5 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
                >
                  <ImageIcon size={13} /> SVG
                </button>
                <button
                  onClick={() => downloadPng(d9Ref, "D9")}
                  className="flex items-center gap-1 rounded-lg border border-saffron-600 px-2.5 py-1.5 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
                >
                  <Download size={13} /> PNG
                </button>
              </span>
            </div>
            <div className="mx-auto max-w-[640px]">
              <VargaChart
                ref={d9Ref}
                lagnaSignIndex={chart.navamsa_d9["Lagna"]?.sign_index ?? 0}
                placements={d9Placements}
              />
            </div>
          </Card>

          <Card title="Navamsa Placements">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-saffron-600 text-xs uppercase tracking-wide">
                    <th className="py-2 pr-3">Body</th>
                    <th className="py-2 pr-3">D9 Sign</th>
                    <th className="py-2">Vargottama</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(chart.navamsa_d9).map(([name, v]) => (
                    <tr key={name} className="border-b border-stone-100">
                      <td className="py-2 pr-3 font-semibold">{name}</td>
                      <td className="py-2 pr-3">{v.sign}</td>
                      <td className="py-2 text-xs font-bold text-saffron-700">
                        {name !== "Lagna" && v.vargottama ? "Yes" : name === "Lagna" && v.vargottama ? "Yes" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "dasha" && (
        <Card title="Vimshottari Dasha Timeline">
          {current.mahadasha && (
            <p className="mb-4 rounded-lg bg-saffron-50 p-3 text-sm font-semibold text-saffron-800">
              Now running: {current.mahadasha.lord} Mahadasha ({current.mahadasha.start_date} to{" "}
              {current.mahadasha.end_date}) · {current.antardasha?.lord ?? "—"} Antardasha
              {current.next_antardasha &&
                ` · next ${current.next_antardasha.lord} begins ${current.next_antardasha.start_date}`}
            </p>
          )}
          <div className="space-y-1.5">
            {chart.dasha.mahadashas.map((m) => {
              const isActive = current.mahadasha?.lord === m.lord && current.mahadasha?.start_date === m.start_date;
              return (
                <details
                  key={m.lord + m.start_date}
                  open={isActive}
                  className="rounded-lg border border-stone-100 px-3 py-2 open:border-saffron-200 open:bg-saffron-50/40"
                >
                  <summary className="flex cursor-pointer items-center justify-between">
                    <span className={`text-sm ${isActive ? "font-bold text-saffron-800" : "font-semibold"}`}>
                      {m.lord} Mahadasha{isActive && " — ACTIVE"}
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      {m.start_date} → {m.end_date}
                    </span>
                  </summary>
                  <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 pl-2 text-xs text-muted sm:grid-cols-2 lg:grid-cols-3">
                    {m.antardashas.map((a) => {
                      const activeAntar =
                        isActive && current.antardasha?.lord === a.lord && current.antardasha?.start_date === a.start_date;
                      return (
                        <li key={a.lord + a.start_date} className={`flex justify-between gap-2 ${activeAntar ? "font-bold text-saffron-800" : ""}`}>
                          <span>
                            {m.lord}-{a.lord}
                            {activeAntar && " ←"}
                          </span>
                          <span className="tabular-nums">
                            {a.start_date} → {a.end_date}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}
          </div>
        </Card>
      )}

      {(tab === "panchang" || tab === "yogas") && (
        <div className="space-y-6">
          {tab === "panchang" && (
            <>
              {chart.panchang_today && !("error" in chart.panchang_today) && (
                <Card title={`Panchang — ${chart.panchang_today.date} (${chart.panchang_today.tz_name})`}>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                    <Field label="Tithi" value={`${chart.panchang_today.tithi.paksha} ${chart.panchang_today.tithi.name}`} />
                    <Field label="Nakshatra" value={`${chart.panchang_today.nakshatra.name} (${chart.panchang_today.nakshatra.lord})`} />
                    <Field label="Yoga" value={chart.panchang_today.yoga.name} />
                    <Field label="Karana" value={chart.panchang_today.karana.name} />
                    <Field label="Var" value={`${chart.panchang_today.weekday} (${chart.panchang_today.var_lord})`} />
                    <Field label="Sun / Moon in" value={`${chart.panchang_today.sun_sign} / ${chart.panchang_today.moon_sign}`} />
                  </dl>
                </Card>
              )}
              {chart.transits_now && (
                <Card title={`Current Transits — ${chart.transits_now.computed_at.slice(0, 16).replace("T", " ")} UTC`}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b-2 border-saffron-600 text-xs uppercase tracking-wide">
                          <th className="py-2 pr-3">Planet</th>
                          <th className="py-2 pr-3">Sign</th>
                          <th className="py-2 pr-3">Degree</th>
                          <th className="py-2 pr-3">Nakshatra</th>
                          <th className="py-2">State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(chart.transits_now.positions).map(([p, v]) => (
                          <tr key={p} className="border-b border-stone-100">
                            <td className="py-2 pr-3 font-semibold">{p}</td>
                            <td className="py-2 pr-3">{v.sign}</td>
                            <td className="py-2 pr-3 tabular-nums">{v.degree}</td>
                            <td className="py-2 pr-3">{v.nakshatra}</td>
                            <td className="py-2 text-xs font-semibold text-saffron-700">
                              {[v.retrograde ? "Retrograde" : "", v.dignity !== "Neutral" ? v.dignity : ""]
                                .filter(Boolean)
                                .join(" · ") || "Direct"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}

          {tab === "yogas" && (
            <Card title={`Yogas Detected (${chart.yogas.length})`}>
              {chart.yogas.length === 0 ? (
                <p className="text-sm text-muted">No yogas from the tracked set are present in this chart.</p>
              ) : (
                <ul className="space-y-3">
                  {chart.yogas.map((y) => (
                    <li key={y.name} className="border-l-4 border-saffron-500 bg-saffron-50/60 p-3">
                      <p className="font-bold text-saffron-800">{y.name}</p>
                      <p className="text-xs text-muted">{y.basis}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function PlanetTable({ chart }: { chart: Chart }) {
  return (
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
                <td className="py-2 text-xs font-semibold text-saffron-700">{notes.join(" · ") || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-saffron-100 bg-white p-3.5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-bold text-saffron-800">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-semibold text-saffron-800">{value}</dd>
    </div>
  );
}
