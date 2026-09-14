"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Eye,
  Key,
  Layers,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Wifi,
  X,
} from "lucide-react";
import {
  api,
  type AdminOverview,
  type AdminPromptData,
  type AdminSettingsData,
  type AdminUserItem,
  type AllowedEmailItem,
  type UserProfile,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth, authEnabled } from "@/lib/auth";
import { AppLoadingScreen } from "@/components/Skeletons";

type TabKey = "overview" | "allowlist" | "users" | "providers" | "prompt";

export default function AdminPage() {
  const { locale } = useI18n();
  const { session, loading: authLoading } = useAuth();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Data States
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [allowlist, setAllowlist] = useState<AllowedEmailItem[]>([]);
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [settingsData, setSettingsData] = useState<AdminSettingsData | null>(null);
  const [promptData, setPromptData] = useState<AdminPromptData | null>(null);

  // Form & Interaction States
  const [newEmail, setNewEmail] = useState("");
  const [newEmailNotes, setNewEmailNotes] = useState("");
  const [allowlistSearch, setAllowlistSearch] = useState("");
  const [usersSearch, setUsersSearch] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, { ok: boolean; latency: number; error?: string }>>({});
  const [pinging, setPinging] = useState<Record<string, boolean>>({});

  // Prompt Form State
  const [promptPersona, setPromptPersona] = useState("");
  const [promptGuidelines, setPromptGuidelines] = useState("");
  const [promptStyle, setPromptStyle] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Status & Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(message: string, type: "success" | "error" = "success") {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }

  const isAdmin = Boolean(currentUser?.is_admin);

  // Verify Admin Access with retry/session sync
  useEffect(() => {
    if (authEnabled && authLoading) return;

    api
      .getMe()
      .then((me) => {
        setCurrentUser(me);
        setAuthChecked(true);
      })
      .catch((err) => {
        console.warn("AdminPage: getMe check failed:", err);
        setAuthChecked(true);
      });
  }, [authLoading, session]);

  // Fetch Tab Data
  useEffect(() => {
    if (!isAdmin) return;

    if (activeTab === "overview") {
      api.getAdminOverview().then(setOverview).catch((e) => notify(String(e), "error"));
    } else if (activeTab === "allowlist") {
      api.listAllowedEmails().then(setAllowlist).catch((e) => notify(String(e), "error"));
    } else if (activeTab === "users") {
      api.listAdminUsers().then(setUsersList).catch((e) => notify(String(e), "error"));
    } else if (activeTab === "providers") {
      api.getAdminSettings().then(setSettingsData).catch((e) => notify(String(e), "error"));
    } else if (activeTab === "prompt") {
      api.getAdminPrompt().then((data) => {
        setPromptData(data);
        setPromptPersona(data.persona);
        setPromptGuidelines(data.guidelines);
        setPromptStyle(data.style);
      }).catch((e) => notify(String(e), "error"));
    }
  }, [isAdmin, activeTab]);

  if (authEnabled && authLoading) {
    return <AppLoadingScreen message="Verifying administrative credentials..." />;
  }

  if (!authChecked) {
    return <AppLoadingScreen message="Verifying administrative credentials..." />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 border border-red-200">
          <ShieldAlert size={32} />
        </div>
        <h1 className="font-serif text-2xl font-bold text-ink">Access Restricted</h1>
        <p className="mt-2 text-sm text-stone-600">
          This portal requires administrator authorization. Your account (
          <span className="font-semibold text-ink">{currentUser?.email || session?.user?.email || "Guest"}</span>) is not listed in the
          system administrator directory.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-saffron-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-saffron-500 transition"
        >
          <ArrowLeft size={16} />
          <span>Return to Horoscopes</span>
        </Link>
      </div>
    );
  }

  // Handle Add to Allowlist
  async function handleAddAllowlist(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      const added = await api.addAllowedEmail(newEmail.trim(), newEmailNotes.trim() || undefined);
      setAllowlist((prev) => [added, ...prev.filter((x) => x.email !== added.email)]);
      setNewEmail("");
      setNewEmailNotes("");
      notify(`Successfully added ${added.email} to the beta allowlist.`);
    } catch (err: any) {
      notify(err.message || "Failed to add email", "error");
    }
  }

  // Handle Remove from Allowlist
  async function handleRemoveAllowlist(email: string) {
    if (!window.confirm(`Are you sure you want to revoke beta access for ${email}?`)) return;
    try {
      await api.removeAllowedEmail(email);
      setAllowlist((prev) => prev.filter((x) => x.email !== email));
      notify(`Removed ${email} from allowlist.`);
    } catch (err: any) {
      notify(err.message || "Failed to remove email", "error");
    }
  }

  // Handle Save Provider Settings
  async function handleSaveSettings() {
    if (!settingsData) return;
    setSavingSettings(true);
    try {
      await api.updateAdminSettings({
        default_provider: settingsData.default_provider,
        disabled_providers: settingsData.disabled_providers,
        default_models: settingsData.default_models,
      });
      notify("Provider orchestration settings updated successfully.");
    } catch (err: any) {
      notify(err.message || "Failed to save settings", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  // Handle Ping Provider
  async function handlePing(providerId: string) {
    setPinging((prev) => ({ ...prev, [providerId]: true }));
    try {
      const res = await api.pingProvider(providerId);
      setPingResults((prev) => ({
        ...prev,
        [providerId]: { ok: res.ok, latency: res.latency_ms, error: res.error },
      }));
    } catch (err: any) {
      setPingResults((prev) => ({
        ...prev,
        [providerId]: { ok: false, latency: 0, error: err.message },
      }));
    } finally {
      setPinging((prev) => ({ ...prev, [providerId]: false }));
    }
  }

  // Handle Save Prompt
  async function handleSavePrompt() {
    setSavingPrompt(true);
    try {
      await api.updateAdminPrompt({
        persona: promptPersona,
        guidelines: promptGuidelines,
        style: promptStyle,
      });
      setPromptData((prev) => (prev ? { ...prev, is_overridden: true } : null));
      notify("Astrological prompt architecture saved successfully.");
    } catch (err: any) {
      notify(err.message || "Failed to save prompt", "error");
    } finally {
      setSavingPrompt(false);
    }
  }

  // Handle Reset Prompt to Default
  async function handleResetPrompt() {
    if (!window.confirm("Are you sure you want to restore original classical Jyotish prompt guidelines?")) return;
    setSavingPrompt(true);
    try {
      await api.resetAdminPrompt();
      const fresh = await api.getAdminPrompt();
      setPromptData(fresh);
      setPromptPersona(fresh.persona);
      setPromptGuidelines(fresh.guidelines);
      setPromptStyle(fresh.style);
      notify("Restored system default classical prompt guidelines.");
    } catch (err: any) {
      notify(err.message || "Failed to reset prompt", "error");
    } finally {
      setSavingPrompt(false);
    }
  }

  const filteredAllowlist = allowlist.filter(
    (it) =>
      it.email.toLowerCase().includes(allowlistSearch.toLowerCase()) ||
      (it.notes && it.notes.toLowerCase().includes(allowlistSearch.toLowerCase())),
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(usersSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(usersSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-800 text-amber-200 border border-goldline/60 shadow-2xs">
              <ShieldCheck size={16} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-saffron-800">
              Administrative Console
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl mt-1">
            Astrologia Admin & Governance
          </h1>
          <p className="mt-1 text-xs text-stone-600 sm:text-sm">
            Manage beta testing access, system telemetry, provider orchestration, and astrological engine prompts.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="rounded-xl border border-goldline/70 bg-cream/70 px-3.5 py-2 text-right">
            <p className="text-[11px] font-semibold text-stone-500">Signed In As</p>
            <p className="font-serif text-xs font-bold text-ink">{currentUser?.email || session?.user?.email || "Admin"}</p>
          </div>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm font-semibold shadow-xs ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-1 border-b border-goldline/70 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shrink-0 ${
            activeTab === "overview"
              ? "bg-saffron-800 text-white shadow-2xs"
              : "text-stone-600 hover:bg-saffron-100 hover:text-saffron-900"
          }`}
        >
          <Activity size={16} />
          <span>System Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("allowlist")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shrink-0 ${
            activeTab === "allowlist"
              ? "bg-saffron-800 text-white shadow-2xs"
              : "text-stone-600 hover:bg-saffron-100 hover:text-saffron-900"
          }`}
        >
          <UserCheck size={16} />
          <span>Beta Testers ({allowlist.length || overview?.metrics.total_allowed_testers || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shrink-0 ${
            activeTab === "users"
              ? "bg-saffron-800 text-white shadow-2xs"
              : "text-stone-600 hover:bg-saffron-100 hover:text-saffron-900"
          }`}
        >
          <Users size={16} />
          <span>User Telemetry ({usersList.length || overview?.metrics.total_users || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("providers")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shrink-0 ${
            activeTab === "providers"
              ? "bg-saffron-800 text-white shadow-2xs"
              : "text-stone-600 hover:bg-saffron-100 hover:text-saffron-900"
          }`}
        >
          <Bot size={16} />
          <span>AI Providers & Models</span>
        </button>

        <button
          onClick={() => setActiveTab("prompt")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shrink-0 ${
            activeTab === "prompt"
              ? "bg-saffron-800 text-white shadow-2xs"
              : "text-stone-600 hover:bg-saffron-100 hover:text-saffron-900"
          }`}
        >
          <Cpu size={16} />
          <span>Prompt Calibration</span>
        </button>
      </div>

      {/* TAB 1: SYSTEM OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metric Stat Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Registered Users</span>
              <p className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
                {overview?.metrics.total_users ?? "—"}
              </p>
              <span className="mt-1 block text-[11px] font-medium text-stone-500">Authenticated accounts</span>
            </div>

            <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Beta Allowlist</span>
              <p className="mt-2 font-serif text-2xl font-bold text-saffron-800 sm:text-3xl">
                {overview?.metrics.total_allowed_testers ?? "—"}
              </p>
              <span className="mt-1 block text-[11px] font-medium text-stone-500">Authorized testers</span>
            </div>

            <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Kundlis Stored</span>
              <p className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
                {overview?.metrics.total_profiles ?? "—"}
              </p>
              <span className="mt-1 block text-[11px] font-medium text-stone-500">Birth dossiers</span>
            </div>

            <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Consultations</span>
              <p className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
                {overview?.metrics.total_sessions ?? "—"}
              </p>
              <span className="mt-1 block text-[11px] font-medium text-stone-500">Active dialogue sessions</span>
            </div>

            <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-4 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Total Messages</span>
              <p className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
                {overview?.metrics.total_messages ?? "—"}
              </p>
              <span className="mt-1 block text-[11px] font-medium text-stone-500">Exchanges recorded</span>
            </div>
          </div>

          {/* Engine & Diagnostics Strip */}
          <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-6 shadow-xs">
            <h2 className="font-serif text-base font-bold text-ink sm:text-lg mb-4 flex items-center gap-2">
              <Server size={18} className="text-saffron-800" />
              <span>Astrological Engine & Infrastructure Health</span>
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-goldline/60 bg-cream/50 p-3.5">
                <p className="text-[11px] font-bold uppercase text-stone-500">Database Engine</p>
                <div className="mt-1 flex items-center gap-2">
                  <Database size={16} className="text-stone-700" />
                  <span className="font-mono text-sm font-bold text-ink">
                    {overview?.diagnostics.database_type ?? "SQLite"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-goldline/60 bg-cream/50 p-3.5">
                <p className="text-[11px] font-bold uppercase text-stone-500">Swiss Ephemeris</p>
                <div className="mt-1 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span className="font-mono text-sm font-bold text-ink">
                    v{overview?.diagnostics.swisseph_version ?? "2.10"} (Active)
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-goldline/60 bg-cream/50 p-3.5">
                <p className="text-[11px] font-bold uppercase text-stone-500">Default LLM Provider</p>
                <div className="mt-1 flex items-center gap-2">
                  <Bot size={16} className="text-saffron-800" />
                  <span className="font-mono text-sm font-bold text-ink uppercase">
                    {overview?.diagnostics.default_provider ?? "cliproxy"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-goldline/60 bg-cream/50 p-3.5">
                <p className="text-[11px] font-bold uppercase text-stone-500">Server UTC Time</p>
                <div className="mt-1 flex items-center gap-2">
                  <Clock size={16} className="text-stone-700" />
                  <span className="font-mono text-xs font-bold text-ink">
                    {overview?.diagnostics.server_time ? overview.diagnostics.server_time.slice(0, 19).replace("T", " ") : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BETA ALLOWLIST */}
      {activeTab === "allowlist" && (
        <div className="space-y-6">
          {/* Add Tester Form Card */}
          <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-6 shadow-xs">
            <h2 className="font-serif text-base font-bold text-ink sm:text-lg mb-1 flex items-center gap-2">
              <UserCheck size={18} className="text-saffron-800" />
              <span>Authorize New Beta Tester</span>
            </h2>
            <p className="text-xs text-stone-600 mb-4">
              Add user email addresses to grant immediate login access to Astrologia without editing backend environment files.
            </p>

            <form onSubmit={handleAddAllowlist} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="tester@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 rounded-xl border border-goldline bg-panel px-4 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:border-saffron-700 focus:outline-hidden"
              />
              <input
                type="text"
                placeholder="Notes / Name (e.g. VIP Jyotishi Tester)"
                value={newEmailNotes}
                onChange={(e) => setNewEmailNotes(e.target.value)}
                className="flex-1 rounded-xl border border-goldline bg-panel px-4 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:border-saffron-700 focus:outline-hidden"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-saffron-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-saffron-500 transition active:scale-95"
              >
                <Plus size={16} />
                <span>Add Tester</span>
              </button>
            </form>
          </div>

          {/* Search & Allowlist Table */}
          <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <h3 className="font-serif text-base font-bold text-ink">Active Allowlisted Testers ({allowlist.length})</h3>
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={allowlistSearch}
                  onChange={(e) => setAllowlistSearch(e.target.value)}
                  className="w-full rounded-xl border border-goldline bg-panel pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-stone-400 focus:border-saffron-700 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink">
                <thead className="border-b border-goldline/60 text-stone-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Tester Email</th>
                    <th className="py-2.5 px-3">Notes / Label</th>
                    <th className="py-2.5 px-3">Authorized By</th>
                    <th className="py-2.5 px-3">Date Added</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-goldline/40">
                  {filteredAllowlist.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-500">
                        No tester emails match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredAllowlist.map((item) => (
                      <tr key={item.id} className="hover:bg-cream/40 transition">
                        <td className="py-3 px-3 font-semibold text-ink">{item.email}</td>
                        <td className="py-3 px-3 text-stone-600">{item.notes || "—"}</td>
                        <td className="py-3 px-3 text-stone-500 font-mono text-[11px]">{item.added_by || "system"}</td>
                        <td className="py-3 px-3 text-stone-500">{item.created_at ? item.created_at.slice(0, 10) : "—"}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleRemoveAllowlist(item.email)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                            title="Revoke access"
                          >
                            <Trash2 size={13} />
                            <span>Revoke</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER TELEMETRY */}
      {activeTab === "users" && (
        <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-base font-bold text-ink sm:text-lg">User Activity & Kundli Metrics</h2>
              <p className="text-xs text-stone-600">
                Lightweight metrics per user profile: created charts, consultation sessions, and activity timestamps.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                className="w-full rounded-xl border border-goldline bg-panel pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-stone-400 focus:border-saffron-700 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink">
              <thead className="border-b border-goldline/60 text-stone-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Charts Created</th>
                  <th className="py-2.5 px-3">Consultations</th>
                  <th className="py-2.5 px-3">Messages</th>
                  <th className="py-2.5 px-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-goldline/40">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-stone-500">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-cream/40 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-800 font-serif text-xs font-bold text-amber-100 shadow-2xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-ink leading-tight">{u.name || "Anonymous Native"}</p>
                            <p className="text-[11px] text-stone-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {u.is_admin ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-saffron-100 px-2 py-0.5 text-[11px] font-bold text-saffron-900 border border-gold/40">
                            <ShieldCheck size={11} /> Admin
                          </span>
                        ) : (
                          <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                            Beta Tester
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold">{u.profiles_count}</td>
                      <td className="py-3 px-3 font-semibold">{u.sessions_count}</td>
                      <td className="py-3 px-3 font-semibold">{u.messages_count}</td>
                      <td className="py-3 px-3 text-stone-500 font-mono text-[11px]">
                        {u.last_active ? u.last_active.slice(0, 16).replace("T", " ") : "Never"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AI PROVIDERS & MODELS */}
      {activeTab === "providers" && settingsData && (
        <div className="space-y-6">
          {/* Global Default Provider Settings Card */}
          <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-base font-bold text-ink sm:text-lg">System-Wide Default LLM Provider</h2>
              <p className="text-xs text-stone-600">
                Choose the default provider used when creating new consultation sessions.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={settingsData.default_provider}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, default_provider: e.target.value })
                }
                className="rounded-xl border border-goldline bg-panel px-3 py-2 text-xs font-bold text-ink focus:border-saffron-700 focus:outline-hidden"
              >
                {settingsData.providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.ready ? "Configured" : "No Key"})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-saffron-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-saffron-500 transition disabled:opacity-50"
              >
                <Save size={14} />
                <span>{savingSettings ? "Saving..." : "Save Default"}</span>
              </button>
            </div>
          </div>

          {/* Provider Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {settingsData.providers.map((p) => {
              const ping = pingResults[p.id];
              const isPinging = pinging[p.id];

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border-2 border-goldline/70 bg-panel p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-800 text-amber-200 border border-goldline/60 shadow-2xs font-bold text-xs">
                          {p.id.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-ink text-sm">{p.name}</h3>
                          <span className="font-mono text-[10px] text-stone-500">{p.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {p.ready ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                            <Key size={11} /> Missing Key
                          </span>
                        )}

                        <label className="relative inline-flex items-center cursor-pointer ml-2" title="Toggle provider availability for regular users">
                          <input
                            type="checkbox"
                            checked={p.enabled}
                            onChange={(e) => {
                              const nextDisabled = e.target.checked
                                ? settingsData.disabled_providers.filter((id) => id !== p.id)
                                : [...settingsData.disabled_providers, p.id];
                              setSettingsData({
                                ...settingsData,
                                disabled_providers: nextDisabled,
                                providers: settingsData.providers.map((pr) =>
                                  pr.id === p.id ? { ...pr, enabled: e.target.checked } : pr,
                                ),
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-saffron-700"></div>
                        </label>
                      </div>
                    </div>

                    {/* Base URL and Details */}
                    <div className="mt-4 space-y-1.5 border-t border-goldline/50 pt-3 text-xs">
                      <div className="flex items-center justify-between text-stone-600">
                        <span className="font-medium">Endpoint URL:</span>
                        <span className="font-mono text-[11px] truncate max-w-[200px]" title={p.base_url}>
                          {p.base_url || "Built-in / Default"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-stone-600">
                        <span className="font-medium">Active Default Model:</span>
                        <span className="font-mono text-[11px] font-semibold text-ink">
                          {p.default_model || "Standard"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ping Diagnostic & Action */}
                  <div className="mt-4 pt-3 border-t border-goldline/50 flex items-center justify-between">
                    <button
                      onClick={() => handlePing(p.id)}
                      disabled={isPinging}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-goldline px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-cream transition disabled:opacity-50"
                    >
                      <Wifi size={13} className={isPinging ? "animate-pulse text-saffron-700" : ""} />
                      <span>{isPinging ? "Testing..." : "Ping Endpoint"}</span>
                    </button>

                    {ping && (
                      <span
                        className={`text-[11px] font-mono font-semibold ${
                          ping.ok ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {ping.ok ? `Online (${ping.latency}ms)` : `Error: ${ping.error?.slice(0, 30)}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: ASTROLOGICAL PROMPT CALIBRATION */}
      {activeTab === "prompt" && promptData && (
        <div className="rounded-2xl border-2 border-goldline/70 bg-panel p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-goldline/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-ink">Astrological Prompt Architecture</h2>
                {promptData.is_overridden ? (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                    Custom Tuning Active
                  </span>
                ) : (
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                    Default Classical Guidelines
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-600">
                Calibrate the Vedic Astrologer persona, ground truth rules (maraka, ayur, gochar, dasha), and consultation voice.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetPrompt}
                disabled={savingPrompt || !promptData.is_overridden}
                className="inline-flex items-center gap-1.5 rounded-xl border border-goldline px-3 py-2 text-xs font-bold text-stone-700 hover:bg-cream transition disabled:opacity-40"
                title="Revert to classical defaults"
              >
                <RotateCcw size={14} />
                <span>Reset to Default</span>
              </button>

              <button
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                className="inline-flex items-center gap-1.5 rounded-xl bg-saffron-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-saffron-500 transition disabled:opacity-50"
              >
                <Save size={14} />
                <span>{savingPrompt ? "Saving..." : "Save Active Prompt"}</span>
              </button>
            </div>
          </div>

          {/* Persona Editor */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-saffron-900">
              1. Astrologer Persona (Jyotishi Identity)
            </label>
            <p className="text-[11px] text-stone-500">Defines who the AI represents during the chart reading.</p>
            <textarea
              rows={3}
              value={promptPersona}
              onChange={(e) => setPromptPersona(e.target.value)}
              className="w-full rounded-xl border border-goldline bg-panel p-3 text-xs font-mono text-ink focus:border-saffron-700 focus:outline-hidden"
            />
          </div>

          {/* Classical Jyotish Guidelines Editor */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-saffron-900">
              2. Jyotish Engine Guidelines & Ground Truth Rules
            </label>
            <p className="text-[11px] text-stone-500">
              Deterministic calculations, maraka/ayur ethical protocol, dasha dates, and divisional chart rules.
            </p>
            <textarea
              rows={8}
              value={promptGuidelines}
              onChange={(e) => setPromptGuidelines(e.target.value)}
              className="w-full rounded-xl border border-goldline bg-panel p-3 text-xs font-mono text-ink focus:border-saffron-700 focus:outline-hidden"
            />
          </div>

          {/* Consultation Style Editor */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-saffron-900">
              3. Consultation Style & Voice
            </label>
            <p className="text-[11px] text-stone-500">
              Tone, warm inquiry, avoiding fatalism, and structuring answers for user clarity.
            </p>
            <textarea
              rows={5}
              value={promptStyle}
              onChange={(e) => setPromptStyle(e.target.value)}
              className="w-full rounded-xl border border-goldline bg-panel p-3 text-xs font-mono text-ink focus:border-saffron-700 focus:outline-hidden"
            />
          </div>

          {/* Collapsible Live Preview */}
          <div className="border-t border-goldline/60 pt-4">
            <button
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-saffron-800 hover:text-saffron-900 transition"
            >
              <Eye size={14} />
              <span>{showPromptPreview ? "Hide Rendered System Prompt Preview" : "Preview Rendered System Prompt"}</span>
            </button>

            {showPromptPreview && (
              <div className="mt-3 rounded-xl border border-goldline/80 bg-cream/70 p-4 font-mono text-[11px] leading-relaxed text-stone-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {`${promptPersona}\n\nIf a calculation at another date or divisional chart would help, call a tool first, then answer. Think step-by-step before answering.\n\nToday's real-world date/time is 2026-09-14 01:45 UTC.\n\n[LANGUAGE DIRECTIVE]\n\n${promptGuidelines}\n\n${promptStyle}\n\n[DETERMINISTIC GROUND TRUTH NATAL DATA ATTACHED HERE AT RUNTIME]`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
