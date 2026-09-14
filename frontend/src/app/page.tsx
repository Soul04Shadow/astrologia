"use client";

import Link from "next/link";
import {
  Calendar,
  Clock,
  LayoutGrid,
  List,
  MapPin,
  MessageSquareQuote,
  Pencil,
  PlusCircle,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Profile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth, authEnabled } from "@/lib/auth";
import { DossierCardSkeleton } from "@/components/Skeletons";

export default function DashboardPage() {
  const { t, locale, terms } = useI18n();
  const { session, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveProfileId(localStorage.getItem("active-profile-id"));
      const savedView = localStorage.getItem("astro-dashboard-view");
      if (savedView === "table" || savedView === "grid") setViewMode(savedView);
    }
  }, []);

  useEffect(() => {
    if (authEnabled && (authLoading || !session)) return;
    setLoading(true);
    setError("");
    api
      .listProfiles()
      .then((data) => {
        setProfiles(data);
        // If there's an active-profile-id in localStorage, verify it exists
        const savedId = localStorage.getItem("active-profile-id");
        if (savedId && data.some((p) => String(p.id) === savedId)) {
          setActiveProfileId(savedId);
        } else if (data.length > 0 && !savedId) {
          // Default active profile to first profile
          localStorage.setItem("active-profile-id", String(data[0].id));
          localStorage.setItem("active-profile-name", data[0].name);
          setActiveProfileId(String(data[0].id));
          window.dispatchEvent(new Event("active-profile-changed"));
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [session, authLoading]);

  function selectProfile(p: Profile) {
    if (typeof window !== "undefined") {
      localStorage.setItem("active-profile-id", String(p.id));
      localStorage.setItem("active-profile-name", p.name);
      setActiveProfileId(String(p.id));
      window.dispatchEvent(new Event("active-profile-changed"));
    }
  }

  const filteredProfiles = profiles.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.place_name.toLowerCase().includes(q) ||
      p.birth_date.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-7xl pb-16">
      {/* Top Header & Page Banner */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-goldline/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-saffron-900 sm:text-3xl">
              {t("dash.title")}
            </h1>
            {!loading && profiles.length > 0 && (
              <span className="rounded-full border border-gold/40 bg-saffron-100 px-3 py-0.5 text-xs font-bold tabular-nums text-saffron-800">
                {profiles.length === 1
                  ? t("dash.count_single", { n: "1" })
                  : t("dash.count_plural", { n: String(profiles.length) })}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-stone-600">
            {t("dash.sub")}
          </p>
        </div>

        <Link
          href="/profiles/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-saffron-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-saffron-800 hover:shadow-md active:scale-95"
        >
          <PlusCircle size={18} className="text-amber-200" />
          <span>{t("dash.add")}</span>
        </Link>
      </div>

      {/* Live Search Bar & View Mode Switcher */}
      {profiles.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("dash.search_placeholder")}
              className="w-full rounded-xl border border-goldline bg-panel py-2.5 pl-10 pr-10 text-sm font-medium text-ink placeholder-stone-400 shadow-2xs transition focus:border-saffron-600 focus:outline-hidden focus:ring-1 focus:ring-saffron-600"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center rounded-xl border border-goldline bg-panel p-1 shadow-2xs shrink-0 self-end sm:self-auto">
            <button
              onClick={() => {
                setViewMode("grid");
                localStorage.setItem("astro-dashboard-view", "grid");
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "grid"
                  ? "bg-saffron-600 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
              title={locale === "hi" ? "ग्रिड दृश्य" : "Grid View"}
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">{locale === "hi" ? "कार्ड" : "Cards"}</span>
            </button>
            <button
              onClick={() => {
                setViewMode("table");
                localStorage.setItem("astro-dashboard-view", "table");
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "table"
                  ? "bg-saffron-600 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
              title={locale === "hi" ? "तालिका दृश्य (नक्षत्र स्वामी कॉलम)" : "Table View (Nakshatra Lord Column)"}
            >
              <List size={15} />
              <span className="hidden sm:inline">{locale === "hi" ? "तालिका (कॉलम)" : "Table (Column)"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading & Error States */}
      {loading && <DossierCardSkeleton count={6} />}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-2xs">
          {error} — {t("dash.errsuffix")}
        </div>
      )}

      {/* Empty State: No profiles created yet */}
      {!loading && !error && profiles.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-goldline bg-panel/80 p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-700 shadow-2xs">
            <Users size={28} />
          </div>
          <h2 className="mt-4 font-serif text-lg font-bold text-saffron-900">
            {t("dash.empty_title")}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">
            {t("dash.empty_sub")}
          </p>
          <div className="mt-6">
            <Link
              href="/profiles/new"
              className="inline-flex items-center gap-2 rounded-xl bg-saffron-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-saffron-700 hover:shadow"
            >
              <PlusCircle size={17} className="text-amber-200" />
              <span>{t("dash.add")}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Empty State: Search filter yielded no results */}
      {!loading && !error && profiles.length > 0 && filteredProfiles.length === 0 && (
        <div className="rounded-2xl border border-goldline bg-panel p-10 text-center shadow-xs">
          <p className="text-sm font-semibold text-stone-600">
            {t("dash.no_results", { query: searchTerm })}
          </p>
          <button
            onClick={() => setSearchTerm("")}
            className="mt-3 rounded-lg border border-goldline bg-saffron-50 px-3 py-1.5 text-xs font-bold text-saffron-800 hover:bg-saffron-100 transition"
          >
            {locale === "hi" ? "खोज रीसेट करें" : "Clear Search"}
          </button>
        </div>
      )}

      {/* Table View: Explicit Nakshatra Lord Column */}
      {!loading && !error && filteredProfiles.length > 0 && viewMode === "table" && (
        <div className="overflow-x-auto rounded-2xl border border-goldline bg-panel shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-goldline bg-saffron-50/70 text-xs font-bold uppercase tracking-wider text-saffron-900">
              <tr>
                <th className="py-3 px-4">{locale === "hi" ? "जातक" : "Native"}</th>
                <th className="py-3 px-4">{locale === "hi" ? "जन्म समय व तिथि" : "Birth Date & Time"}</th>
                <th className="py-3 px-4">{locale === "hi" ? "जन्म स्थान" : "Birth Place"}</th>
                <th className="py-3 px-4">{locale === "hi" ? "नक्षत्र" : "Nakshatra"}</th>
                <th className="py-3 px-4">{locale === "hi" ? "नक्षत्र स्वामी (Lord)" : "Nakshatra Lord"}</th>
                <th className="py-3 px-4 text-right">{locale === "hi" ? "कार्य" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-goldline/40 font-medium">
              {filteredProfiles.map((p) => {
                const isActive = activeProfileId === String(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`transition hover:bg-saffron-50/40 ${
                      isActive ? "bg-saffron-50/60 font-semibold" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-saffron-800 font-serif text-xs font-bold text-amber-100 border border-goldline/60">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-ink" title={p.name}>
                            {p.name}
                          </div>
                          {isActive && (
                            <span className="inline-block rounded-full bg-saffron-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
                              {t("dash.active_badge")}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-stone-700">
                      <div className="tabular-nums font-semibold">{p.birth_date}</div>
                      <div className="text-stone-500">{p.birth_time} (24h)</div>
                    </td>
                    <td className="py-3 px-4 max-w-[180px] truncate text-xs text-stone-700" title={p.place_name}>
                      {p.place_name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs">
                      {p.nakshatra ? (
                        <span className="font-semibold text-saffron-950">{p.nakshatra}</span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {p.nakshatra_lord ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-saffron-100 px-2 py-0.5 text-xs font-bold text-saffron-900 border border-gold/40">
                          <Sparkles size={11} className="text-saffron-600" />
                          {terms.planet(p.nakshatra_lord)}
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/profiles/${p.id}`}
                          onClick={() => selectProfile(p)}
                          className="rounded-lg border border-saffron-600/70 bg-white px-2.5 py-1 text-xs font-bold text-saffron-800 hover:bg-saffron-50 transition"
                        >
                          {t("dash.view_chart")}
                        </Link>
                        <Link
                          href={`/chat/${p.id}`}
                          onClick={() => selectProfile(p)}
                          className="rounded-lg bg-saffron-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-saffron-800 transition"
                        >
                          {t("dash.consult")}
                        </Link>
                        <Link
                          href={`/profiles/${p.id}/edit`}
                          onClick={() => selectProfile(p)}
                          className="rounded-md p-1.5 text-stone-400 hover:bg-saffron-100 hover:text-saffron-800 transition"
                          title={locale === "hi" ? "संशोधित करें" : "Edit Details"}
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={async () => {
                            if (confirm(t("dash.delete_q", { name: p.name }))) {
                              await api.deleteProfile(p.id);
                              setProfiles((prev) => prev.filter((x) => x.id !== p.id));
                              if (activeProfileId === String(p.id)) {
                                localStorage.removeItem("active-profile-id");
                                localStorage.removeItem("active-profile-name");
                                setActiveProfileId(null);
                                window.dispatchEvent(new Event("active-profile-changed"));
                              }
                            }
                          }}
                          className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                          title={t("dash.delete_a")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Horoscope Dossier Cards Grid (Default View) */}
      {!loading && !error && filteredProfiles.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProfiles.map((p) => {
            const isActive = activeProfileId === String(p.id);
            return (
              <div
                key={p.id}
                className={`group relative flex flex-col justify-between rounded-2xl border bg-panel p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isActive
                    ? "border-saffron-600/70 ring-1 ring-saffron-600/30"
                    : "border-goldline hover:border-gold"
                }`}
              >
                <div>
                  {/* Header Row: Avatar, Name & Meta, and Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saffron-800 font-serif text-lg font-bold text-amber-100 shadow-2xs border border-goldline/60">
                        {p.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2
                          className="truncate text-base font-bold text-ink group-hover:text-saffron-900 transition"
                          title={p.name}
                        >
                          {p.name}
                        </h2>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-saffron-800">
                          <div className="flex items-center gap-1">
                            <Calendar size={13} className="text-saffron-600 shrink-0" />
                            <span className="whitespace-nowrap tabular-nums">{p.birth_date}</span>
                          </div>
                          {isActive && (
                            <span className="rounded-full bg-saffron-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                              {t("dash.active_badge")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Secondary Actions (Edit & Delete) */}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-80 group-hover:opacity-100 transition">
                      <Link
                        href={`/profiles/${p.id}/edit`}
                        onClick={() => selectProfile(p)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-saffron-100 hover:text-saffron-800 transition"
                        title={locale === "hi" ? "संशोधित करें" : "Edit Details"}
                        aria-label="Edit profile"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={async () => {
                          if (confirm(t("dash.delete_q", { name: p.name }))) {
                            await api.deleteProfile(p.id);
                            setProfiles((prev) => prev.filter((x) => x.id !== p.id));
                            if (activeProfileId === String(p.id)) {
                              localStorage.removeItem("active-profile-id");
                              localStorage.removeItem("active-profile-name");
                              setActiveProfileId(null);
                              window.dispatchEvent(new Event("active-profile-changed"));
                            }
                          }
                        }}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                        title={t("dash.delete_a")}
                        aria-label={t("dash.delete_a")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Birth Time, Place & Nakshatra Strip */}
                  <div className="my-3.5 space-y-1.5 rounded-xl border border-goldline/50 bg-saffron-50/40 p-2.5 text-xs text-stone-600">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-saffron-700 shrink-0" />
                      <span className="font-medium text-stone-700">
                        {p.birth_time} (24h)
                      </span>
                    </div>
                    <div className="flex items-center gap-2" title={p.place_name}>
                      <MapPin size={13} className="text-saffron-700 shrink-0" />
                      <span className="truncate font-medium text-stone-700">
                        {p.place_name}
                      </span>
                    </div>
                    {p.nakshatra && (
                      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-goldline/40">
                        <div className="flex items-center gap-1.5 text-stone-700 min-w-0">
                          <Sparkles size={12} className="text-saffron-600 shrink-0" />
                          <span className="truncate font-medium">
                            {locale === "hi" ? "नक्षत्र: " : "Nakshatra: "}
                            <span className="font-bold text-saffron-950">{p.nakshatra}</span>
                          </span>
                        </div>
                        {p.nakshatra_lord && (
                          <span className="shrink-0 rounded-md bg-saffron-100 px-2 py-0.5 text-[11px] font-bold text-saffron-900 border border-gold/40">
                            {locale === "hi" ? "स्वामी: " : "Lord: "}{terms.planet(p.nakshatra_lord)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Actions: View Kundli & Consult AI */}
                <div className="mt-2 flex gap-2 pt-1 border-t border-goldline/40">
                  <Link
                    href={`/profiles/${p.id}`}
                    onClick={() => selectProfile(p)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-saffron-600/70 bg-white py-2 px-2 text-xs font-bold text-saffron-800 shadow-2xs transition hover:bg-saffron-50 hover:border-saffron-700"
                  >
                    <Sun size={15} className="text-saffron-700 shrink-0" />
                    <span className="truncate">{t("dash.view_chart")}</span>
                  </Link>

                  <Link
                    href={`/chat/${p.id}`}
                    onClick={() => selectProfile(p)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-saffron-700 py-2 px-2 text-xs font-bold text-white shadow-2xs transition hover:bg-saffron-800"
                  >
                    <MessageSquareQuote size={15} className="text-amber-200 shrink-0" />
                    <span className="truncate">{t("dash.consult")}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
