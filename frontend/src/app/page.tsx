"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Profile } from "@/lib/api";

export default function DashboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listProfiles()
      .then(setProfiles)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">People</h1>
          <p className="text-sm text-muted">
            Saved birth profiles — open a chart or start a consultation.
          </p>
        </div>
        <Link
          href="/profiles/new"
          className="rounded-lg bg-saffron-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-700"
        >
          + New Kundli
        </Link>
      </div>

      {loading && <p className="text-muted">Loading…</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error} — is the backend running on port 8000?
        </p>
      )}

      {!loading && !error && profiles.length === 0 && (
        <div className="rounded-xl border border-dashed border-saffron-400 bg-saffron-50 p-10 text-center">
          <p className="font-semibold text-saffron-800">No saved people yet</p>
          <p className="mt-1 text-sm text-muted">
            Create the first birth profile to generate a kundli.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-saffron-400"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold">{p.name}</h2>
              <span className="rounded-full bg-saffron-100 px-2.5 py-0.5 text-xs font-bold text-saffron-800">
                {p.birth_date}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {p.birth_time} · {p.place_name}
            </p>
            <div className="mt-auto flex gap-2 pt-4">
              <Link
                href={`/profiles/${p.id}`}
                className="flex-1 rounded-lg border border-saffron-600 px-3 py-2 text-center text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
              >
                Chart
              </Link>
              <Link
                href={`/chat/${p.id}`}
                className="flex-1 rounded-lg bg-saffron-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-saffron-700"
              >
                Consult
              </Link>
              <button
                onClick={async () => {
                  if (confirm(`Delete ${p.name}?`)) {
                    await api.deleteProfile(p.id);
                    setProfiles((prev) => prev.filter((x) => x.id !== p.id));
                  }
                }}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-muted hover:bg-stone-50"
                aria-label={`Delete ${p.name}`}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
