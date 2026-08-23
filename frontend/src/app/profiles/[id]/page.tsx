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
  ScrollText,
  Sun,
} from "lucide-react";
import VargaChart, { type PlacementMark } from "@/components/VargaChart";
import { api, type Chart, type Profile } from "@/lib/api";

const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

const ABBREV: Record<string, string> = { Rahu: "Ra", Ketu: "Ke" };

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-goldline bg-panel p-4 shadow-sm ${className}`}>
      {title && (
        <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-saffron-700">{title}</h2>
      )}
      {children}
    </section>
  );
}

const TABS = [
  { id: "d1", label: "D1 Rasi", icon: Sun },
  { id: "d9", label: "D9 Navamsa", icon: LayoutGrid },
  { id: "dasha", label: "Dashas", icon: Clock3 },
  { id: "panchang", label: "Panchang & Gochar", icon: CloudSun },
  { id: "yogas", label: "Yogas", icon: ScrollText },
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
      label: name === "Lagna" ? "Asc" : name + (v.vargottama ? "*" : ""),
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
      ctx.fillStyle = "#fffcf2";
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
  if (!chart || !profile) return <p className="text-sm text-stone-500">Calculating chart…</p>;

  const current = chart.dasha.current;
  const bd = chart.birth_details;
  const shortPlace =
    profile.place_name.split(",").slice(0, 3).join(",").trim() || profile.place_name;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="text-xl font-bold">{profile.name}</h1>
            <span className="text-sm font-semibold text-saffron-800">
              {bd.date} · {bd.time}
            </span>
            <span className="truncate text-xs text-stone-600 sm:max-w-md" title={profile.place_name}>
              {shortPlace} ({bd.tz_name})
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`${api.base}/api/profiles/${id}/report.pdf`}
            className="flex items-center gap-1.5 rounded-lg bg-saffron-600 px-3 py-2 text-xs font-bold text-white hover:bg-saffron-700"
          >
            <FileText size={14} /> PDF Report
          </a>
          <Link
            href={`/chat/${id}`}
            className="flex items-center gap-1.5 rounded-lg border border-goldline bg-panel px-3 py-2 text-xs font-bold text-saffron-800 hover:bg-saffron-100"
          >
            Consult AI <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
          label="Birth Nakshatra"
          value={chart.moon_rashi.nakshatra}
          sub={`lord ${chart.moon_rashi.nakshatra_lord}`}
        />
      </div>

      <div className="flex gap-0.5 overflow-x-auto rounded-t-xl border-b-2 border-goldline bg-sidebarbg/60 px-1 pt-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-bold transition sm:text-[13px] ${
              tab === t.id
                ? "bg-panel text-saffron-800 shadow-[0_2px_0_0_var(--color-panel)]"
                : "text-stone-600 hover:bg-saffron-100/60 hover:text-saffron-800"
            }`}
          >
            <t.icon size={14} strokeWidth={2.2} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "d1" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-600">
                * exalted · R retrograde
              </span>
              <span className="flex gap-1.5">
                <button
                  onClick={() => downloadSvg(d1Ref, "D1")}
                  className="flex items-center gap-1 rounded-md border border-goldline px-2 py-1 text-[11px] font-bold text-saffron-800 hover:bg-saffron-100"
                >
                  <ImageIcon size={12} /> SVG
                </button>
                <button
                  onClick={() => downloadPng(d1Ref, "D1")}
                  className="flex items-center gap-1 rounded-md border border-goldline px-2 py-1 text-[11px] font-bold text-saffron-800 hover:bg-saffron-100"
                >
                  <Download size={12} /> PNG
                </button>
              </span>
            </div>
            <div className="mx-auto max-w-[430px]">
              <VargaChart ref={d1Ref} lagnaSignIndex={chart.lagna.sign_index} placements={d1Placements} />
            </div>
          </Card>

          <Card title="Planetary Positions" className="lg:col-span-7">
            <PlanetTable chart={chart} />
          </Card>
        </div>
      )}

      {tab === "d9" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-600">
                Asc = D9 lagna · * vargottama
              </span>
              <span className="flex gap-1.5">
                <button
                  onClick={() => downloadSvg(d9Ref, "D9")}
                  className="flex items-center gap-1 rounded-md border border-goldline px-2 py-1 text-[11px] font-bold text-saffron-800 hover:bg-saffron-100"
                >
                  <ImageIcon size={12} /> SVG
                </button>
                <button
                  onClick={() => downloadPng(d9Ref, "D9")}
                  className="flex items-center gap-1 rounded-md border border-goldline px-2 py-1 text-[11px] font-bold text-saffron-800 hover:bg-saffron-100"
                >
                  <Download size={12} /> PNG
                </button>
              </span>
            </div>
            <div className="mx-auto max-w-[430px]">
              <VargaChart
                ref={d9Ref}
                lagnaSignIndex={chart.navamsa_d9["Lagna"]?.sign_index ?? 0}
                placements={d9Placements}
              />
            </div>
          </Card>

          <Card title="Navamsa Placements" className="lg:col-span-7">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-saffron-600 text-[11px] uppercase tracking-wide text-stone-600">
                  <th className="py-1.5 pr-3">Body</th>
                  <th className="py-1.5 pr-3">D9 Sign</th>
                  <th className="py-1.5">Vargottama</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(chart.navamsa_d9).map(([name, v]) => (
                  <tr key={name} className="border-b border-saffron-100/70">
                    <td className="py-1.5 pr-3 font-semibold">{name}</td>
                    <td className="py-1.5 pr-3">{v.sign}</td>
                    <td className="py-1.5 text-xs font-bold text-saffron-700">
                      {v.vargottama ? "Yes" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === "dasha" && (
        <Card title="Vimshottari Dasha Timeline">
          {current.mahadasha && (
            <p className="mb-3 rounded-lg border border-goldline bg-saffron-50 p-2.5 text-[13px] font-semibold text-saffron-800">
              Now running: {current.mahadasha.lord} Mahadasha ({current.mahadasha.start_date} to{" "}
              {current.mahadasha.end_date}) · {current.antardasha?.lord ?? "—"} Antardasha
              {current.next_antardasha &&
                ` · next ${current.next_antardasha.lord} begins ${current.next_antardasha.start_date}`}
            </p>
          )}
          <div className="space-y-1.5">
            {chart.dasha.mahadashas.map((m) => {
              const isActive =
                current.mahadasha?.lord === m.lord && current.mahadasha?.start_date === m.start_date;
              return (
                <details
                  key={m.lord + m.start_date}
                  open={isActive}
                  className="rounded-lg border border-goldline/70 px-3 py-2 open:border-gold open:bg-saffron-50/50"
                >
                  <summary className="flex cursor-pointer items-center justify-between">
                    <span className={`text-sm ${isActive ? "font-bold text-saffron-800" : "font-semibold"}`}>
                      {m.lord} Mahadasha{isActive && " — ACTIVE"}
                    </span>
                    <span className="text-xs tabular-nums text-stone-600">
                      {m.start_date} → {m.end_date}
                    </span>
                  </summary>
                  <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 pl-2 text-xs text-stone-600 sm:grid-cols-2 lg:grid-cols-3">
                    {m.antardashas.map((a) => {
                      const activeAntar =
                        isActive &&
                        current.antardasha?.lord === a.lord &&
                        current.antardasha?.start_date === a.start_date;
                      return (
                        <li
                          key={a.lord + a.start_date}
                          className={`flex justify-between gap-2 ${activeAntar ? "font-bold text-saffron-800" : ""}`}
                        >
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
        <div className="space-y-4">
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
                        <tr className="border-b-2 border-saffron-600 text-[11px] uppercase tracking-wide text-stone-600">
                          <th className="py-1.5 pr-3">Planet</th>
                          <th className="py-1.5 pr-3">Sign</th>
                          <th className="py-1.5 pr-3">Degree</th>
                          <th className="py-1.5 pr-3">Nakshatra</th>
                          <th className="py-1.5">State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(chart.transits_now.positions).map(([p, v]) => (
                          <tr key={p} className="border-b border-saffron-100/70">
                            <td className="py-1.5 pr-3 font-semibold">{p}</td>
                            <td className="py-1.5 pr-3">{v.sign}</td>
                            <td className="py-1.5 pr-3 tabular-nums">{v.degree}</td>
                            <td className="py-1.5 pr-3">{v.nakshatra}</td>
                            <td className="py-1.5 text-xs font-semibold text-saffron-700">
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
                <p className="text-sm text-stone-600">No yogas from the tracked set are present in this chart.</p>
              ) : (
                <ul className="space-y-2.5">
                  {chart.yogas.map((y) => (
                    <li key={y.name} className="border-l-4 border-gold bg-saffron-50/70 p-2.5">
                      <p className="text-sm font-bold text-saffron-800">{y.name}</p>
                      <p className="text-xs text-stone-600">{y.basis}</p>
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
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b-2 border-saffron-600 text-[11px] uppercase tracking-wide text-stone-600">
            <th className="py-1.5 pr-3">Planet</th>
            <th className="py-1.5 pr-3">Sign</th>
            <th className="py-1.5 pr-3">Degree</th>
            <th className="py-1.5 pr-3">Hs</th>
            <th className="py-1.5 pr-3">Nakshatra</th>
            <th className="py-1.5">Notes</th>
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
              <tr key={pname} className="border-b border-saffron-100/70">
                <td className="py-1.5 pr-3 font-semibold">{pname}</td>
                <td className="py-1.5 pr-3">{p.sign}</td>
                <td className="py-1.5 pr-3 tabular-nums">{p.degree}</td>
                <td className="py-1.5 pr-3">{p.house}</td>
                <td className="py-1.5 pr-3">
                  {p.nakshatra.name} ({p.nakshatra.pada})
                </td>
                <td className="py-1.5 text-xs font-semibold text-saffron-700">{notes.join(" · ") || "—"}</td>
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
    <div className="rounded-xl border border-goldline bg-panel p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-saffron-700">{label}</p>
      <p className="mt-0.5 text-base font-extrabold leading-tight text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs font-medium text-stone-600">{sub}</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-saffron-700">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  );
}
