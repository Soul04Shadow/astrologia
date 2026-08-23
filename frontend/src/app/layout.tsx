import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import AppShell from "@/components/AppShell";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "Vedic AI Astrologer · वैदिक एआई ज्योतिषी",
  description: "Exact Swiss-Ephemeris kundli generation with grounded AI consultation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoDevanagari.variable}`}>
      <body className="min-h-screen bg-cream text-ink antialiased">
        <LanguageProvider>
          <AppShell>{children}</AppShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
