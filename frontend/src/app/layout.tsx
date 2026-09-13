import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, Noto_Sans_Devanagari } from "next/font/google";
import AppShell from "@/components/AppShell";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-cinzel",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "Astrologia · Vedic Astrology & AI",
  description: "Exact Swiss-Ephemeris natal kundli computation with grounded AI consultation",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f7f1e1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable} ${notoDevanagari.variable}`}>
      <body className="min-h-screen bg-cream text-ink antialiased">
        <LanguageProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
