"use client";

import React from "react";

export function AppLoadingScreen({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-saffron-600 shadow-xl border-2 border-goldline/70 ring-1 ring-gold/30">
        <svg
          viewBox="0 0 24 24"
          className="h-12 w-12 text-amber-100 animate-pulse"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          {/* Central Golden Bindu */}
          <circle cx="12" cy="12" r="3" className="fill-amber-300 stroke-amber-400" />
          {/* Inner Jyotish Orbit */}
          <circle cx="12" cy="12" r="6" strokeDasharray="2 2" className="opacity-60" />
          {/* Outer Celestial Horizon */}
          <circle cx="12" cy="12" r="9.5" />
          {/* 12 Solar Aditya Rays */}
          <line x1="12" y1="1" x2="12" y2="3" strokeWidth="2" />
          <line x1="12" y1="21" x2="12" y2="23" strokeWidth="2" />
          <line x1="1" y1="12" x2="3" y2="12" strokeWidth="2" />
          <line x1="21" y1="12" x2="23" y2="12" strokeWidth="2" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          <line x1="7.5" y1="2" x2="8.5" y2="4" />
          <line x1="15.5" y1="20" x2="16.5" y2="22" />
          <line x1="2" y1="16.5" x2="4" y2="15.5" />
          <line x1="20" y1="8.5" x2="22" y2="7.5" />
        </svg>
      </div>

      <h2 className="font-serif text-lg font-bold tracking-widest text-ink sm:text-xl">
        ASTROLOGIA <span className="text-saffron-600 font-normal">· ज्योतिष्य</span>
      </h2>
      <p className="mt-2 text-xs font-medium text-stone-500 sm:text-sm animate-pulse">
        {message || "Illuminating celestial coordinates..."}
      </p>
    </div>
  );
}

