"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Circle,
  Languages,
  LogOut,
  Menu,
  MessageSquare,
  MessageSquareQuote,
  Pencil,
  PlusCircle,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth, authEnabled } from "@/lib/auth";
import { api, UserProfile } from "@/lib/api";
import { AppLoadingScreen } from "@/components/Skeletons";
import MobileBottomNav from "@/components/MobileBottomNav";

interface ProviderInfo {
  id: string;
  ready: boolean;
}

interface ActiveProfile {
  id: string;
  name: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { session, loading: authLoading, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const checkUserAccess = useCallback(async () => {
    if (!authEnabled) return;
    if (!session) {
      setUserProfile(null);
      setAccessDenied(false);
      return;
    }
    setCheckingAccess(true);
    try {
      const me = await api.getMe();
      setUserProfile(me);
      setAccessDenied(false);
    } catch (err: unknown) {
      const errStr = String(err);
      const isForbidden = (err as { status?: number })?.status === 403 || errStr.includes("403") || errStr.toLowerCase().includes("allowlist");
      if (isForbidden) {
        setAccessDenied(true);
        setUserProfile(null);
      }
    } finally {
      setCheckingAccess(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authEnabled) {
      api.getMe().then(setUserProfile).catch(() => {});
      return;
    }
    if (session) {
      checkUserAccess();
    } else if (!authLoading && !session) {
      setUserProfile(null);
      setAccessDenied(false);
    }
  }, [session, authLoading, checkUserAccess]);

  const isAdmin = Boolean(userProfile?.is_admin);

  // Sync active profile from pathname, localStorage, or custom events
  useEffect(() => {
    function loadSavedProfile() {
      const savedId = localStorage.getItem("active-profile-id");
      const savedName = localStorage.getItem("active-profile-name");
      if (savedId && savedName) {
        setActiveProfile({ id: savedId, name: savedName });
      }
    }

    const profileMatch = pathname.match(/^\/(?:profiles|chat)\/([0-9]+)/);
    const idFromPath = profileMatch ? profileMatch[1] : null;

    if (idFromPath) {
      const savedId = localStorage.getItem("active-profile-id");
      const savedName = localStorage.getItem("active-profile-name");
      if (savedId === idFromPath && savedName) {
        setActiveProfile({ id: idFromPath, name: savedName });
      } else {
        // Fetch profile to resolve name
        fetch(`${API_BASE}/api/profiles/${idFromPath}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.name) {
              localStorage.setItem("active-profile-id", idFromPath);
              localStorage.setItem("active-profile-name", data.name);
              setActiveProfile({ id: idFromPath, name: data.name });
            }
          })
          .catch(() => {});
      }
    } else {
      loadSavedProfile();
    }

    function handleProfileChange() {
      loadSavedProfile();
    }

    window.addEventListener("active-profile-changed", handleProfileChange);
    return () => window.removeEventListener("active-profile-changed", handleProfileChange);
  }, [pathname]);

  useEffect(() => {
    if (authEnabled && !authLoading) {
      if (!session && pathname !== "/login") {
        router.replace("/login");
      } else if (session && pathname === "/login") {
        router.replace("/");
      }
    }
  }, [session, authLoading, pathname, router]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/providers`)
      .then((r) => r.json())
      .then((d) => setProviders(d.providers ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }

  const readyCount = providers.filter((p) => p.ready).length;

  const isSubpage = pathname !== "/" && pathname !== "/login";
  let pageTitle = "";
  if (pathname === "/") pageTitle = locale === "hi" ? "जातक पत्रिकाएँ" : "Horoscopes";
  else if (pathname === "/admin") pageTitle = locale === "hi" ? "प्रशासक नियंत्रण" : "Admin Dashboard";
  else if (pathname === "/profiles/new") pageTitle = locale === "hi" ? "नई कुंडली" : "New Kundli";
  else if (pathname.includes("/edit")) pageTitle = locale === "hi" ? "संशोधन" : "Edit Profile";
  else if (pathname.startsWith("/chat/")) pageTitle = locale === "hi" ? "दैवज्ञ परामर्श" : "Consultation";
  else if (pathname.startsWith("/profiles/")) pageTitle = locale === "hi" ? "जन्म कुंडली" : "Kundli Chart";

  if (authEnabled && authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <AppLoadingScreen
          message={
            locale === "hi"
              ? "प्रामाणिक ग्रह गणना लोड हो रही है..."
              : "Authenticating celestial coordinates..."
          }
        />
      </div>
    );
  }

  if (pathname === "/login") {
    return (
      <div className="min-h-screen bg-cream">
        <header className="flex items-center justify-end px-6 py-4">
          <button
            onClick={() => setLocale(locale === "en" ? "hi" : "en")}
            className="flex items-center gap-1.5 rounded-lg border border-goldline bg-panel px-3 py-1.5 text-xs font-bold text-saffron-800 shadow-sm hover:bg-saffron-100"
            aria-label="Switch language / भाषा बदलें"
            title="EN ↔ हिंदी"
          >
            <Languages size={15} />
            {locale === "en" ? "हिंदी" : "English"}
          </button>
        </header>
        <main className="px-4">{children}</main>
      </div>
    );
  }

  if (authEnabled && !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-saffron-600 text-3xl font-bold text-white shadow-md">
          ॐ
        </div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-saffron-800">
          {locale === "hi" ? "लॉगिन पृष्ठ पर ले जाया जा रहा है..." : "Redirecting to login..."}
        </p>
      </div>
    );
  }

  if (authEnabled && session && accessDenied && pathname !== "/login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-goldline bg-panel p-7 sm:p-9 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-700 shadow-2xs">
            <ShieldAlert size={32} />
          </div>
          <span className="inline-block rounded-full border border-goldline bg-saffron-50 px-3 py-1 text-xs font-bold text-saffron-800">
            {locale === "hi" ? "निजी बीटा आमंत्रण आवश्यक" : "Private Beta Access Restricted"}
          </span>
          <h2 className="mt-4 font-serif text-xl font-bold text-saffron-900">
            {locale === "hi" ? "प्रवेश अस्वीकृत" : "Access Restricted"}
          </h2>
          <p className="mt-2 text-xs text-stone-600 leading-relaxed">
            {locale === "hi"
              ? "एस्ट्रोलॉजिया वर्तमान में केवल सीमित आमंत्रित बीटा परीक्षकों के लिए ही उपलब्ध है। आपका खाता सत्यापित हो चुका है, परंतु वर्तमान में अनुमोदित सूची में नहीं है।"
              : "Astrologia is currently running in private beta. Your account is authenticated, but your email has not yet been approved on the private beta allowlist."}
          </p>

          <div className="mt-4 rounded-xl border border-goldline/70 bg-cream/70 px-3 py-2 text-xs font-semibold text-saffron-900 break-all">
            {session.user?.email || "Authenticated User"}
          </div>

          <p className="mt-3 text-[11px] text-stone-500">
            {locale === "hi"
              ? "यदि आप प्रारंभिक परीक्षक बनना चाहते हैं, तो कृपया ईमेल सूची में जोड़ने हेतु व्यवस्थापक से संपर्क करें।"
              : "To request early access or get allowlisted, please reach out to the platform administrator."}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button
              onClick={() => checkUserAccess()}
              disabled={checkingAccess}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-goldline bg-panel px-4 py-2.5 text-xs font-bold text-saffron-800 shadow-2xs hover:bg-saffron-100 transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={checkingAccess ? "animate-spin" : ""} />
              {checkingAccess
                ? (locale === "hi" ? "जाँच हो रही है..." : "Checking...")
                : (locale === "hi" ? "पुनः प्रयास करें" : "Re-check Access")}
            </button>
            <button
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-saffron-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-saffron-500 transition"
            >
              <LogOut size={14} />
              {locale === "hi" ? "लॉग आउट" : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-goldline bg-sidebarbg transition-all duration-200 ${
          collapsed ? "w-[68px]" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="flex items-center gap-2.5 border-b border-goldline px-3.5 py-3.5">
          <Link
            href={activeProfile?.id ? `/profiles/${activeProfile.id}` : "/"}
            className="group flex min-w-0 items-center gap-2.5 transition focus:outline-hidden"
            title={
              activeProfile?.id
                ? locale === "hi"
                  ? `जन्म पत्रिका: ${activeProfile.name}`
                  : `Active Kundli: ${activeProfile.name}`
                : t("app.name")
            }
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron-800 text-amber-100 shadow-2xs border border-goldline/70 group-hover:border-gold group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-none stroke-current"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
                <circle cx="12" cy="12" r="1.3" fill="currentColor" />
              </svg>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="truncate font-serif text-[15px] font-bold leading-tight tracking-wide text-saffron-900 group-hover:text-saffron-700 transition">
                  {t("app.name")}
                </span>
                <span className="truncate text-[10px] font-semibold tracking-wider text-saffron-700/85">
                  {t("app.tagline")}
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-1 text-stone-500 hover:bg-saffron-100 md:hidden"
            aria-label="Close menu"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {/* Active Profile Context Section */}
          {activeProfile && (
            <div className="mb-2">
              {!collapsed ? (
                <div className="mb-1.5 flex items-center justify-between px-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    {t("nav.active_section")}
                  </span>
                  <Link
                    href="/"
                    className="text-[11px] font-semibold text-saffron-700 hover:text-saffron-900 hover:underline transition"
                    title={t("nav.switch")}
                  >
                    {t("nav.switch")}
                  </Link>
                </div>
              ) : null}

              {!collapsed && (
                <div className="mx-2.5 mb-2 flex items-center gap-2 rounded-xl border border-goldline/70 bg-panel/90 px-2.5 py-1.5 shadow-2xs">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-saffron-100 border border-gold/40 font-serif text-xs font-bold text-saffron-900">
                    {activeProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink leading-none">{activeProfile.name}</p>
                    <p className="truncate text-[9px] font-medium text-stone-500 mt-0.5">
                      {locale === "hi" ? "सक्रिय जातक" : "Active Chart"}
                    </p>
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-1 px-2.5">
                {/* Kundli Chart */}
                <Link
                  href={`/profiles/${activeProfile.id}`}
                  title={t("nav.chart")}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    pathname === `/profiles/${activeProfile.id}`
                      ? "bg-saffron-600 text-white font-bold shadow-2xs"
                      : "text-stone-700 hover:bg-saffron-100 hover:text-saffron-900"
                  } ${collapsed ? "justify-center px-0 py-2.5" : ""}`}
                >
                  <Sun
                    size={17}
                    strokeWidth={2.2}
                    className={
                      pathname === `/profiles/${activeProfile.id}` ? "text-amber-200" : "text-saffron-700"
                    }
                  />
                  {!collapsed && <span>{t("nav.chart")}</span>}
                </Link>

                {/* AI Consultation */}
                <Link
                  href={`/chat/${activeProfile.id}`}
                  title={t("nav.consult")}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    pathname.startsWith(`/chat/${activeProfile.id}`)
                      ? "bg-saffron-600 text-white font-bold shadow-2xs"
                      : "text-stone-700 hover:bg-saffron-100 hover:text-saffron-900"
                  } ${collapsed ? "justify-center px-0 py-2.5" : ""}`}
                >
                  <MessageSquareQuote
                    size={17}
                    strokeWidth={2.2}
                    className={
                      pathname.startsWith(`/chat/${activeProfile.id}`) ? "text-amber-200" : "text-saffron-700"
                    }
                  />
                  {!collapsed && <span>{t("nav.consult")}</span>}
                </Link>

                {/* Edit Birth Details */}
                <Link
                  href={`/profiles/${activeProfile.id}/edit`}
                  title={t("nav.edit")}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    pathname === `/profiles/${activeProfile.id}/edit`
                      ? "bg-saffron-600 text-white font-bold shadow-2xs"
                      : "text-stone-700 hover:bg-saffron-100 hover:text-saffron-900"
                  } ${collapsed ? "justify-center px-0 py-2.5" : ""}`}
                >
                  <Pencil
                    size={16}
                    strokeWidth={2.2}
                    className={
                      pathname === `/profiles/${activeProfile.id}/edit` ? "text-amber-200" : "text-stone-600"
                    }
                  />
                  {!collapsed && <span>{t("nav.edit")}</span>}
                </Link>
              </nav>

              <div className="my-2.5 border-t border-goldline/60 mx-3" />
            </div>
          )}

          {/* Global Library Section */}
          {!collapsed && activeProfile && (
            <div className="mb-1.5 px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {locale === "hi" ? "संग्रह" : "Library"}
              </span>
            </div>
          )}

          <nav className="flex flex-col gap-1 px-2.5">
            {/* All Horoscopes / People */}
            <Link
              href="/"
              title={t("nav.people")}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                pathname === "/"
                  ? "bg-saffron-600 text-white font-bold shadow-2xs"
                  : "text-stone-700 hover:bg-saffron-100 hover:text-saffron-900"
              } ${collapsed ? "justify-center px-0" : ""}`}
            >
              <Users
                size={17}
                strokeWidth={2.2}
                className={pathname === "/" ? "text-amber-200" : "text-saffron-700"}
              />
              {!collapsed && <span>{t("nav.people")}</span>}
            </Link>

            {/* New Kundli */}
            <Link
              href="/profiles/new"
              title={t("nav.new")}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                pathname === "/profiles/new"
                  ? "bg-saffron-600 text-white font-bold shadow-2xs"
                  : "text-stone-700 hover:bg-saffron-100 hover:text-saffron-900"
              } ${collapsed ? "justify-center px-0" : ""}`}
            >
              <PlusCircle
                size={17}
                strokeWidth={2.2}
                className={pathname === "/profiles/new" ? "text-amber-200" : "text-saffron-700"}
              />
              {!collapsed && <span>{t("nav.new")}</span>}
            </Link>

            {/* Admin Panel (Admins Only) */}
            {isAdmin && (
              <Link
                href="/admin"
                title={locale === "hi" ? "प्रशासक नियंत्रण" : "Admin Panel"}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  pathname === "/admin"
                    ? "bg-saffron-600 text-white font-bold shadow-2xs"
                    : "text-stone-700 hover:bg-saffron-100 hover:text-saffron-900"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <ShieldCheck
                  size={17}
                  strokeWidth={2.2}
                  className={pathname === "/admin" ? "text-amber-200" : "text-saffron-700"}
                />
                {!collapsed && <span>{locale === "hi" ? "प्रशासक नियंत्रण" : "Admin Panel"}</span>}
              </Link>
            )}
          </nav>
        </div>

        <div className="mt-auto px-2.5 pb-3">
          {!collapsed && (
            <Link
              href="/chat/1"
              className="mb-2 hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-saffron-100"
            >
              <ScrollText size={14} /> Jyotish reference
            </Link>
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden w-full items-center justify-center gap-2 rounded-lg border border-goldline bg-panel px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-saffron-100 md:flex"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && t("nav.collapse")}
          </button>
        </div>
      </aside>

      <div className={`min-w-0 flex-1 transition-all duration-200 ${collapsed ? "md:pl-[68px]" : "md:pl-60"}`}>
        <header className="sticky top-0 z-30 border-b border-goldline bg-cream/90 backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-2.5 sm:px-6">
            {/* Always accessible drawer toggle on mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-saffron-800 hover:bg-saffron-100 md:hidden transition shrink-0"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Quick back action on subpages */}
            {isSubpage && (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 rounded-lg p-1.5 text-saffron-800 hover:bg-saffron-100 transition shrink-0"
                aria-label={locale === "hi" ? "वापस जाएँ" : "Back"}
                title={locale === "hi" ? "वापस जाएँ" : "Back"}
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <span className="truncate text-sm font-bold text-saffron-900 md:hidden">
              {pageTitle}
            </span>
            <span className="hidden md:inline-block truncate text-xs font-semibold text-stone-500">
              {pageTitle}
            </span>

            <div className="ml-auto flex items-center gap-2" ref={menuRef}>
              <button
                onClick={() => setLocale(locale === "en" ? "hi" : "en")}
                className="flex items-center gap-1.5 rounded-lg border border-goldline bg-panel px-2.5 py-2 text-xs font-bold text-saffron-800 shadow-sm hover:bg-saffron-100"
                aria-label="Switch language / भाषा बदलें"
                title="EN ↔ हिंदी"
              >
                <Languages size={15} />
                {locale === "en" ? "हिंदी" : "English"}
              </button>

              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Account"
              >
                {session?.user.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.user_metadata.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-full border-2 border-gold object-cover shadow-sm transition hover:opacity-90"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gold bg-panel text-saffron-700 shadow-sm transition hover:bg-saffron-100">
                    <UserRound size={17} />
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-4 top-full mt-2 w-64 rounded-xl border border-goldline bg-panel p-4 shadow-xl">
                  <p className="text-sm font-bold text-saffron-800">
                    {session?.user.user_metadata?.name || session?.user.email || t("menu.station")}
                  </p>
                  {session?.user.email && (
                    <p className="truncate text-xs text-stone-500">{session.user.email}</p>
                  )}
                  {session && (
                    <button
                      onClick={async () => {
                        await signOut();
                      }}
                      className="mt-2.5 w-full rounded-lg border border-goldline py-1.5 text-xs font-bold text-stone-600 hover:bg-saffron-100"
                    >
                      {locale === "hi" ? "साइन आउट" : "Sign out"}
                    </button>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-lg bg-saffron-600 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-saffron-500 transition"
                    >
                      <ShieldCheck size={14} className="text-amber-200" />
                      <span>{locale === "hi" ? "प्रशासक नियंत्रण" : "Admin Dashboard"}</span>
                    </Link>
                  )}
                  <p className="mt-0.5 text-xs text-stone-500">{t("menu.mode")}</p>
                  <div className="my-3 border-t border-goldline" />
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                    {t("menu.providers")}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {providers.map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-xs">
                        <span className="font-semibold capitalize text-stone-700">{p.id}</span>
                        <span
                          className={`flex items-center gap-1 font-semibold ${
                            p.ready ? "text-saffron-700" : "text-stone-400"
                          }`}
                        >
                          <Circle size={8} fill="currentColor" strokeWidth={0} />
                          {p.ready ? t("menu.ready") : t("menu.nokey")}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-t border-goldline pt-2.5 text-[11px] leading-relaxed text-stone-500">
                    {readyCount > 0
                      ? t("menu.ok", { n: readyCount })
                      : t("menu.hint")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 py-5 pb-24 md:pb-8 sm:px-6">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
