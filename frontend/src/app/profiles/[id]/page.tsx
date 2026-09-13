"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  CloudSun,
  Compass,
  Download,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Pencil,
  Scale,
  ScrollText,
  Sparkles,
  Sun,
} from "lucide-react";
import VargaChart, { type PlacementMark } from "@/components/VargaChart";
import { api, type Chart, type Profile } from "@/lib/api";
import { getSupabase } from "@/lib/auth";
import { localizedSignNames, SIGN_CODES_EN } from "@/lib/dictionaries";
import { useI18n } from "@/lib/i18n";

const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

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
  { id: "vargas", label: "Divisional Charts", icon: LayoutGrid },
  { id: "ashtakavarga", label: "Ashtakavarga", icon: Sparkles },
  { id: "shadbala", label: "Shadbala", icon: Scale },
  { id: "transits", label: "Transits & Sade Sati", icon: Compass },
  { id: "dasha", label: "Dasha", icon: Clock3 },
  { id: "panchang", label: "Panchang", icon: CloudSun },
  { id: "yogas", label: "Yogas", icon: ScrollText },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ChartPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t, terms, locale } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const houseWord = locale === "hi" ? "भाव" : "House";
  const signLabels = useMemo(
    () =>
      localizedSignNames(locale).map((full, i) => ({
        code: locale === "hi" ? full : SIGN_CODES_EN[i],
        name: full,
      })),
    [locale],
  );
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("d1");
  const [selectedVarga, setSelectedVarga] = useState<string>("D9");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const chartRef = useRef<SVGSVGElement | null>(null);

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const supabase = getSupabase();
      let token = "";
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || "";
      }
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const url = token
        ? `${api.base}/api/profiles/${id}/report.pdf?token=${encodeURIComponent(token)}`
        : `${api.base}/api/profiles/${id}/report.pdf`;

      const res = await fetch(url, { credentials: "omit", headers });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const safeName = (profile?.name || "kundli").replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, "_");
      a.download = `Kundli_${safeName}_${chart?.birth_details?.date || "report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err?.message || "Failed to download PDF report");
    } finally {
      setDownloadingPdf(false);
    }
  }

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
    const lagnaMark: PlacementMark = {
      label: `${terms.ascLabel()} ${chart.lagna.degree}`,
      signIndex: chart.lagna.sign_index,
      house: 1,
      highlight: true,
      tip: `${terms.ascLabel()} (${terms.sign(chart.lagna.sign)} ${chart.lagna.degree})`,
    };
    const planetMarks: PlacementMark[] = PLANET_ORDER.map((pname) => {
      const p = chart.planets[pname];
      const notes = [
        p.dignity !== "Neutral" ? terms.dignity(p.dignity) : "",
        p.retrograde ? t("chart.retrograde") : "",
        p.combust ? t("chart.combust") : "",
      ].filter(Boolean);
      const tip = [
        `${t("chart.sign")}: ${terms.sign(p.sign)} ${p.degree}`,
        `${t("chart.house")}: ${p.house}`,
        `${t("chart.nakshatra")}: ${terms.nakshatra(p.nakshatra.name)} ${t("chart.pada")} ${p.nakshatra.pada}`,
        notes.length ? `${t("chart.notes")}: ${notes.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return {
        label:
          terms.abbrev(pname) +
          (p.dignity === "Exalted" ? "*" : "") +
          (p.retrograde ? "R" : ""),
        signIndex: p.sign_index,
        house: p.house,
        highlight: p.dignity === "Exalted" || p.retrograde,
        tip,
      };
    });
    return [lagnaMark, ...planetMarks];
  }, [chart, terms, t]);

  // Dynamic placements for currently selected Varga (D9, D10, D7, D3, D30, etc.)
  const vargaPlacements: { marks: PlacementMark[]; lagnaSignIndex: number; title: string } = useMemo(() => {
    if (!chart) return { marks: [], lagnaSignIndex: 0, title: "" };

    if (selectedVarga === "D9") {
      const lagnaIdx = chart.navamsa_d9?.["Lagna"]?.sign_index ?? 0;
      const marks = Object.entries(chart.navamsa_d9 || {}).map(([name, v]) => ({
        label: name === "Lagna" ? terms.ascLabel() : terms.abbrev(name) + (v.vargottama ? "*" : ""),
        signIndex: v.sign_index,
        highlight: v.vargottama,
        tip: name === "Lagna" ? `${terms.ascLabel()} (${terms.sign(v.sign)})` : `${terms.planet(name)}: ${terms.sign(v.sign)} ${v.vargottama ? "(Vargottama)" : ""}`,
      }));
      return { marks, lagnaSignIndex: lagnaIdx, title: "D9 Navamsa (Dharma & Relationships)" };
    }

    const vargaData = chart.vargas?.[selectedVarga];
    if (!vargaData) return { marks: [], lagnaSignIndex: 0, title: selectedVarga };

    const lagnaIdx = vargaData.lagna?.sign_index ?? 0;
    const lagnaMark: PlacementMark = {
      label: terms.ascLabel(),
      signIndex: lagnaIdx,
      house: 1,
      highlight: true,
      tip: `${terms.ascLabel()} (${vargaData.lagna.sign})`,
    };

    const planetMarks = Object.entries(vargaData.planets || {}).map(([pname, v]) => ({
      label: terms.abbrev(pname) + (v.vargottama ? "*" : ""),
      signIndex: v.sign_index,
      house: v.house,
      highlight: v.vargottama,
      tip: `${terms.planet(pname)}: ${v.sign} (House ${v.house}) ${v.vargottama ? "(Vargottama)" : ""}`,
    }));

    return {
      marks: [lagnaMark, ...planetMarks],
      lagnaSignIndex: lagnaIdx,
      title: `${selectedVarga} - ${vargaData.description}`,
    };
  }, [chart, selectedVarga, terms]);

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
  if (!chart || !profile) return <p className="text-sm text-stone-600">{t("common.calculating")}</p>;

  const current = chart.dasha.current;
  const bd = chart.birth_details;
  const shortPlace =
    profile.place_name.split(",").slice(0, 3).join(",").trim() || profile.place_name;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold text-saffron-800 hover:bg-saffron-100 transition"
            >
              <ArrowLeft size={14} />
              {locale === "hi" ? "सभी जातक" : "All People"}
            </Link>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="text-xl font-bold">{profile.name}</h1>
            <span className="text-sm font-semibold tabular-nums text-saffron-800">
              {bd.date} · {bd.time}
            </span>
            <span className="truncate text-xs text-stone-600 sm:max-w-md" title={profile.place_name}>
              {shortPlace} ({bd.tz_name})
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/profiles/${id}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-goldline bg-panel px-3 py-2 text-xs font-bold text-stone-700 hover:bg-saffron-100 transition shadow-sm"
          >
            <Pencil size={14} /> {locale === "hi" ? "संशोधित करें" : "Edit Details"}
          </Link>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 rounded-lg bg-saffron-600 px-3 py-2 text-xs font-bold text-white hover:bg-saffron-700 disabled:opacity-60 transition shadow-sm"
          >
            {downloadingPdf ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            {downloadingPdf
              ? (locale === "hi" ? "डाउनलोड हो रहा है..." : "Generating PDF...")
              : t("chart.pdf")}
          </button>
          <Link
            href={`/chat/${id}`}
            className="flex items-center gap-1.5 rounded-lg border border-goldline bg-panel px-3 py-2 text-xs font-bold text-saffron-800 hover:bg-saffron-100 transition shadow-sm"
          >
            {t("chart.consult")} <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat
          label={t("stat.lagna")}
          value={terms.sign(chart.lagna.sign)}
          sub={`${chart.lagna.degree} · ${t("chart.lord", { x: terms.planet(chart.lagna.lord) })}`}
        />
        <Stat
          label={t("stat.moonrashi")}
          value={terms.sign(chart.moon_rashi.sign)}
          sub={`${terms.nakshatra(chart.moon_rashi.nakshatra)} ${t("chart.pada")} ${chart.moon_rashi.pada}`}
        />
        <Stat
          label={t("stat.currdasha")}
          value={current.mahadasha ? terms.planet(current.mahadasha.lord) : "—"}
          sub={
            current.antardasha
              ? t("chart.antardasha_of", { x: terms.planet(current.antardasha.lord) })
              : undefined
          }
        />
        <Stat
          label={t("stat.birthnak")}
          value={terms.nakshatra(chart.moon_rashi.nakshatra)}
          sub={t("chart.lord", { x: terms.planet(chart.moon_rashi.nakshatra_lord) })}
        />
      </div>

      <div className="flex gap-0.5 overflow-x-auto rounded-t-xl border-b-2 border-goldline bg-sidebarbg/60 px-1 pt-1">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-bold transition sm:text-[13px] ${
              tab === tabItem.id
                ? "bg-panel text-saffron-800 shadow-[0_2px_0_0_var(--color-panel)]"
                : "text-stone-600 hover:bg-saffron-100/60 hover:text-saffron-800"
            }`}
          >
            <tabItem.icon size={14} strokeWidth={2.2} />
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === "d1" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-600">
                {t("chart.legend_d1")}
              </span>
              <span className="flex gap-1.5">
                <button
                  onClick={() => downloadSvg(chartRef, "D1")}
                  className="flex items-center gap-1 rounded-md border border-goldline px-2 py-1 text-[11px] font-bold text-saffron-800 hover:bg-saffron-100"
                >
                  <ImageIcon size={12} /> SVG
                </button>
                <button
                  onClick={() => downloadPng(chartRef, "D1")}
                  className="flex items-center gap-1 rounded-md border border-goldline px-2 py-1 text-[11px] font-bold text-saffron-800 hover:bg-saffron-100"
                >
                  <Download size={12} /> PNG
                </button>
              </span>
            </div>
            <div className="mx-auto max-w-[430px]">
              <VargaChart
                ref={chartRef}
                lagnaSignIndex={chart.lagna.sign_index}
                placements={d1Placements}
                signLabels={signLabels}
                houseWord={houseWord}
                title={locale === "hi" ? "द1 राशि कुंडली" : "D1 Rasi Chart"}
              />
            </div>
          </Card>

          <Card title={t("chart.positions")} className="lg:col-span-7">
            <PlanetTable chart={chart} />
          </Card>
        </div>
      )}

      {tab === "vargas" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-goldline/60 pb-2">
            {[
              { code: "D9", name: "D9 Navamsa (Dharma & Marriage)" },
              { code: "D10", name: "D10 Dashamsha (Career & Status)" },
              { code: "D7", name: "D7 Saptamsha (Children & Progeny)" },
              { code: "D3", name: "D3 Drekkana (Courage & Siblings)" },
              { code: "D30", name: "D30 Trimshamsha (Arishta & Afflictions)" },
            ].map((v) => (
              <button
                key={v.code}
                onClick={() => setSelectedVarga(v.code)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  selectedVarga === v.code
                    ? "bg-saffron-600 text-white shadow-sm"
                    : "border border-goldline bg-panel text-stone-700 hover:bg-saffron-50"
                }`}
              >
                {v.code}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone-600">
                  {vargaPlacements.title}
                </span>
                <span className="flex gap-1.5">
                  <button
                    onClick={() => downloadSvg(chartRef, selectedVarga)}
                    className="flex items-center gap-1 rounded-md border border-goldline px-2 py-1 text-[11px] font-bold text-saffron-800 hover:bg-saffron-100"
                  >
                    <ImageIcon size={12} /> SVG
                  </button>
                  <button
                    onClick={() => downloadPng(chartRef, selectedVarga)}
                    className="flex items-center gap-1 rounded-md border border-goldline px-2 py-1 text-[11px] font-bold text-saffron-800 hover:bg-saffron-100"
                  >
                    <Download size={12} /> PNG
                  </button>
                </span>
              </div>
              <div className="mx-auto max-w-[430px]">
                <VargaChart
                  ref={chartRef}
                  lagnaSignIndex={vargaPlacements.lagnaSignIndex}
                  placements={vargaPlacements.marks}
                  signLabels={signLabels}
                  houseWord={houseWord}
                  title={vargaPlacements.title}
                />
              </div>
            </Card>

            <Card title={`${selectedVarga} Placements Table`} className="lg:col-span-7">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-saffron-600 text-[11px] uppercase tracking-wide text-stone-600">
                      <th className="py-1.5 pr-3">{t("chart.body")}</th>
                      <th className="py-1.5 pr-3">{t("chart.sign")}</th>
                      <th className="py-1.5 pr-3">{t("chart.house")}</th>
                      <th className="py-1.5">{t("chart.vargottama")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVarga === "D9"
                      ? Object.entries(chart.navamsa_d9 || {}).map(([name, v]) => (
                          <tr key={name} className="border-b border-saffron-100/70">
                            <td className="py-1.5 pr-3 font-semibold">{terms.planet(name)}</td>
                            <td className="py-1.5 pr-3">{terms.sign(v.sign)}</td>
                            <td className="py-1.5 pr-3">—</td>
                            <td className="py-1.5 text-xs font-bold text-saffron-700">
                              {v.vargottama ? "✓ Yes" : "—"}
                            </td>
                          </tr>
                        ))
                      : Object.entries(chart.vargas?.[selectedVarga]?.planets || {}).map(([name, v]) => (
                          <tr key={name} className="border-b border-saffron-100/70">
                            <td className="py-1.5 pr-3 font-semibold">{terms.planet(name)}</td>
                            <td className="py-1.5 pr-3">{v.sign}</td>
                            <td className="py-1.5 pr-3 font-semibold">House {v.house}</td>
                            <td className="py-1.5 text-xs font-bold text-saffron-700">
                              {v.vargottama ? "✓ Yes" : "—"}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "ashtakavarga" && chart.ashtakavarga && (
        <div className="space-y-4">
          <Card title={`Sarvashtakavarga (SAV) House Strengths (Total = ${chart.ashtakavarga.total_bindus} Bindus, Average = 28 pts)`}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Object.entries(chart.ashtakavarga.house_strengths).map(([hStr, hs]) => {
                const isStrong = hs.points >= 30;
                const isLow = hs.points < 26;
                return (
                  <div
                    key={hStr}
                    className={`rounded-xl border p-3 ${
                      isStrong
                        ? "border-emerald-300 bg-emerald-50/60"
                        : isLow
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-goldline bg-panel"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-600">House {hs.house}</span>
                      <span
                        className={`text-xs font-extrabold ${
                          isStrong ? "text-emerald-700" : isLow ? "text-amber-800" : "text-saffron-800"
                        }`}
                      >
                        {hs.points} pts
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-stone-700">{hs.sign}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-stone-500">{hs.status}</p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isStrong ? "bg-emerald-600" : isLow ? "bg-amber-600" : "bg-saffron-600"
                        }`}
                        style={{ width: `${Math.min(100, (hs.points / 40) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {chart.ashtakavarga.bav && (
            <Card title="Bhinnashtakavarga (BAV) 7-Planet Matrix (Points per Sign 1-12)">
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead>
                    <tr className="border-b-2 border-saffron-600 text-[10px] uppercase font-bold text-stone-600">
                      <th className="py-2 text-left pr-2">Planet</th>
                      {[
                        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
                      ].map((s) => (
                        <th key={s} className="py-2 px-1">{s.slice(0, 3)}</th>
                      ))}
                      <th className="py-2 px-2 font-bold text-saffron-800">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(chart.ashtakavarga.bav).map(([pname, pts]) => (
                      <tr key={pname} className="border-b border-saffron-100/70">
                        <td className="py-1.5 text-left font-semibold">{terms.planet(pname)}</td>
                        {pts.map((pt, idx) => (
                          <td key={idx} className={`py-1.5 px-1 ${pt >= 5 ? "font-bold text-emerald-700 bg-emerald-50/40" : pt <= 2 ? "font-bold text-amber-700 bg-amber-50/40" : ""}`}>
                            {pt}
                          </td>
                        ))}
                        <td className="py-1.5 px-2 font-bold text-saffron-800">{pts.reduce((a, b) => a + b, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "shadbala" && chart.shadbala && (
        <Card title="Shadbala (6-Fold Planetary Strength Analysis in Rupas & Virupas)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-saffron-600 text-[11px] uppercase tracking-wide text-stone-600">
                  <th className="py-2 pr-3">{t("chart.body")}</th>
                  <th className="py-2 pr-2">Sthana</th>
                  <th className="py-2 pr-2">Dig</th>
                  <th className="py-2 pr-2">Kaala</th>
                  <th className="py-2 pr-2">Cheshta</th>
                  <th className="py-2 pr-2">Naisargika</th>
                  <th className="py-2 pr-2">Drik</th>
                  <th className="py-2 pr-2 font-bold text-saffron-800">Total Rupas</th>
                  <th className="py-2 pr-2">Ratio</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(chart.shadbala).map(([pname, sb]) => {
                  const isStrong = sb.strength_ratio >= 1.15;
                  const isWeak = sb.strength_ratio < 0.95;
                  return (
                    <tr key={pname} className="border-b border-saffron-100/70">
                      <td className="py-2 pr-3 font-semibold">{terms.planet(pname)}</td>
                      <td className="py-2 pr-2 tabular-nums text-xs">{sb.sthana_bala}</td>
                      <td className="py-2 pr-2 tabular-nums text-xs">{sb.dig_bala}</td>
                      <td className="py-2 pr-2 tabular-nums text-xs">{sb.kaala_bala}</td>
                      <td className="py-2 pr-2 tabular-nums text-xs">{sb.cheshta_bala}</td>
                      <td className="py-2 pr-2 tabular-nums text-xs">{sb.naisargika_bala}</td>
                      <td className="py-2 pr-2 tabular-nums text-xs">{sb.drik_bala}</td>
                      <td className="py-2 pr-2 font-bold text-saffron-800 tabular-nums">{sb.total_rupas} R</td>
                      <td className="py-2 pr-2 font-semibold text-xs tabular-nums">{sb.strength_ratio}x</td>
                      <td className="py-2 text-xs">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 font-bold ${
                            isStrong
                              ? "bg-emerald-100 text-emerald-800"
                              : isWeak
                              ? "bg-amber-100 text-amber-800"
                              : "bg-saffron-100 text-saffron-800"
                          }`}
                        >
                          {sb.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "transits" && (
        <div className="space-y-4">
          {chart.sade_sati && (
            <Card title="Saturn Transit & Sade Sati Status (from Natal Moon)">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-goldline bg-saffron-50/60 p-3">
                  <p className="text-[11px] font-bold uppercase text-saffron-700">Saturn Current Position</p>
                  <p className="mt-1 text-sm font-bold">
                    {chart.sade_sati.saturn_current_sign} ({chart.sade_sati.saturn_current_degree}){" "}
                    {chart.sade_sati.saturn_is_retrograde && "(Retrograde)"}
                  </p>
                  <p className="mt-1 text-xs text-stone-600">Natal Moon Sign: {chart.sade_sati.natal_moon_sign}</p>
                </div>
                <div className="rounded-xl border border-goldline bg-saffron-50/60 p-3">
                  <p className="text-[11px] font-bold uppercase text-saffron-700">Sade Sati Phase</p>
                  <p className="mt-1 text-sm font-bold">
                    {chart.sade_sati.is_sade_sati
                      ? chart.sade_sati.sade_sati_phase
                      : chart.sade_sati.is_kantaka_shani
                      ? "Kantaka Shani (4th from Moon)"
                      : chart.sade_sati.is_ashtama_shani
                      ? "Ashtama Shani (8th from Moon)"
                      : "No Active Sade Sati"}
                  </p>
                  <p className="mt-1 text-xs text-stone-600">{chart.sade_sati.summary}</p>
                </div>
              </div>
            </Card>
          )}

          {chart.transits_now && (
            <Card title={t("gochar.title", { at: chart.transits_now.computed_at.slice(0, 16).replace("T", " ") })}>
              <TransitTable positions={chart.transits_now.positions} />
            </Card>
          )}
        </div>
      )}

      {tab === "dasha" && (
        <Card title={t("dasha.title")}>
          {current.mahadasha && (
            <p className="mb-3 rounded-lg border border-goldline bg-saffron-50 p-2.5 text-[13px] font-semibold text-saffron-800">
              {t("dasha.now", {
                maha: terms.planet(current.mahadasha.lord),
                from: current.mahadasha.start_date,
                to: current.mahadasha.end_date,
                antar: current.antardasha ? terms.planet(current.antardasha.lord) : "—",
              })}
              {current.next_antardasha &&
                " " +
                  t("dasha.next", {
                    lord: terms.planet(current.next_antardasha.lord),
                    date: current.next_antardasha.start_date,
                  })}
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
                      {t("dasha.maha", { x: terms.planet(m.lord) })}
                      {isActive && ` — ${t("dasha.active")}`}
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
                            {terms.planet(m.lord)}-{terms.planet(a.lord)}
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

      {tab === "panchang" && (
        <div className="space-y-4">
          {chart.panchang_today && !("error" in chart.panchang_today) && (
            <Card
              title={t("panchang.title", {
                date: chart.panchang_today.date,
                tz: chart.panchang_today.tz_name,
              })}
            >
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <Field
                  label={t("panchang.tithi")}
                  value={`${terms.paksha(chart.panchang_today.tithi.paksha)} ${terms.tithi(chart.panchang_today.tithi.name)}`}
                />
                <Field
                  label={t("panchang.nakshatra")}
                  value={`${terms.nakshatra(chart.panchang_today.nakshatra.name)} (${terms.planet(chart.panchang_today.nakshatra.lord)})`}
                />
                <Field label={t("panchang.yoga")} value={terms.yogaState(chart.panchang_today.yoga.name)} />
                <Field label={t("panchang.karana")} value={terms.karana(chart.panchang_today.karana.name)} />
                <Field
                  label={t("panchang.var")}
                  value={`${terms.weekday(chart.panchang_today.weekday)} (${terms.planet(chart.panchang_today.var_lord)})`}
                />
                <Field
                  label={t("panchang.luminaries")}
                  value={`${terms.sign(chart.panchang_today.sun_sign)} / ${terms.sign(chart.panchang_today.moon_sign)}`}
                />
              </dl>
            </Card>
          )}
        </div>
      )}

      {tab === "yogas" && (
        <Card title={t("yogas.title", { n: chart.yogas.length })}>
          {chart.yogas.length === 0 ? (
            <p className="text-sm text-stone-600">{t("yogas.none")}</p>
          ) : (
            <ul className="space-y-2.5">
              {chart.yogas.map((y) => (
                <li key={y.name} className="border-l-4 border-gold bg-saffron-50/70 p-2.5">
                  <p className="text-sm font-bold text-saffron-800">{terms.formation(y.name)}</p>
                  <p className="text-xs text-stone-600">{y.basis}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function TransitTable({
  positions,
}: {
  positions: NonNullable<Chart["transits_now"]>["positions"];
}) {
  const { t, terms } = useI18n();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b-2 border-saffron-600 text-[11px] uppercase tracking-wide text-stone-600">
            <th className="py-1.5 pr-3">{t("chart.body")}</th>
            <th className="py-1.5 pr-3">{t("chart.sign")}</th>
            <th className="py-1.5 pr-3">{t("chart.degree")}</th>
            <th className="py-1.5 pr-3">{t("chart.nakshatra")}</th>
            <th className="py-1.5">{t("chart.state")}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(positions).map(([p, v]) => {
            const state = [
              v.retrograde ? t("chart.retrograde") : "",
              v.dignity !== "Neutral" ? terms.dignity(v.dignity) : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <tr key={p} className="border-b border-saffron-100/70">
                <td className="py-1.5 pr-3 font-semibold">{terms.planet(p)}</td>
                <td className="py-1.5 pr-3">{terms.sign(v.sign)}</td>
                <td className="py-1.5 pr-3 tabular-nums">{v.degree}</td>
                <td className="py-1.5 pr-3">{terms.nakshatra(v.nakshatra)}</td>
                <td className="py-1.5 text-xs font-semibold text-saffron-700">{state || t("chart.direct")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlanetTable({ chart }: { chart: Chart }) {
  const { t, terms, locale } = useI18n();
  const lagnaSublord = chart.lagna.sublord || chart.lagna.nakshatra?.sublord || "—";
  const lagnaLordNote = locale === "hi" 
    ? `स्वामी: ${terms.planet(chart.lagna.lord)}` 
    : `Lord ${terms.planet(chart.lagna.lord)}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b-2 border-saffron-600 text-[11px] uppercase tracking-wide text-stone-600">
            <th className="py-2 pr-3">{t("chart.body")}</th>
            <th className="py-2 pr-3">{t("chart.sign")}</th>
            <th className="py-2 pr-3">{t("chart.degree")}</th>
            <th className="py-2 pr-3">{t("chart.house")}</th>
            <th className="py-2 pr-3">{t("chart.nakshatra")}</th>
            <th className="py-2 pr-3 text-saffron-800">{t("chart.sublord")}</th>
            <th className="py-2">{t("chart.notes")}</th>
          </tr>
        </thead>
        <tbody>
          {/* Lagna / Ascendant Row */}
          <tr className="border-b border-saffron-200/80 bg-saffron-50/50 font-medium">
            <td className="py-2 pr-3 font-bold text-saffron-900">
              {locale === "hi" ? "लग्न (Asc)" : "Lagna (Asc)"}
            </td>
            <td className="py-2 pr-3 font-semibold text-stone-800">{terms.sign(chart.lagna.sign)}</td>
            <td className="py-2 pr-3 tabular-nums text-stone-700">{chart.lagna.degree}</td>
            <td className="py-2 pr-3 font-bold text-saffron-800">1</td>
            <td className="py-2 pr-3 text-stone-700">
              {chart.lagna.nakshatra ? `${terms.nakshatra(chart.lagna.nakshatra.name)} (${chart.lagna.nakshatra.pada})` : "—"}
            </td>
            <td className="py-2 pr-3 font-bold text-saffron-800">
              {lagnaSublord !== "—" ? terms.planet(lagnaSublord) : "—"}
            </td>
            <td className="py-2 text-xs font-semibold text-saffron-700">{lagnaLordNote}</td>
          </tr>

          {/* 9 Grahas */}
          {PLANET_ORDER.map((pname) => {
            const p = chart.planets[pname];
            const notes = [
              p.dignity !== "Neutral" ? terms.dignity(p.dignity) : "",
              p.retrograde ? t("chart.retrograde") : "",
              p.combust ? t("chart.combust") : "",
            ].filter(Boolean);
            const sub = p.sublord || p.nakshatra?.sublord || "—";
            return (
              <tr key={pname} className="border-b border-saffron-100/70 hover:bg-saffron-50/30 transition-colors">
                <td className="py-2 pr-3 font-semibold text-stone-900">{terms.planet(pname)}</td>
                <td className="py-2 pr-3 text-stone-800">{terms.sign(p.sign)}</td>
                <td className="py-2 pr-3 tabular-nums text-stone-700">{p.degree}</td>
                <td className="py-2 pr-3 font-semibold text-stone-700">{p.house}</td>
                <td className="py-2 pr-3 text-stone-700">
                  {terms.nakshatra(p.nakshatra.name)} ({p.nakshatra.pada})
                </td>
                <td className="py-2 pr-3 font-semibold text-saffron-800">
                  {sub !== "—" ? terms.planet(sub) : "—"}
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
