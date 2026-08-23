"use client";

import { forwardRef, useState } from "react";

export interface PlacementMark {
  label: string;
  signIndex: number;
  highlight?: boolean;
  tip?: string;
}

export interface SignLabel {
  code: string;
  name: string;
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

interface TooltipState {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

interface Props {
  lagnaSignIndex: number;
  placements: PlacementMark[];
  signLabels?: SignLabel[];
  houseWord?: string;
  title?: string;
}

const VargaChart = forwardRef<SVGSVGElement, Props>(function VargaChart(
  { lagnaSignIndex, placements, signLabels, houseWord = "House", title },
  ref,
) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const housePlanets: Record<number, PlacementMark[]> = {};
  for (const p of placements) {
    const delta = (((p.signIndex - lagnaSignIndex) % 12) + 12) % 12;
    const house = delta + 1;
    (housePlanets[house] ??= []).push(p);
  }
  const signForHouse = (h: number) => ((lagnaSignIndex + h - 1) % 12) + 1;

  function show(e: React.MouseEvent, titleText: string, lines: string[]) {
    const host = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      title: titleText,
      lines,
    });
  }

  function hide() {
    setTooltip(null);
  }

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full select-none"
        role="img"
        aria-label={title ?? "North Indian chart"}
      >
        <rect x="4" y="4" width="392" height="392" fill="#fffdf6" stroke="#ea580c" strokeWidth="3" />
        <line x1="4" y1="4" x2="396" y2="396" stroke="#f97316" strokeWidth="1.4" />
        <line x1="396" y1="4" x2="4" y2="396" stroke="#f97316" strokeWidth="1.4" />
        <polygon points="200,4 396,200 200,396 4,200" fill="none" stroke="#f97316" strokeWidth="1.4" />

        {Object.entries(HOUSE_CENTERS).map(([h, c]) => {
          const house = Number(h);
          const list = housePlanets[house] ?? [];
          const sIdx = signForHouse(house);
          const sl = signLabels?.[sIdx];
          const signY = c.y - 24 - Math.max(list.length - 1, 0) * 8;
          return (
            <g key={house}>
              <text
                x={c.x - 30}
                y={signY}
                textAnchor="end"
                fontSize="9"
                fontWeight="600"
                fill="#a8a29e"
              >
                {houseWord} {house}
              </text>
              <text
                x={c.x + 4}
                y={signY}
                textAnchor="middle"
                fontSize={sl && /[\u0900-\u097F]/.test(sl.code) ? 12.5 : 14}
                fontWeight="700"
                fill="#c2410c"
                style={{ cursor: sl ? "help" : "default" }}
                onMouseEnter={(e) => sl && show(e, sl.name, [`${houseWord} ${house}`])}
                onMouseMove={(e) => sl && show(e, sl.name, [`${houseWord} ${house}`])}
                onMouseLeave={hide}
              >
                {sl?.code ?? ""}
              </text>
              {list.map((mark, i) => (
                <text
                  key={`${house}-${mark.label}-${i}`}
                  x={c.x}
                  y={c.y - 6 + i * 17}
                  textAnchor="middle"
                  fontSize="13.5"
                  fontWeight="700"
                  fill={mark.highlight ? "#b45309" : "#292524"}
                  style={{ cursor: mark.tip ? "help" : "default" }}
                  onMouseEnter={(e) => {
                    const [tt, ...rest] = mark.tip!.split("\n");
                    show(e, tt, rest);
                  }}
                  onMouseMove={(e) => {
                    const [tt, ...rest] = mark.tip!.split("\n");
                    show(e, tt, rest);
                  }}
                  onMouseLeave={hide}
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

      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 max-w-[250px] rounded-lg border border-goldline bg-stone-900/95 px-2.5 py-1.5 shadow-xl"
          style={{
            left: Math.min(Math.max(tooltip.x - 40, 4), 300),
            top: Math.max(tooltip.y - 46, 4),
          }}
        >
          <p className="text-[11px] font-bold text-saffron-200">{tooltip.title}</p>
          {tooltip.lines.map((l, i) => (
            <p key={i} className="text-[10.5px] leading-snug text-stone-200">
              {l}
            </p>
          ))}
        </div>
      )}
    </div>
  );
});

export default VargaChart;
