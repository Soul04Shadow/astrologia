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
  { id: "d1", icon: Sun },
  { id: "d9", icon: LayoutGrid },
  { id: "dasha", icon: Clock3 },
  { id: "panchang", icon: CloudSun },
  { id: "yogas", icon: ScrollText },
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
        highlight: p.dignity === "Exalted" || p.retrograde,
        tip,
      };
    });
  }, [chart, terms, t]);

  const d9Placements: PlacementMark[] = useMemo(() => {
    if (!chart?.navamsa_d9) return [];
    return Object.entries(chart.navamsa_d9).map(([name, v]) => ({
      label: name === "Lagna" ? terms.ascLabel() : terms.abbrev(name) + (v.vargottama ? "*" : ""),
      signIndex: v.sign_index,
      highlight: v.vargottama,
      tip: [
        name === "Lagna" ? null : `${t("chart.sign")}: ${terms.sign(v.sign)}`,
        v.vargottama ? `${t("chart.vargottama")} ✓` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    }));
  }, [chart, terms, t]);

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
        <div className="flex gap-2">
          <a
            href={`${api.base}/api/profiles/${id}/report.pdf`}
            className="flex items-center gap-1.5 rounded-lg bg-saffron-600 px-3 py-2 text-xs font-bold text-white hover:bg-saffron-700"
          >
            <FileText size={14} /> {t("chart.pdf")}
          </a>
          <Link
            href={`/chat/${id}`}
            className="flex items-center gap-1.5 rounded-lg border border-goldline bg-panel px-3 py-2 text-xs font-bold text-saffron-800 hover:bg-saffron-100"
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
            {t(`tabs.${tabItem.id}`)}
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

          <Card title={t("chart.positions")} className="lg:col-span-7">
            <PlanetTable chart={chart} />
          </Card>
        </div>
      )}

      {tab === "d9" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-600">
                {t("chart.legend_d9")}
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

          <Card title={t("chart.d9_table")} className="lg:col-span-7">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-saffron-600 text-[11px] uppercase tracking-wide text-stone-600">
                  <th className="py-1.5 pr-3">{t("chart.body")}</th>
                  <th className="py-1.5 pr-3">{t("chart.sign")}</th>
                  <th className="py-1.5">{t("chart.vargottama")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(chart.navamsa_d9).map(([name, v]) => (
                  <tr key={name} className="border-b border-saffron-100/70">
                    <td className="py-1.5 pr-3 font-semibold">{terms.planet(name)}</td>
                    <td className="py-1.5 pr-3">{terms.sign(v.sign)}</td>
                    <td className="py-1.5 text-xs font-bold text-saffron-700">
                      {v.vargottama ? t("chart.yes") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
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

      {(tab === "panchang" || tab === "yogas") && (
        <div className="space-y-4">
          {tab === "panchang" && (
            <>
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
              {chart.transits_now && (
                <Card title={t("gochar.title", { at: chart.transits_now.computed_at.slice(0, 16).replace("T", " ") })}>
                  <TransitTable positions={chart.transits_now.positions} />
                </Card>
              )}
            </>
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
  const { t, terms } = useI18n();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b-2 border-saffron-600 text-[11px] uppercase tracking-wide text-stone-600">
            <th className="py-1.5 pr-3">{t("chart.body")}</th>
            <th className="py-1.5 pr-3">{t("chart.sign")}</th>
            <th className="py-1.5 pr-3">{t("chart.degree")}</th>
            <th className="py-1.5 pr-3">{t("chart.house")}</th>
            <th className="py-1.5 pr-3">{t("chart.nakshatra")}</th>
            <th className="py-1.5">{t("chart.notes")}</th>
          </tr>
        </thead>
        <tbody>
          {PLANET_ORDER.map((pname) => {
            const p = chart.planets[pname];
            const notes = [
              p.dignity !== "Neutral" ? terms.dignity(p.dignity) : "",
              p.retrograde ? t("chart.retrograde") : "",
              p.combust ? t("chart.combust") : "",
            ].filter(Boolean);
            return (
              <tr key={pname} className="border-b border-saffron-100/70">
                <td className="py-1.5 pr-3 font-semibold">{terms.planet(pname)}</td>
                <td className="py-1.5 pr-3">{terms.sign(p.sign)}</td>
                <td className="py-1.5 pr-3 tabular-nums">{p.degree}</td>
                <td className="py-1.5 pr-3">{p.house}</td>
                <td className="py-1.5 pr-3">
                  {terms.nakshatra(p.nakshatra.name)} ({p.nakshatra.pada})
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
