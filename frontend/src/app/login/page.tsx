"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { session, loading, signInWithGoogle } = useAuth();
  const { locale } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const hi = locale === "hi";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const search = window.location.search;
    const searchParams = new URLSearchParams(search);
    let err = searchParams.get("error_description") || searchParams.get("error");
    if (!err && hash) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      err = hashParams.get("error_description") || hashParams.get("error");
    }
    if (err) {
      setAuthError(decodeURIComponent(err.replace(/\+/g, " ")));
    }
  }, []);

  async function handleGoogleSignIn() {
    try {
      setAuthError(null);
      setSubmitting(true);
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md flex-col items-center justify-center px-4 py-8">
      <div className="w-full rounded-2xl border border-goldline bg-panel p-8 text-center shadow-lg sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron-600 text-2xl font-bold text-white shadow-sm">
          ॐ
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-saffron-800">
          {hi ? "वैदिक एआई ज्योतिषी" : "Vedic AI Astrologer"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          {hi
            ? "सटीक कुंडली विश्लेषण और व्यक्तिगत परामर्श के लिए Google से साइन इन करें।"
            : "Sign in with Google to explore authentic Vedic astrology consultations and Kundli calculations."}
        </p>

        {authError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700">
            <p className="font-bold">{hi ? "साइन इन त्रुटि:" : "Sign-in issue:"}</p>
            <p className="mt-0.5 break-words">{authError}</p>
          </div>
        )}

        {session ? (
          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-saffron-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-saffron-700"
          >
            {hi ? "डैशबोर्ड पर जाएँ →" : "Go to Dashboard →"}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || submitting}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-goldline bg-white py-3 px-4 text-sm font-bold text-ink shadow-sm transition hover:bg-saffron-50 hover:border-gold active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin text-saffron-600" />
                <span>{hi ? "Google से कनेक्ट हो रहा है..." : "Connecting to Google..."}</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                  <path
                    fill="#FFC107"
                    d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 40.4 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"
                  />
                </svg>
                <span>{hi ? "Google से जारी रखें" : "Continue with Google"}</span>
              </>
            )}
          </button>
        )}

        <div className="mt-8 border-t border-goldline pt-4">
          <p className="text-[11px] leading-relaxed text-stone-500">
            {hi
              ? "बीटा परीक्षण: केवल अधिकृत ईमेल पतों को एक्सेस की अनुमति है।"
              : "Beta Access: Limited to invited and authorized email addresses."}
          </p>
        </div>
      </div>
    </div>
  );
}
