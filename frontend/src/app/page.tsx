"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Profile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth, authEnabled } from "@/lib/auth";

export default function DashboardPage() {
  const { t } = useI18n();
  const { session, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authEnabled && (authLoading || !session)) return;
    setLoading(true);
    setError("");
    api
      .listProfiles()
      .then(setProfiles)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [session, authLoading]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t("dash.title")}</h1>
          <p className="text-sm text-stone-600">{t("dash.sub")}</p>
        </div>
        <Link
          href="/profiles/new"
          className="rounded-lg bg-saffron-600 px-4 py-2 text-sm font-bold text-white hover:bg-saffron-700"
        >
          {t("dash.add")}
        </Link>
      </div>

      {loading && <p className="text-sm text-stone-600">{t("dash.loading")}</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error} — {t("dash.errsuffix")}
        </p>
      )}

      {!loading && !error && profiles.length === 0 && (
        <div className="rounded-xl border border-dashed border-gold bg-panel p-10 text-center">
          <p className="font-bold text-saffron-800">{t("dash.empty_title")}</p>
          <p className="mt-1 text-sm text-stone-600">{t("dash.empty_sub")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-xl border border-goldline bg-panel p-4 shadow-sm transition hover:border-gold"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="truncate text-base font-bold">{p.name}</h2>
              <span className="shrink-0 rounded-full bg-saffron-100 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-saffron-800">
                {p.birth_date}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-stone-600" title={p.place_name}>
              {p.birth_time} · {p.place_name}
            </p>
            <div className="mt-auto flex gap-2 pt-3.5">
              <Link
                href={`/profiles/${p.id}`}
                className="flex-1 rounded-lg border border-saffron-600 px-3 py-1.5 text-center text-xs font-bold text-saffron-700 hover:bg-saffron-50"
              >
                {t("dash.chart")}
              </Link>
              <Link
                href={`/chat/${p.id}`}
                className="flex-1 rounded-lg bg-saffron-600 px-3 py-1.5 text-center text-xs font-bold text-white hover:bg-saffron-700"
              >
                {t("dash.consult")}
              </Link>
              <button
                onClick={async () => {
                  if (confirm(t("dash.delete_q", { name: p.name }))) {
                    await api.deleteProfile(p.id);
                    setProfiles((prev) => prev.filter((x) => x.id !== p.id));
                  }
                }}
                className="rounded-lg border border-goldline px-2.5 py-1.5 text-stone-500 hover:bg-saffron-100"
                aria-label={t("dash.delete_a")}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
