"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, MapPin, UserRound } from "lucide-react";
import { api, type PlaceResult, type Profile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import BirthDateTimePicker from "@/components/BirthDateTimePicker";

interface ProfileFormProps {
  mode: "create" | "edit";
  profileId?: number | string;
  initialData?: Partial<Profile>;
  onSuccess?: (profile: Profile) => void;
}

export default function ProfileForm({
  mode,
  profileId,
  initialData,
  onSuccess,
}: ProfileFormProps) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [name, setName] = useState(initialData?.name ?? "");
  const [birthDate, setBirthDate] = useState(initialData?.birth_date ?? "1995-01-01");
  const [birthTime, setBirthTime] = useState(initialData?.birth_time ?? "08:00");
  const [placeQuery, setPlaceQuery] = useState(initialData?.place_name ?? "");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<PlaceResult | null>(
    initialData?.latitude && initialData?.longitude && initialData?.tz_name
      ? {
          display_name: initialData.place_name ?? "",
          name: initialData.place_name ?? "",
          latitude: initialData.latitude,
          longitude: initialData.longitude,
          tz_name: initialData.tz_name,
        }
      : null
  );
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const hasSyncedInitialRef = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initialData if loaded asynchronously (only once upon initial load)
  useEffect(() => {
    if (initialData && !hasSyncedInitialRef.current) {
      hasSyncedInitialRef.current = true;
      if (initialData.name) setName(initialData.name);
      if (initialData.birth_date) setBirthDate(initialData.birth_date);
      if (initialData.birth_time) setBirthTime(initialData.birth_time);
      if (initialData.place_name) setPlaceQuery(initialData.place_name);
      if (initialData.latitude && initialData.longitude && initialData.tz_name) {
        setSelected({
          display_name: initialData.place_name ?? "",
          name: initialData.place_name ?? "",
          latitude: initialData.latitude,
          longitude: initialData.longitude,
          tz_name: initialData.tz_name,
        });
      }
    }
  }, [initialData]);

  // Geocode autosuggest
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
    if (!res.ok) throw new Error(t("form.notfound", { q: placeQuery }));
    const direct = await res.json();
    return {
      display_name: placeQuery,
      name: placeQuery,
      latitude: direct.latitude,
      longitude: direct.longitude,
      tz_name: direct.tz_name,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const chosen = await resolvePlace();
      const payload = {
        name: name.trim(),
        birth_date: birthDate,
        birth_time: birthTime,
        place_name: chosen.display_name,
        latitude: chosen.latitude,
        longitude: chosen.longitude,
        tz_name: chosen.tz_name,
      };

      let resultProfile: Profile;
      if (mode === "edit" && profileId) {
        resultProfile = await api.updateProfile(profileId, payload);
      } else {
        resultProfile = await api.createProfile(payload);
      }

      if (onSuccess) {
        onSuccess(resultProfile);
      } else {
        router.push(`/profiles/${resultProfile.id}`);
      }
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-goldline bg-panel px-3 py-2.5 text-sm outline-none transition focus:border-saffron-600 focus:ring-2 focus:ring-saffron-100";
  const labelCls = "mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-saffron-700";

  const isEdit = mode === "edit";

  return (
    <div className="mx-auto max-w-xl">
      {/* Top Header with Back Navigation */}
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-saffron-800 hover:bg-saffron-100 transition"
        >
          <ArrowLeft size={15} />
          {locale === "hi" ? "वापस जाएँ" : "Back"}
        </button>
        <span className="text-xs font-bold text-stone-500">
          {isEdit ? (locale === "hi" ? "विवरण संशोधन" : "Edit Profile") : (locale === "hi" ? "नया जातक" : "New Profile")}
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold">
          {isEdit
            ? locale === "hi" ? "जन्म विवरण संशोधित करें" : "Edit Birth Details"
            : t("form.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {isEdit
            ? locale === "hi" ? "विवरण सही करें — कुंडली व दशा तत्काल पुनर्परिकलित होंगी।" : "Update details — chart & dashas will recalculate automatically."
            : t("form.sub")}
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5">
        {/* Name input */}
        <div>
          <label className={labelCls}>
            <UserRound size={14} />
            {t("form.name")}
          </label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("form.name_ph")}
            required
            minLength={1}
          />
        </div>

        {/* Date & Time Picker */}
        <BirthDateTimePicker
          dateValue={birthDate}
          timeValue={birthTime}
          onDateChange={setBirthDate}
          onTimeChange={setBirthTime}
        />

        {/* Place of Birth */}
        <div className="relative">
          <label className={labelCls}>
            <MapPin size={14} />
            {t("form.place")}
          </label>
          <input
            className={inputCls}
            value={placeQuery}
            onChange={(e) => {
              setPlaceQuery(e.target.value);
              setSelected(null);
            }}
            placeholder={t("form.place_ph")}
            required
          />
          {searching && (
            <span className="absolute right-3 top-9 text-xs text-stone-500">{t("form.searching")}</span>
          )}
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-goldline bg-panel shadow-xl">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-saffron-100 transition"
                    onClick={() => {
                      setSelected(r);
                      setPlaceQuery(r.display_name);
                      setResults([]);
                    }}
                  >
                    <span className="font-semibold text-ink">{r.name}</span>
                    <span className="block truncate text-xs text-stone-500">{r.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-goldline bg-panel/60 p-2 text-xs font-semibold text-saffron-800">
              <Check size={14} className="text-saffron-600 shrink-0" />
              <span className="truncate">
                {t("form.selected")} · {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)} · {selected.tz_name}
              </span>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          {isEdit && (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-lg border border-goldline py-3 text-sm font-bold text-stone-700 hover:bg-saffron-100 transition"
            >
              {locale === "hi" ? "रद्द करें" : "Cancel"}
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-saffron-600 py-3 text-sm font-bold text-white shadow-md hover:bg-saffron-500 disabled:opacity-60 transition"
          >
            {saving
              ? t("form.submitting")
              : isEdit
              ? locale === "hi" ? "परिवर्तन सहेजें" : "Save Changes"
              : t("form.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
