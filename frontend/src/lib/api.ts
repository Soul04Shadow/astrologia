export interface NakshatraInfo {
  name: string;
  lord: string;
  pada: number;
  frac_elapsed?: number;
}

export interface PlanetPlacement {
  longitude: number;
  sign: string;
  sign_index: number;
  degree: string;
  house: number;
  sign_lord: string;
  retrograde: boolean;
  combust: boolean;
  dignity: string;
  nakshatra: NakshatraInfo;
}

export interface Chart {
  birth_details: {
    date: string;
    time: string;
    tz_name: string;
    utc_time: string;
    latitude: number;
    longitude: number;
    julian_day: number;
  };
  lagna: {
    sign: string;
    sanskrit: string;
    sign_index: number;
    degree: string;
    lord: string;
    nakshatra: NakshatraInfo;
  };
  moon_rashi: {
    sign: string;
    house: number;
    nakshatra: string;
    pada: number;
    nakshatra_lord: string;
  };
  planets: Record<string, PlanetPlacement>;
  dasha: {
    system: string;
    start_nakshatra: string;
    start_lord: string;
    balance_at_birth_years: number;
    current: {
      mahadasha: { lord: string; start_date: string; end_date: string } | null;
      antardasha: { lord: string; start_date: string; end_date: string } | null;
      next_antardasha: { lord: string; start_date: string } | null;
    };
    mahadashas: {
      lord: string;
      start_date: string;
      end_date: string;
      antardashas: { lord: string; start_date: string; end_date: string }[];
    }[];
  };
  panchang_today?: {
    date: string;
    tz_name: string;
    weekday: string;
    var_lord: string;
    tithi: { index: number; paksha: string; name: string };
    nakshatra: { name: string; lord: string };
    yoga: { index: number; name: string };
    karana: { index: number; name: string };
    sun_sign: string;
    moon_sign: string;
  };
  navamsa_d9: Record<string, { sign: string; sign_index: number; vargottama: boolean }>;
  yogas: { name: string; basis: string }[];
  transits_now?: {
    computed_at: string;
    positions: Record<
      string,
      {
        longitude: number;
        sign: string;
        degree: string;
        retrograde: boolean;
        dignity: string;
        nakshatra: string;
      }
    >;
  };
}

export interface Profile {
  id: number;
  name: string;
  birth_date: string;
  birth_time: string;
  place_name: string;
  latitude: number;
  longitude: number;
  tz_name: string;
  notes?: string | null;
  created_at: string;
}

export interface PlaceResult {
  display_name: string;
  name: string;
  latitude: number;
  longitude: number;
  tz_name: string;
}

export interface ChatMessageItem {
  id: number;
  role: string;
  content: string;
  provider?: string | null;
  language?: string | null;
  created_at: string;
  session_id?: number | null;
}

export interface ChatSession {
  id: number;
  profile_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ModelInfo {
  id: string;
  label: string;
  ctx: string;
  free: boolean;
  tools: boolean;
}

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  base: BASE,
  listProfiles: () => fetch(`${BASE}/api/profiles`).then((r) => jsonOrThrow<Profile[]>(r)),
  getProfile: (id: number | string) =>
    fetch(`${BASE}/api/profiles/${id}`).then((r) => jsonOrThrow<Profile>(r)),
  createProfile: (payload: Omit<Profile, "id" | "created_at">) =>
    fetch(`${BASE}/api/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => jsonOrThrow<Profile>(r)),
  deleteProfile: (id: number) =>
    fetch(`${BASE}/api/profiles/${id}`, { method: "DELETE" }).then((r) => r.json()),
  geocode: (q: string) =>
    fetch(`${BASE}/api/geocode?q=${encodeURIComponent(q)}`).then((r) =>
      jsonOrThrow<{ results: PlaceResult[] }>(r),
    ),
  getChart: (id: number | string) =>
    fetch(`${BASE}/api/charts/${id}`).then((r) =>
      jsonOrThrow<{ profile: { id: number; name: string }; chart: Chart }>(r),
    ),
  previewChart: (payload: Omit<Profile, "id" | "created_at"> & { name: string }) =>
    fetch(`${BASE}/api/charts/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => jsonOrThrow<{ name: string; chart: Chart }>(r)),
  history: (id: number | string) =>
    fetch(`${BASE}/api/profiles/${id}/messages`).then((r) => jsonOrThrow<ChatMessageItem[]>(r)),
  listSessions: (profileId: number | string) =>
    fetch(`${BASE}/api/profiles/${profileId}/sessions`).then((r) => jsonOrThrow<ChatSession[]>(r)),
  createSession: (profileId: number | string, title?: string) =>
    fetch(`${BASE}/api/profiles/${profileId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title ?? "New chat" }),
    }).then((r) => jsonOrThrow<ChatSession>(r)),
  renameSession: (profileId: number | string, sid: number | string, title: string) =>
    fetch(`${BASE}/api/profiles/${profileId}/sessions/${sid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then((r) => jsonOrThrow<ChatSession>(r)),
  deleteSession: (profileId: number | string, sid: number | string) =>
    fetch(`${BASE}/api/profiles/${profileId}/sessions/${sid}`, { method: "DELETE" }).then((r) => r.json()),
  sessionHistory: (profileId: number | string, sid: number | string) =>
    fetch(`${BASE}/api/profiles/${profileId}/sessions/${sid}/messages`).then((r) =>
      jsonOrThrow<ChatMessageItem[]>(r),
    ),
  translate: (text: string, target_language: string, provider?: string | null) =>
    fetch(`${BASE}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target_language, provider: provider ?? null }),
    }).then((r) => jsonOrThrow<{ translated: string }>(r)),
  listModels: (provider?: string) => {
    const url = provider ? `${BASE}/api/models?provider=${encodeURIComponent(provider)}` : `${BASE}/api/models`;
    return fetch(url).then((r) => jsonOrThrow<ModelInfo[]>(r));
  },
};
