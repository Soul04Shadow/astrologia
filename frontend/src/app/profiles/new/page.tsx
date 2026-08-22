"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, type PlaceResult } from "@/lib/api";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-saffron-600 focus:ring-2 focus:ring-saffron-100";
const labelCls = "mb-1.5 block text-sm font-semibold";

export default function NewProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("1995-01-01");
  const [birthTime, setBirthTime] = useState("08:00");
  const [placeQuery, setPlaceQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (placeQuery.trim().length < 2 || selected?.display_name === placeQuery) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.geocode(placeQuery);
        setResults(r.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [placeQuery, selected]);

  async function resolvePlace(): Promise<PlaceResult> {
    if (selected) return selected;
    const res = await fetch(`${api.base}/api/resolve-place?q=${encodeURIComponent(placeQuery)}`);
    if (!res.ok) throw new Error(`Place "${placeQuery}" not found — pick from suggestions`);
    const direct = await res.json();
    return { display_name: placeQuery, name: placeQuery, latitude: direct.latitude, longitude: direct.longitude, tz_name: direct.tz_name };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const chosen = await resolvePlace();
      const profile = await api.createProfile({
        name: name.trim(),
        birth_date: birthDate,
        birth_time: birthTime,
        place_name: chosen.display_name,
        latitude: chosen.latitude,
        longitude: chosen.longitude,
        tz_name: chosen.tz_name,
      });
      router.push(`/profiles/${profile.id}`);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">New Birth Profile</h1>
      <p className="mt-1 text-sm text-muted">
        Enter exact birth details. Time zone is detected automatically from the birthplace.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label className={labelCls}>Full name</label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Ramesh Sharma"
            required
            minLength={1}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Date of birth</label>
            <input
              type="date"
              className={inputCls}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Time of birth (24h)</label>
            <input
              type="time"
              className={inputCls}
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="relative">
          <label className={labelCls}>Place of birth</label>
          <input
            className={inputCls}
            value={placeQuery}
            onChange={(e) => {
              setPlaceQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Type a city, e.g., Ujjain"
            required
          />
          {searching && (
            <span className="absolute right-3 top-9 text-xs text-muted">searching…</span>
          )}
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-saffron-50"
                    onClick={() => {
                      setSelected(r);
                      setPlaceQuery(r.display_name);
                      setResults([]);
                    }}
                  >
                    <span className="font-semibold">{r.name}</span>
                    <span className="block text-xs text-muted">{r.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <p className="mt-1.5 text-xs font-semibold text-saffron-700">
              ✓ {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)} · {selected.tz_name}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          disabled={saving}
          className="w-full rounded-lg bg-saffron-600 py-3 font-bold text-white hover:bg-saffron-700 disabled:opacity-60"
        >
          {saving ? "Generating…" : "Generate Kundli"}
        </button>
      </form>
    </div>
  );
}
