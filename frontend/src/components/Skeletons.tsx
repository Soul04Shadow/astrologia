"use client";

import React from "react";

export function AppLoadingScreen({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-saffron-800 shadow-xl border-2 border-goldline/70 ring-1 ring-gold/20">
        <svg
          viewBox="0 0 24 24"
          className="h-12 w-12 text-amber-200 animate-pulse"
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
        ASTROLOGIA <span className="text-saffron-700 font-normal">· ज्योतिष्य</span>
      </h2>
      <p className="mt-2 text-xs font-medium text-ink-muted sm:text-sm animate-pulse">
        {message || "Illuminating celestial coordinates..."}
      </p>
    </div>
  );
}

export function DossierCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border-2 border-parchment-200/80 bg-panel p-5 shadow-xs flex flex-col justify-between min-h-[220px]"
        >
          <div>
            {/* Header row skeleton */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-parchment-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-parchment-200" />
                <div className="h-3 w-1/2 rounded bg-parchment-100" />
              </div>
            </div>

            {/* Meta details skeleton */}
            <div className="mt-4 space-y-2 border-t border-parchment-100 pt-3">
              <div className="h-3 w-4/5 rounded bg-parchment-100" />
              <div className="h-3 w-3/5 rounded bg-parchment-100" />
            </div>
          </div>

          {/* Action buttons skeleton */}
          <div className="mt-5 flex gap-2 border-t border-parchment-100 pt-3">
            <div className="h-8 flex-1 rounded-xl bg-parchment-200" />
            <div className="h-8 flex-1 rounded-xl bg-parchment-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col gap-4 rounded-2xl border-2 border-parchment-200/80 bg-panel p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-parchment-200" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-parchment-200" />
            <div className="h-4 w-64 rounded bg-parchment-100" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-xl bg-parchment-200" />
          <div className="h-9 w-28 rounded-xl bg-parchment-200" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b border-parchment-200 pb-2">
        <div className="h-8 w-24 rounded-lg bg-parchment-200" />
        <div className="h-8 w-24 rounded-lg bg-parchment-100" />
        <div className="h-8 w-24 rounded-lg bg-parchment-100" />
        <div className="h-8 w-24 rounded-lg bg-parchment-100" />
      </div>

      {/* Chart Viewport Skeleton */}
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border-2 border-parchment-200/80 bg-panel p-8 shadow-xs">
        <div className="h-64 w-64 rounded-2xl border border-parchment-200 bg-parchment-100/50 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full border border-parchment-200 bg-parchment-200/40" />
        </div>
      </div>
    </div>
  );
}

export function EditProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-xl mx-auto rounded-2xl border-2 border-parchment-200/80 bg-panel p-6 sm:p-8">
      <div className="h-7 w-48 rounded bg-parchment-200 mb-6" />
      <div className="space-y-4">
        <div>
          <div className="h-3 w-20 rounded bg-parchment-100 mb-2" />
          <div className="h-10 w-full rounded-xl bg-parchment-200" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-3 w-20 rounded bg-parchment-100 mb-2" />
            <div className="h-10 w-full rounded-xl bg-parchment-200" />
          </div>
          <div>
            <div className="h-3 w-20 rounded bg-parchment-100 mb-2" />
            <div className="h-10 w-full rounded-xl bg-parchment-200" />
          </div>
        </div>
        <div>
          <div className="h-3 w-20 rounded bg-parchment-100 mb-2" />
          <div className="h-10 w-full rounded-xl bg-parchment-200" />
        </div>
      </div>
      <div className="pt-4 flex gap-3">
        <div className="h-10 w-28 rounded-xl bg-parchment-200" />
        <div className="h-10 w-24 rounded-xl bg-parchment-100" />
      </div>
    </div>
  );
}
