"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crown,
  Info,
  Loader2,
  Orbit,
  Sparkles,
  Sun,
} from "lucide-react";
import VargaChart, { type PlacementMark } from "@/components/VargaChart";
import { api, type Chart, type VarshphalData } from "@/lib/api";
import { localizedSignNames, SIGN_CODES_EN } from "@/lib/dictionaries";
import { useI18n } from "@/lib/i18n";

interface Props {
  profileId: number | string;
  birthDate: string;
  natalChart: Chart;
}

const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

export default function VarshphalTab({ profileId, birthDate, natalChart }: Props) {
  const { t, terms, locale } = useI18n();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [data, setData] = useState<VarshphalData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const signLabels = useMemo(
    () =>
      localizedSignNames(locale).map((full, i) => ({
        code: locale === "hi" ? full : SIGN_CODES_EN[i],
        name: full,
      })),
    [locale],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .getVarshphal(profileId, selectedYear)
      .then((res) => {
        if (!cancelled) {
          setData(res.varshphal);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to calculate Varshphal");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profileId, selectedYear]);

  // Format placements for VargaChart
  const placements: PlacementMark[] = useMemo(() => {
    if (!data) return [];
    const list: PlacementMark[] = [];

    // Annual planets
    for (const [name, p] of Object.entries(data.planets)) {
      list.push({
        label: p.retrograde ? `${terms.planet(name)} (R)` : terms.planet(name),
        signIndex: p.sign_index,
        house: p.house,
        tip: `${terms.planet(name)}: ${terms.sign(p.sign)} (${p.degree}) · ${locale === "hi" ? "भाव" : "House"} ${p.house} · ${p.dignity}`,
      });
    }

    // Muntha point in the chart
    if (data.muntha) {
      list.push({
        label: locale === "hi" ? "मुन्था" : "Muntha",
        signIndex: data.muntha.sign_index,
        house: data.muntha.house,
        highlight: true,
        tip: `${locale === "hi" ? "मुन्था बिंदु" : "Muntha Point"}: ${terms.sign(data.muntha.sign)} (${locale === "hi" ? "भाव" : "House"} ${data.muntha.house}) · ${locale === "hi" ? "मुन्थेश" : "Lord"}: ${terms.planet(data.muntha.lord)}`,
      });
    }

    return list;
  }, [data, terms, locale]);

  return (
    <div className="space-y-6">
      {/* Year Selector & Annual Cycle Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-goldline bg-panel p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-goldline bg-saffron-50 text-saffron-800 hover:bg-saffron-100 transition shadow-2xs"
            title={locale === "hi" ? "पिछला वर्ष" : "Previous Year"}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center px-3">
            <span className="text-xs font-bold uppercase tracking-wider text-saffron-700">
              {locale === "hi" ? "वार्षिक कुंडली वर्ष" : "Annual Return Year"}
            </span>
            <div className="font-serif text-2xl font-black text-saffron-950 tabular-nums">
              {selectedYear}
              {selectedYear === currentYear && (
                <span className="ml-2 inline-block align-middle rounded-full bg-saffron-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                  {locale === "hi" ? "सक्रिय वर्ष" : "Active"}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setSelectedYear((y) => y + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-goldline bg-saffron-50 text-saffron-800 hover:bg-saffron-100 transition shadow-2xs"
            title={locale === "hi" ? "अगला वर्ष" : "Next Year"}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {data && (
          <div className="flex flex-col sm:items-end text-center sm:text-right text-xs">
            <div className="flex items-center gap-1.5 font-bold text-saffron-900">
              <CalendarDays size={14} className="text-saffron-600 shrink-0" />
              <span>{data.period.display}</span>
            </div>
            <p className="mt-0.5 text-stone-600">
              {locale === "hi"
                ? `पूर्ण आयु: ${data.completed_age} वर्ष · चालू वर्ष: ${data.running_year_age}वाँ वर्ष`
                : `Completed Age: ${data.completed_age} yrs · Running Year: ${data.running_year_age}th yr`}
            </p>
            <p className="text-[11px] text-stone-500">
              {locale === "hi" ? "वर्ष प्रवेश समय: " : "Solar Return: "}
              {data.varshapravesha.local} ({data.varshapravesha.is_daytime ? (locale === "hi" ? "दिन" : "Day") : (locale === "hi" ? "रात्रि" : "Night")})
            </p>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-saffron-600" />
          <span className="ml-3 text-sm font-semibold text-stone-600">
            {locale === "hi" ? "वर्ष कुंडली गणना की जा रही है..." : "Computing Tajika Varshphal..."}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Key Tajika Pillars: 4 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Varsheshwara (Lord of the Year) */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-linear-to-br from-amber-50 to-orange-50/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  {locale === "hi" ? "वर्षेश (वर्ष स्वामी)" : "Varsheshwara"}
                </span>
                <Crown size={18} className="text-amber-600" />
              </div>
              <div className="mt-2 font-serif text-2xl font-black text-amber-950">
                {terms.planet(data.panchaadhikaris.varsheshwara)}
              </div>
              <p className="mt-1 text-xs text-amber-800">
                {locale === "hi"
                  ? "पञ्चाधिकारियों में श्रेष्ठ बलवान शासक"
                  : "Supreme Ruler from the 5 Office-Bearers"}
              </p>
            </div>

            {/* Muntha */}
            <div className="rounded-2xl border border-goldline bg-panel p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-saffron-800">
                  {locale === "hi" ? "मुन्था बिंदु" : "Muntha Point"}
                </span>
                <Orbit size={18} className="text-saffron-600" />
              </div>
              <div className="mt-2 font-serif text-xl font-bold text-ink">
                {terms.sign(data.muntha.sign)}{" "}
                <span className="text-sm font-normal text-stone-500">
                  ({locale === "hi" ? "भाव" : "H"} {data.muntha.house})
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-600">
                {locale === "hi" ? "मुन्थेश: " : "Munthesh: "}
                <span className="font-bold text-saffron-900">{terms.planet(data.muntha.lord)}</span>
                {" · "}
                <span className={data.muntha.status === "auspicious" ? "text-emerald-700 font-bold" : "text-amber-700 font-medium"}>
                  {data.muntha.status === "auspicious"
                    ? (locale === "hi" ? "शुभ कारक" : "Auspicious")
                    : (locale === "hi" ? "सावधानी / प्रयास" : "Challenging")}
                </span>
              </p>
            </div>

            {/* Varsha Lagna */}
            <div className="rounded-2xl border border-goldline bg-panel p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-saffron-800">
                  {locale === "hi" ? "वर्ष लग्न" : "Varsha Lagna"}
                </span>
                <Sun size={18} className="text-saffron-600" />
              </div>
              <div className="mt-2 font-serif text-xl font-bold text-ink">
                {terms.sign(data.lagna.sign)}
                <span className="ml-1.5 text-xs font-normal text-stone-500 tabular-nums">
                  {data.lagna.degree}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-600">
                {locale === "hi" ? "लग्नेश: " : "Lord: "}
                <span className="font-bold text-saffron-900">{terms.planet(data.lagna.lord)}</span>
                {" · "}
                <span>{data.lagna.nakshatra.name}</span>
              </p>
            </div>

            {/* Natal Lagna Comparison */}
            <div className="rounded-2xl border border-goldline bg-panel p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  {locale === "hi" ? "जन्म लग्न" : "Janma Lagna"}
                </span>
                <Compass size={18} className="text-stone-500" />
              </div>
              <div className="mt-2 font-serif text-xl font-bold text-ink">
                {terms.sign(natalChart.lagna.sign)}
              </div>
              <p className="mt-1 text-xs text-stone-600">
                {locale === "hi" ? "जन्म लग्नेश: " : "Natal Lord: "}
                <span className="font-bold text-stone-800">{terms.planet(natalChart.lagna.lord)}</span>
              </p>
            </div>
          </div>

          {/* Kundli Chart & Panchaadhikaris Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Visual Annual Chart */}
            <section className="rounded-2xl border border-goldline bg-panel p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-saffron-950">
                  {locale === "hi"
                    ? `वर्ष कुंडली (${selectedYear}–${selectedYear + 1})`
                    : `Varsh Kundli (${selectedYear}–${selectedYear + 1})`}
                </h3>
                <span className="rounded-md bg-saffron-100 px-2 py-0.5 text-xs font-bold text-saffron-800">
                  {locale === "hi" ? "लग्न: " : "Asc: "}
                  {terms.sign(data.lagna.sign)}
                </span>
              </div>

              <div className="flex justify-center">
                <VargaChart
                  lagnaSignIndex={data.lagna.sign_index}
                  placements={placements}
                  signLabels={signLabels}
                  houseWord={locale === "hi" ? "भाव" : "House"}
                  title={`Varsh Kundli ${selectedYear}`}
                />
              </div>

              <p className="mt-3 text-center text-xs text-stone-500">
                {locale === "hi"
                  ? "ताजिक पद्धति: मुन्था (Muntha) बिंदु व ग्रह स्थिति"
                  : "Tajika System: Visual placements with progressed Muntha point"}
              </p>
            </section>

            {/* Panchaadhikaris Table */}
            <section className="rounded-2xl border border-goldline bg-panel p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-saffron-950">
                  {locale === "hi" ? "पञ्चाधिकारी (5 वार्षिक पद)" : "Panchaadhikaris (5 Office Bearers)"}
                </h3>
                <span className="text-xs font-semibold text-stone-500">
                  {locale === "hi" ? "वर्षेश निर्धारण" : "Varsheshwara Selection"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-goldline bg-saffron-50/70 font-bold uppercase tracking-wider text-saffron-900">
                    <tr>
                      <th className="py-2 px-3">{locale === "hi" ? "पद / उपाधि" : "Office"}</th>
                      <th className="py-2 px-3">{locale === "hi" ? "ग्रह" : "Planet"}</th>
                      <th className="py-2 px-3">{locale === "hi" ? "लग्न दृष्टि" : "Aspects Lagna"}</th>
                      <th className="py-2 px-3">{locale === "hi" ? "स्थिति" : "Dignity"}</th>
                      <th className="py-2 px-3 text-right">{locale === "hi" ? "बल अंक" : "Score"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-goldline/40">
                    {Object.entries(data.panchaadhikaris.candidates).map(([office, planet]) => {
                      const scoreData = data.panchaadhikaris.scores[planet];
                      const isVarshesh = data.panchaadhikaris.varsheshwara === planet;
                      return (
                        <tr
                          key={office}
                          className={`transition ${
                            isVarshesh ? "bg-amber-100/60 font-bold text-amber-950" : ""
                          }`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              {isVarshesh && <Crown size={13} className="text-amber-600 shrink-0" />}
                              <span>{office}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-semibold">{terms.planet(planet)}</td>
                          <td className="py-2 px-3">
                            {scoreData?.aspects_lagna ? (
                              <span className="text-emerald-700 font-bold">
                                {locale === "hi" ? "हाँ (दृष्टि)" : "Yes (Aspecting)"}
                              </span>
                            ) : (
                              <span className="text-stone-400">
                                {locale === "hi" ? "नहीं" : "No"}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-stone-700">{scoreData?.dignity || "—"}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-bold">
                            {scoreData?.score ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950">
                <div className="flex items-start gap-2">
                  <Info size={15} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {locale === "hi" ? "वर्षेश निर्णय सूत्र: " : "Varsheshwara Rule: "}
                    </span>
                    {locale === "hi"
                      ? "पञ्चाधिकारियों में से वही ग्रह वर्षेश बनता है जो वर्ष लग्न को मित्र या सम दृष्टि से देखे और सर्वाधिक बलवान हो।"
                      : "The candidate possessing Tajika aspect on the Varsha Lagna with highest dignity and office count is selected as Lord of the Year."}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Mudda Dasha (Annual 365.25 Day Timeline) */}
          <section className="rounded-2xl border border-goldline bg-panel p-5 shadow-xs">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-serif text-base font-bold text-saffron-950">
                  {locale === "hi" ? "मुद्दा दशा (वार्षिक विंशोत्तरी दशा)" : "Mudda Dasha (Annual 365-Day Cycle)"}
                </h3>
                <p className="text-xs text-stone-600">
                  {locale === "hi"
                    ? "वर्ष कुंडली के चंद्र नक्षत्र से प्रारंभ होने वाला 365.25 दिवसीय दशा क्रम"
                    : "Annual progression starting from Varsha Moon nakshatra lord"}
                </p>
              </div>
              <span className="rounded-full bg-saffron-100 px-3 py-1 text-xs font-bold text-saffron-800 self-start sm:self-auto">
                {locale === "hi" ? "9 ग्रह दशा चक्र" : "9 Planet Cycle"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-goldline bg-saffron-50/70 font-bold uppercase tracking-wider text-saffron-900">
                  <tr>
                    <th className="py-2 px-3">{locale === "hi" ? "दशा नाथ" : "Dasha Lord"}</th>
                    <th className="py-2 px-3">{locale === "hi" ? "अवधि (दिन)" : "Duration (Days)"}</th>
                    <th className="py-2 px-3">{locale === "hi" ? "आरंभ तिथि" : "Start Date"}</th>
                    <th className="py-2 px-3">{locale === "hi" ? "समाप्ति तिथि" : "End Date"}</th>
                    <th className="py-2 px-3 text-right">{locale === "hi" ? "स्थिति" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-goldline/40">
                  {data.mudda_dasha.map((m, idx) => (
                    <tr
                      key={idx}
                      className={`transition ${
                        m.is_current
                          ? "bg-saffron-100/70 font-bold text-saffron-950"
                          : "hover:bg-saffron-50/30"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-saffron-700 text-[10px] font-bold text-white">
                            {terms.planet(m.lord).charAt(0)}
                          </span>
                          <span className="font-bold">{terms.planet(m.lord)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums font-semibold">
                        {m.duration_days} {locale === "hi" ? "दिन" : "days"}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-stone-700">{m.start_date}</td>
                      <td className="py-2.5 px-3 tabular-nums text-stone-700">{m.end_date}</td>
                      <td className="py-2.5 px-3 text-right">
                        {m.is_current ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-saffron-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                            <Sparkles size={10} />
                            {locale === "hi" ? "वर्तमान सक्रिय" : "Current Active"}
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Annual Planetary Placements Table */}
          <section className="rounded-2xl border border-goldline bg-panel p-5 shadow-xs">
            <h3 className="mb-3 font-serif text-base font-bold text-saffron-950">
              {locale === "hi" ? "वार्षिक ग्रह स्थिति" : "Annual Planetary Placements"}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-goldline bg-saffron-50/70 font-bold uppercase tracking-wider text-saffron-900">
                  <tr>
                    <th className="py-2 px-3">{locale === "hi" ? "ग्रह" : "Planet"}</th>
                    <th className="py-2 px-3">{locale === "hi" ? "राशि" : "Sign"}</th>
                    <th className="py-2 px-3">{locale === "hi" ? "अंश" : "Degree"}</th>
                    <th className="py-2 px-3">{locale === "hi" ? "भाव" : "House"}</th>
                    <th className="py-2 px-3">{locale === "hi" ? "नक्षत्र" : "Nakshatra"}</th>
                    <th className="py-2 px-3">{locale === "hi" ? "स्थिति" : "Dignity"}</th>
                    <th className="py-2 px-3 text-right">{locale === "hi" ? "गति" : "Motion"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-goldline/40 font-medium">
                  {PLANET_ORDER.map((name) => {
                    const p = data.planets[name];
                    if (!p) return null;
                    return (
                      <tr key={name} className="hover:bg-saffron-50/30 transition">
                        <td className="py-2 px-3 font-bold text-ink">{terms.planet(name)}</td>
                        <td className="py-2 px-3 text-stone-700">{terms.sign(p.sign)}</td>
                        <td className="py-2 px-3 tabular-nums font-mono text-stone-700">{p.degree}</td>
                        <td className="py-2 px-3 font-semibold text-saffron-900">
                          {locale === "hi" ? `भाव ${p.house}` : `House ${p.house}`}
                        </td>
                        <td className="py-2 px-3 text-stone-700">
                          {p.nakshatra?.name || "—"} ({terms.planet(p.nakshatra?.lord || "")})
                        </td>
                        <td className="py-2 px-3 text-stone-700">{p.dignity}</td>
                        <td className="py-2 px-3 text-right">
                          {p.retrograde ? (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                              {locale === "hi" ? "वक्री" : "Retrograde"}
                            </span>
                          ) : (
                            <span className="text-stone-400">{locale === "hi" ? "मार्गी" : "Direct"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
