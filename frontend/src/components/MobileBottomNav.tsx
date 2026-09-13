"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Pencil,
  PlusCircle,
  Sun,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { locale } = useI18n();

  // Don't show bottom nav on login page
  if (pathname === "/login") return null;

  // Detect if currently viewing a profile context
  const profileMatch = pathname.match(/^\/(?:profiles|chat)\/([0-9]+)/);
  const profileId = profileMatch ? profileMatch[1] : null;

  const isPeopleActive = pathname === "/";
  const isNewActive = pathname === "/profiles/new";
  const isChartActive = profileId ? pathname === `/profiles/${profileId}` : false;
  const isChatActive = profileId ? pathname.startsWith(`/chat/${profileId}`) : false;
  const isEditActive = profileId ? pathname === `/profiles/${profileId}/edit` : false;

  const navItemClass = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center py-2 px-1 text-center transition-all ${
      active
        ? "text-saffron-700 font-bold"
        : "text-stone-500 hover:text-stone-800"
    }`;

  const iconContainerClass = (active: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded-full transition ${
      active ? "bg-saffron-100 text-saffron-700" : ""
    }`;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-goldline bg-panel/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {/* Always present: People List */}
        <Link href="/" className={navItemClass(isPeopleActive)}>
          <div className={iconContainerClass(isPeopleActive)}>
            <Users size={18} strokeWidth={isPeopleActive ? 2.5 : 2} />
          </div>
          <span className="mt-0.5 text-[10px] tracking-tight">
            {locale === "hi" ? "जातक" : "People"}
          </span>
        </Link>

        {profileId ? (
          <>
            {/* Chart Tab */}
            <Link href={`/profiles/${profileId}`} className={navItemClass(isChartActive)}>
              <div className={iconContainerClass(isChartActive)}>
                <Sun size={18} strokeWidth={isChartActive ? 2.5 : 2} />
              </div>
              <span className="mt-0.5 text-[10px] tracking-tight">
                {locale === "hi" ? "कुंडली" : "Chart"}
              </span>
            </Link>

            {/* AI Consultation Tab */}
            <Link href={`/chat/${profileId}`} className={navItemClass(isChatActive)}>
              <div className={iconContainerClass(isChatActive)}>
                <MessageSquare size={18} strokeWidth={isChatActive ? 2.5 : 2} />
              </div>
              <span className="mt-0.5 text-[10px] tracking-tight">
                {locale === "hi" ? "परामर्श" : "Consult AI"}
              </span>
            </Link>

            {/* Edit Details Tab */}
            <Link href={`/profiles/${profileId}/edit`} className={navItemClass(isEditActive)}>
              <div className={iconContainerClass(isEditActive)}>
                <Pencil size={17} strokeWidth={isEditActive ? 2.5 : 2} />
              </div>
              <span className="mt-0.5 text-[10px] tracking-tight">
                {locale === "hi" ? "संशोधन" : "Edit"}
              </span>
            </Link>
          </>
        ) : (
          /* Global mode: New Kundli */
          <Link href="/profiles/new" className={navItemClass(isNewActive)}>
            <div className={iconContainerClass(isNewActive)}>
              <PlusCircle size={18} strokeWidth={isNewActive ? 2.5 : 2} />
            </div>
            <span className="mt-0.5 text-[10px] tracking-tight">
              {locale === "hi" ? "नई कुंडली" : "New Kundli"}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