export function DossierCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-goldline/70 bg-panel p-5 shadow-xs flex flex-col justify-between min-h-[200px]"
        >
          <div>
            {/* Header row skeleton */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-saffron-100 border border-goldline/40" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-saffron-200/70" />
                <div className="h-3 w-24 rounded bg-stone-200/80" />
              </div>
            </div>

            {/* Birth details strip skeleton */}
            <div className="my-3.5 space-y-2 rounded-xl border border-goldline/40 bg-saffron-50/40 p-2.5">
              <div className="h-3 w-28 rounded bg-stone-200/70" />
              <div className="h-3 w-40 rounded bg-stone-200/70" />
            </div>
          </div>

          {/* Action buttons skeleton */}
          <div className="mt-2 flex gap-2 pt-1 border-t border-goldline/30">
            <div className="h-8 flex-1 rounded-xl border border-goldline/50 bg-white" />
            <div className="h-8 flex-1 rounded-xl bg-saffron-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartPageSkeleton() {
  return (
    <div className="animate-pulse space-y-5 pb-16">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col gap-4 rounded-2xl border border-goldline bg-panel p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 shrink-0 rounded-xl bg-saffron-600/30 border border-goldline/50" />
          <div className="space-y-2">
            <div className="h-5 w-44 rounded bg-saffron-200/80" />
            <div className="h-3.5 w-60 rounded bg-stone-200/80" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-8 w-24 rounded-lg bg-stone-200/60 border border-goldline/40" />
          <div className="h-8 w-28 rounded-lg bg-saffron-200/70" />
          <div className="h-8 w-24 rounded-lg bg-stone-200/60 border border-goldline/40" />
          <div className="h-8 w-24 rounded-lg bg-saffron-100 border border-goldline/40" />
        </div>
      </div>

      {/* 4 Stat Badges Skeleton */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-goldline bg-panel p-3 shadow-xs space-y-1.5">
            <div className="h-2.5 w-16 rounded bg-saffron-200/60" />
            <div className="h-4 w-24 rounded bg-stone-300/70" />
            <div className="h-2.5 w-20 rounded bg-stone-200/60" />
          </div>
        ))}
      </div>

      {/* Tab Pills Skeleton */}
      <div className="flex gap-1 overflow-x-auto rounded-t-xl border-b-2 border-goldline bg-sidebarbg/60 p-1">
        <div className="h-8 w-24 rounded-t-lg bg-panel shadow-xs" />
        <div className="h-8 w-28 rounded-t-lg bg-stone-200/50" />
        <div className="h-8 w-28 rounded-t-lg bg-stone-200/50" />
        <div className="h-8 w-32 rounded-t-lg bg-stone-200/50" />
        <div className="h-8 w-28 rounded-t-lg bg-stone-200/50" />
      </div>

      {/* Main Content Grid: Chart Wireframe on Left, Planetary Positions Table on Right */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: North Indian Kundli Diamond Chart Wireframe Skeleton */}
        <div className="lg:col-span-5 rounded-2xl border border-goldline bg-panel p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-goldline/40 pb-2.5">
            <div className="h-4 w-32 rounded bg-saffron-200/70" />
            <div className="flex gap-1.5">
              <div className="h-6 w-12 rounded bg-stone-200/60" />
              <div className="h-6 w-12 rounded bg-stone-200/60" />
            </div>
          </div>

          <div className="relative aspect-square w-full max-w-[360px] mx-auto rounded-xl border border-goldline/80 bg-saffron-50/40 p-2 flex items-center justify-center">
            {/* Vedic North Indian Chart Grid Lines */}
            <svg viewBox="0 0 100 100" className="w-full h-full stroke-goldline/70" fill="none" strokeWidth="0.75">
              {/* Outer boundary */}
              <rect x="2" y="2" width="96" height="96" />
              {/* Diagonals */}
              <line x1="2" y1="2" x2="98" y2="98" />
              <line x1="98" y1="2" x2="2" y2="98" />
              {/* Central Diamond (Lagna, H4, H7, H10) */}
              <polygon points="50,2 98,50 50,98 2,50" strokeWidth="0.85" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="h-8 w-8 rounded-full bg-saffron-200/50 border border-goldline animate-ping opacity-30" />
              <span className="mt-2 text-[11px] font-bold text-saffron-700/80 tracking-wide">
                गणना जारी है...
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs border-t border-goldline/30 pt-2">
            <div className="h-3 w-28 rounded bg-stone-200/60" />
            <div className="h-3 w-16 rounded bg-stone-200/60" />
          </div>
        </div>

        {/* Right Column: Planetary Positions Table Skeleton */}
        <div className="lg:col-span-7 rounded-2xl border border-goldline bg-panel p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-goldline/40 pb-2.5">
            <div className="h-4 w-40 rounded bg-saffron-200/70" />
            <div className="h-3 w-24 rounded bg-stone-200/60" />
          </div>

          {/* Table Header Row */}
          <div className="border-b-2 border-saffron-600/60 pb-2 flex gap-3">
            <div className="h-3 w-12 rounded bg-saffron-300/80" />
            <div className="h-3 w-14 rounded bg-stone-300/80" />
            <div className="h-3 w-12 rounded bg-stone-300/80" />
            <div className="h-3 w-10 rounded bg-stone-300/80" />
            <div className="h-3 flex-1 rounded bg-stone-300/80" />
            <div className="h-3 w-20 rounded bg-saffron-300/80" />
            <div className="h-3 w-16 rounded bg-stone-300/80" />
          </div>

          {/* 10 Table Rows (Lagna + 9 Grahas) */}
          <div className="divide-y divide-goldline/40 mt-1">
            {/* Lagna Row */}
            <div className="py-2.5 flex items-center gap-3 bg-saffron-50/50 px-1 rounded-sm">
              <div className="h-3.5 w-16 rounded bg-saffron-300/90 font-bold" />
              <div className="h-3 w-14 rounded bg-stone-300/70" />
              <div className="h-3 w-12 rounded bg-stone-300/70" />
              <div className="h-3 w-8 rounded bg-saffron-300/70" />
              <div className="h-3 flex-1 rounded bg-stone-300/70" />
              <div className="h-3 w-16 rounded bg-saffron-300/80" />
              <div className="h-3 w-14 rounded bg-stone-300/70" />
            </div>

            {/* 9 Grahas */}
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="py-2 flex items-center gap-3 px-1">
                <div className="h-3 w-12 rounded bg-stone-300/80" />
                <div className="h-3 w-14 rounded bg-stone-200/80" />
                <div className="h-3 w-12 rounded bg-stone-200/80" />
                <div className="h-3 w-8 rounded bg-stone-200/80" />
                <div className="h-3 flex-1 rounded bg-stone-200/80" />
                <div className="h-3 w-16 rounded bg-saffron-200/70" />
                <div className="h-3 w-14 rounded bg-stone-200/80" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-xl mx-auto rounded-2xl border border-goldline bg-panel p-6 sm:p-8 shadow-xs">
      <div className="h-7 w-48 rounded bg-saffron-200/70 mb-6" />
      <div className="space-y-4">
        <div>
          <div className="h-3 w-20 rounded bg-stone-200 mb-2" />
          <div className="h-10 w-full rounded-xl bg-saffron-50 border border-goldline/50" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-3 w-20 rounded bg-stone-200 mb-2" />
            <div className="h-10 w-full rounded-xl bg-saffron-50 border border-goldline/50" />
          </div>
          <div>
            <div className="h-3 w-20 rounded bg-stone-200 mb-2" />
            <div className="h-10 w-full rounded-xl bg-saffron-50 border border-goldline/50" />
          </div>
        </div>
        <div>
          <div className="h-3 w-20 rounded bg-stone-200 mb-2" />
          <div className="h-10 w-full rounded-xl bg-saffron-50 border border-goldline/50" />
        </div>
      </div>
      <div className="pt-4 flex gap-3">
        <div className="h-10 w-28 rounded-xl bg-saffron-600/80" />
        <div className="h-10 w-24 rounded-xl bg-stone-200" />
      </div>
    </div>
  );
}
