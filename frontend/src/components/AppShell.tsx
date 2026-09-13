"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Circle,
  Languages,
  Menu,
  ScrollText,
  Sparkle,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth, authEnabled } from "@/lib/auth";
import MobileBottomNav from "@/components/MobileBottomNav";

interface ProviderInfo {
  id: string;
  ready: boolean;
}

const NAV = [
  { href: "/", label: "People", icon: Users },
  { href: "/profiles/new", label: "New Kundli", icon: Sparkle },
];

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
  const menuRef = useRef<HTMLDivElement | null>(null);

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
  if (pathname === "/") pageTitle = locale === "hi" ? "जातक सूची" : "People";
  else if (pathname === "/profiles/new") pageTitle = locale === "hi" ? "नई कुंडली" : "New Kundli";
  else if (pathname.includes("/edit")) pageTitle = locale === "hi" ? "संशोधन" : "Edit Profile";
  else if (pathname.startsWith("/chat/")) pageTitle = locale === "hi" ? "एआई परामर्श" : "Consultation";
  else if (pathname.startsWith("/profiles/")) pageTitle = locale === "hi" ? "जन्म कुंडली" : "Kundli Chart";

  if (authEnabled && authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-saffron-600 text-3xl font-bold text-white shadow-md">
          ॐ
        </div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-saffron-800">
          {locale === "hi" ? "कृपया प्रतीक्षा करें..." : "Loading..."}
        </p>
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
        <div className="flex items-center gap-2.5 border-b border-goldline px-4 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saffron-600 text-base font-bold text-white">
            ॐ
          </span>
          {!collapsed && (
            <span className="truncate text-[15px] font-bold leading-tight tracking-tight text-saffron-800">
              {t("app.name")}
            </span>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-1 text-stone-500 hover:bg-saffron-100 md:hidden"
            aria-label="Close menu"
          >
            <X size={17} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-2.5 py-3">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-saffron-600 text-white"
                    : "text-saffron-800 hover:bg-saffron-100"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <item.icon size={17} strokeWidth={2.2} />
                {!collapsed && t(item.href === "/" ? "nav.people" : "nav.new")}
              </Link>
            );
          })}
        </nav>

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

      <div className={`transition-all duration-200 ${collapsed ? "md:pl-[68px]" : "md:pl-60"}`}>
        <header className="sticky top-0 z-30 border-b border-goldline bg-cream/90 backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-2.5 sm:px-6">
            {isSubpage ? (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 rounded-lg p-2 text-saffron-800 hover:bg-saffron-100 transition"
                aria-label={locale === "hi" ? "वापस जाएँ" : "Back"}
                title={locale === "hi" ? "वापस जाएँ" : "Back"}
              >
                <ArrowLeft size={19} />
              </button>
            ) : (
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-saffron-800 hover:bg-saffron-100 md:hidden"
                aria-label="Open menu"
              >
                <Menu size={19} />
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

        <main className="mx-auto max-w-6xl px-3 py-5 pb-24 md:pb-8 sm:px-6">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
