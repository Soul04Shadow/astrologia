"use client";

import { forwardRef } from "react";

export interface PlacementMark {
  label: string;
  signIndex: number;
  highlight?: boolean;
}

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

const SIGN_ABBREV = [
  "Ar", "Ta", "Ge", "Cn", "Le", "Vi",
  "Li", "Sc", "Sg", "Cp", "Aq", "Pi",
];

interface Props {
  lagnaSignIndex: number;
  placements: PlacementMark[];
  title?: string;
}

const VargaChart = forwardRef<SVGSVGElement, Props>(function VargaChart(
  { lagnaSignIndex, placements, title },
  ref,
) {
  const housePlanets: Record<number, PlacementMark[]> = {};
  for (const p of placements) {
    const delta = (((p.signIndex - lagnaSignIndex) % 12) + 12) % 12;
    const house = delta + 1;
    (housePlanets[house] ??= []).push(p);
  }
  const signForHouse = (h: number) => ((lagnaSignIndex + h - 2) % 12) + 1;

  return (
    <svg
      ref={ref}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      role="img"
      aria-label={title ?? "North Indian chart"}
    >
      <rect x="4" y="4" width="392" height="392" fill="#fffdf6" stroke="#ea580c" strokeWidth="3" />
      <line x1="4" y1="4" x2="396" y2="396" stroke="#f97316" strokeWidth="1.5" />
      <line x1="396" y1="4" x2="4" y2="396" stroke="#f97316" strokeWidth="1.5" />
      <polygon points="200,4 396,200 200,396 4,200" fill="none" stroke="#f97316" strokeWidth="1.5" />

      {Object.entries(HOUSE_CENTERS).map(([h, c]) => {
        const house = Number(h);
        const list = housePlanets[house] ?? [];
        return (
          <g key={house}>
            <text
              x={c.x}
              y={c.y - 24 - Math.max(list.length - 1, 0) * 8}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#c2410c"
            >
              {SIGN_ABBREV[signForHouse(house) - 1]}
            </text>
            {list.map((mark, i) => (
              <text
                key={`${house}-${mark.label}-${i}`}
                x={c.x}
                y={c.y - 4 + i * 17}
                textAnchor="middle"
                fontSize="13.5"
                fontWeight="700"
                fill={mark.highlight ? "#b45309" : "#1c1917"}
              >
                {mark.label}
              </text>
            ))}
          </g>
        );
      })}
      {title && (
        <text x="200" y="24" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#9a3412">
          {title}
        </text>
      )}
    </svg>
  );
});

export default VargaChart;
