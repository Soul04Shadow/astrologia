import Link from "next/link";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink antialiased">
        <header className="border-b border-stone-200 bg-saffron-50">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-saffron-600 text-lg font-bold text-white">
                ॐ
              </span>
              <span className="text-lg font-bold tracking-tight text-saffron-800">
                Vedic AI Astrologer
              </span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-100"
              >
                Profiles
              </Link>
              <Link
                href="/profiles/new"
                className="rounded-lg bg-saffron-600 px-3 py-2 text-sm font-semibold text-white hover:bg-saffron-700"
              >
                New Kundli
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-stone-200 py-6 text-center text-xs text-muted">
          Swiss Ephemeris · Lahiri sidereal · For guidance and reflection only
        </footer>
      </body>
    </html>
  );
}
