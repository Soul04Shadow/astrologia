"use client";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { session, loading, signInWithGoogle } = useAuth();
  const { locale } = useI18n();

  const hi = locale === "hi";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron-600 text-2xl font-bold text-white">
        ॐ
      </span>
      <h1 className="mt-5 text-xl font-bold text-saffron-800">
        {hi ? "वैदिक एआई ज्योतिषी" : "Vedic AI Astrologer"}
      </h1>
      <p className="mt-1.5 text-sm text-stone-600">
        {hi
          ? "परामर्श शुरू करने के लिए Google से साइन इन करें।"
          : "Sign in with Google to start your consultations."}
      </p>

      {session ? (
        <a
          href="/"
          className="mt-8 w-full rounded-lg bg-saffron-600 py-3 text-sm font-bold text-white hover:bg-saffron-700"
        >
          {hi ? "आगे बढ़ें →" : "Continue →"}
        </a>
      ) : (
        <button
          onClick={() => signInWithGoogle()}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-goldline bg-panel py-3 text-sm font-bold text-ink shadow-sm hover:bg-saffron-50 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 40.4 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          {hi ? "Google से जारी रखें" : "Continue with Google"}
        </button>
      )}

      <p className="mt-6 text-[11px] leading-relaxed text-stone-500">
        {hi
          ? "बीटा परीक्षण सीमित आमंत्रित उपयोगकर्ताओं तक सीमित है।"
          : "Beta access is limited to invited users."}
      </p>
    </div>
  );
}
