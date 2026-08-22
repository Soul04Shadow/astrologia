"use client";

import { forwardRef } from "react";
import type { Chart } from "@/lib/api";

const HOUSE_CENTERS: Record<number, { x: number; y: number }> = {
  1: { x: 200, y: 108 },
  2: { x: 112, y: 52 },
  3: { x: 44, y: 100 },
  4: { x: 54, y: 200 },
  5: { x: 44, y: 300 },
  6: { x: 112, y: 348 },
  7: { x: 200, y: 292 },
  8: { x: 288, y: 348 },
  9: { x: 356, y: 300 },
  10: { x: 346, y: 200 },
  11: { x: 356, y: 100 },
  12: { x: 288, y: 52 },
};

const ABBREV: Record<string, string> = {
  Rahu: "Ra",
  Ketu: "Ke",
};

function abbrev(name: string) {
  return ABBREV[name] ?? name.slice(0, 2);
}

const NorthIndianChart = forwardRef<SVGSVGElement, { chart: Chart; title?: string }>(
  function NorthIndianChart({ chart, title }, ref) {
    const lagnaSignNum = chart.lagna.sign_index + 1;
    const housePlanets: Record<number, string[]> = {};
    for (const [pname, p] of Object.entries(chart.planets)) {
      const mark =
        abbrev(pname) +
        (p.dignity === "Exalted" ? "*" : "") +
        (p.retrograde ? "R" : "");
      (housePlanets[p.house] ??= []).push(mark);
    }
    const signForHouse = (h: number) => ((lagnaSignNum + h - 2) % 12) + 1;

    return (
      <svg
        ref={ref}
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[520px]"
        role="img"
        aria-label={title ?? "North Indian Kundli chart"}
      >
        <rect x="4" y="4" width="392" height="392" fill="#fff8e7" stroke="#ea580c" strokeWidth="3" />
        <line x1="4" y1="4" x2="396" y2="396" stroke="#f97316" strokeWidth="1.5" />
        <line x1="396" y1="4" x2="4" y2="396" stroke="#f97316" strokeWidth="1.5" />
        <polygon points="200,4 396,200 200,396 4,200" fill="none" stroke="#f97316" strokeWidth="1.5" />

        {Object.entries(HOUSE_CENTERS).map(([h, c]) => {
          const house = Number(h);
          const planets = housePlanets[house] ?? [];
          return (
            <g key={house}>
              <text
                x={c.x}
                y={c.y - 26}
                textAnchor="middle"
                fontSize="15"
                fontWeight="700"
                fill="#c2410c"
              >
                {signForHouse(house)}
              </text>
              {planets.map((mark, i) => (
                <text
                  key={`${house}-${mark}-${i}`}
                  x={c.x}
                  y={c.y - 8 + i * 17}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="700"
                  fill={mark.includes("*") || mark.endsWith("R") ? "#b45309" : "#1c1917"}
                >
                  {mark}
                </text>
              ))}
            </g>
          );
        })}
        {title && (
          <text x="200" y="22" textAnchor="middle" fontSize="13" fontWeight="700" fill="#9a3412">
            {title}
          </text>
        )}
      </svg>
    );
  },
);

export default NorthIndianChart;
