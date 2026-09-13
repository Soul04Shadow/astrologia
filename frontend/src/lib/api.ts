import { memoryCache } from "@/lib/cache";

export interface NakshatraInfo {
  name: string;
  lord: string;
  pada: number;
  frac_elapsed?: number;
  sublord?: string;
}

export interface PlanetPlacement {
  longitude: number;
  sign: string;
  sign_index: number;
  degree: string;
  house: number;
  sign_lord: string;
  sublord?: string;
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
    sublord?: string;
    nakshatra: NakshatraInfo;
  };
  moon_rashi: {
    sign: string;
    house: number;
    nakshatra: string;
    pada: number;
    nakshatra_lord: string;
    sublord?: string;
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
  ashtakavarga?: {
    bav: Record<string, number[]>;
    sav_by_sign: Record<string, number>;
    sav_by_house: Record<number, number>;
    house_strengths: Record<number, { house: number; sign: string; points: number; status: string }>;
    total_bindus: number;
    average_per_house: number;
  };
  shadbala?: Record<
    string,
    {
      planet: string;
      sthana_bala: number;
      dig_bala: number;
      kaala_bala: number;
      cheshta_bala: number;
      naisargika_bala: number;
      drik_bala: number;
      total_virupas: number;
      total_rupas: number;
      required_rupas: number;
      strength_ratio: number;
      status: string;
    }
  >;
  vargas?: Record<
    string,
    {
      varga: string;
      description: string;
      lagna: { sign: string; sign_index: number; house: number };
      planets: Record<string, { sign: string; sign_index: number; house: number; vargottama: boolean }>;
    }
  >;
  sade_sati?: {
    saturn_current_sign: string;
    saturn_current_degree: string;
    saturn_is_retrograde: boolean;
    natal_moon_sign: string;
    is_sade_sati: boolean;
    sade_sati_phase?: string | null;
    is_kantaka_shani: boolean;
    is_ashtama_shani: boolean;
    summary: string;
  };
  guru_gochar?: {
    jupiter_current_sign: string;
    jupiter_current_degree: string;
    jupiter_is_retrograde: boolean;
    house_from_natal_moon: number;
    is_favorable_transit: boolean;
    summary: string;
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

async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    const { getSupabase, authEnabled } = await import("@/lib/auth");
    if (authEnabled) {
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(init.headers);
          headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        } else {
          console.warn("apiFetch: authEnabled is true but no access_token found in session for", url);
        }
      }
    }
  } catch (err) {
    console.warn("apiFetch: Failed to attach auth token:", err);
  }
  return fetch(url, init);
}

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
  listProfiles: async (forceRefresh: boolean = false): Promise<Profile[]> => {
    const key = "profiles:list";
    if (!forceRefresh) {
      const cached = memoryCache.get<Profile[]>(key);
      if (cached) return cached;
    }
    const data = await apiFetch(`${BASE}/api/profiles`).then((r) => jsonOrThrow<Profile[]>(r));
    memoryCache.set(key, data, 120);
    return data;
  },
  getProfile: async (id: number | string, forceRefresh: boolean = false): Promise<Profile> => {
    const key = `profile:${id}`;
    if (!forceRefresh) {
      const cached = memoryCache.get<Profile>(key);
      if (cached) return cached;
    }
    const data = await apiFetch(`${BASE}/api/profiles/${id}`).then((r) => jsonOrThrow<Profile>(r));
    memoryCache.set(key, data, 180);
    return data;
  },
  createProfile: async (payload: Omit<Profile, "id" | "created_at">): Promise<Profile> => {
    const data = await apiFetch(`${BASE}/api/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => jsonOrThrow<Profile>(r));
    memoryCache.delete("profiles:list");
    memoryCache.set(`profile:${data.id}`, data, 180);
    return data;
  },
  updateProfile: async (id: number | string, payload: Omit<Profile, "id" | "created_at">): Promise<Profile> => {
    const data = await apiFetch(`${BASE}/api/profiles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => jsonOrThrow<Profile>(r));
    memoryCache.delete("profiles:list");
    memoryCache.delete(`chart:${id}`);
    memoryCache.set(`profile:${id}`, data, 180);
    return data;
  },
  deleteProfile: async (id: number) => {
    const res = await apiFetch(`${BASE}/api/profiles/${id}`, { method: "DELETE" }).then((r) => r.json());
    memoryCache.delete("profiles:list");
    memoryCache.delete(`profile:${id}`);
    memoryCache.delete(`chart:${id}`);
    memoryCache.delete(`sessions:${id}`);
    return res;
  },
  geocode: (q: string) =>
    apiFetch(`${BASE}/api/geocode?q=${encodeURIComponent(q)}`).then((r) =>
      jsonOrThrow<{ results: PlaceResult[] }>(r),
    ),
  getChart: async (id: number | string, forceRefresh: boolean = false): Promise<{ profile: { id: number; name: string }; chart: Chart }> => {
    const key = `chart:${id}`;
    if (!forceRefresh) {
      const cached = memoryCache.get<{ profile: { id: number; name: string }; chart: Chart }>(key);
      if (cached) return cached;
    }
    const data = await apiFetch(`${BASE}/api/charts/${id}`).then((r) =>
      jsonOrThrow<{ profile: { id: number; name: string }; chart: Chart }>(r),
    );
    memoryCache.set(key, data, 600); // deterministic natal chart, cache for 10 min
    return data;
  },
  previewChart: (payload: Omit<Profile, "id" | "created_at"> & { name: string }) =>
    apiFetch(`${BASE}/api/charts/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => jsonOrThrow<{ name: string; chart: Chart }>(r)),
  history: (id: number | string) =>
    apiFetch(`${BASE}/api/profiles/${id}/messages`).then((r) => jsonOrThrow<ChatMessageItem[]>(r)),
  listSessions: (profileId: number | string) =>
    apiFetch(`${BASE}/api/profiles/${profileId}/sessions`).then((r) => jsonOrThrow<ChatSession[]>(r)),
  createSession: (profileId: number | string, title?: string) =>
    apiFetch(`${BASE}/api/profiles/${profileId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title ?? "New chat" }),
    }).then((r) => jsonOrThrow<ChatSession>(r)),
  renameSession: (profileId: number | string, sid: number | string, title: string) =>
    apiFetch(`${BASE}/api/profiles/${profileId}/sessions/${sid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then((r) => jsonOrThrow<ChatSession>(r)),
  deleteSession: (profileId: number | string, sid: number | string) =>
    apiFetch(`${BASE}/api/profiles/${profileId}/sessions/${sid}`, { method: "DELETE" }).then((r) => r.json()),
  sessionHistory: (profileId: number | string, sid: number | string) =>
    apiFetch(`${BASE}/api/profiles/${profileId}/sessions/${sid}/messages`).then((r) =>
      jsonOrThrow<ChatMessageItem[]>(r),
    ),
  translate: (text: string, target_language: string, provider?: string | null) =>
    apiFetch(`${BASE}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target_language, provider: provider ?? null }),
    }).then((r) => jsonOrThrow<{ translated: string }>(r)),
  listModels: async (provider?: string): Promise<ModelInfo[]> => {
    const key = `models:${provider ?? "all"}`;
    const cached = memoryCache.get<ModelInfo[]>(key);
    if (cached) return cached;
    const url = provider ? `${BASE}/api/models?provider=${encodeURIComponent(provider)}` : `${BASE}/api/models`;
    const data = await fetch(url).then((r) => jsonOrThrow<ModelInfo[]>(r));
    memoryCache.set(key, data, 300);
    return data;
  },
  getMe: () => apiFetch(`${BASE}/api/auth/me`).then((r) => jsonOrThrow<UserProfile>(r)),
  getAdminOverview: () => apiFetch(`${BASE}/api/admin/overview`).then((r) => jsonOrThrow<AdminOverview>(r)),
  listAllowedEmails: () => apiFetch(`${BASE}/api/admin/allowlist`).then((r) => jsonOrThrow<AllowedEmailItem[]>(r)),
  addAllowedEmail: (email: string, notes?: string) =>
    apiFetch(`${BASE}/api/admin/allowlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, notes }),
    }).then((r) => jsonOrThrow<AllowedEmailItem>(r)),
  removeAllowedEmail: (email: string) =>
    apiFetch(`${BASE}/api/admin/allowlist/${encodeURIComponent(email)}`, {
      method: "DELETE",
    }).then((r) => jsonOrThrow<{ deleted: boolean }>(r)),
  listAdminUsers: () => apiFetch(`${BASE}/api/admin/users`).then((r) => jsonOrThrow<AdminUserItem[]>(r)),
  getAdminSettings: () => apiFetch(`${BASE}/api/admin/settings`).then((r) => jsonOrThrow<AdminSettingsData>(r)),
  updateAdminSettings: (payload: {
    default_provider?: string;
    default_models?: Record<string, string>;
    disabled_providers?: string[];
  }) =>
    apiFetch(`${BASE}/api/admin/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => jsonOrThrow<{ saved: boolean }>(r)),
  getAdminPrompt: () => apiFetch(`${BASE}/api/admin/prompt`).then((r) => jsonOrThrow<AdminPromptData>(r)),
  updateAdminPrompt: (payload: { persona?: string; guidelines?: string; style?: string }) =>
    apiFetch(`${BASE}/api/admin/prompt`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => jsonOrThrow<{ saved: boolean }>(r)),
  resetAdminPrompt: () =>
    apiFetch(`${BASE}/api/admin/prompt/reset`, {
      method: "POST",
    }).then((r) => jsonOrThrow<{ reset: boolean }>(r)),
  pingProvider: (provider: string) =>
    apiFetch(`${BASE}/api/admin/ping-provider`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    }).then((r) =>
      jsonOrThrow<{ ok: boolean; latency_ms: number; status_code?: number; error?: string }>(r),
    ),
};

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  is_admin: boolean;
}

export interface AdminOverview {
  metrics: {
    total_users: number;
    total_allowed_testers: number;
    total_profiles: number;
    total_sessions: number;
    total_messages: number;
  };
  diagnostics: {
    database_type: string;
    swisseph_version: string;
    default_provider: string;
    server_time: string;
  };
}

export interface AllowedEmailItem {
  id: number;
  email: string;
  notes: string | null;
  added_by: string | null;
  created_at: string | null;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  is_admin: boolean;
  created_at: string | null;
  last_active: string | null;
  profiles_count: number;
  sessions_count: number;
  messages_count: number;
}

export interface AdminSettingsData {
  default_provider: string;
  disabled_providers: string[];
  default_models: Record<string, string>;
  providers: {
    id: string;
    name: string;
    ready: boolean;
    models: string[];
    base_url: string;
    default_model: string;
    enabled: boolean;
  }[];
}

export interface AdminPromptData {
  persona: string;
  guidelines: string;
  style: string;
  is_overridden: boolean;
  defaults: {
    persona: string;
    guidelines: string;
    style: string;
  };
}
