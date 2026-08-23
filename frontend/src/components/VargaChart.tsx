"use client";

import { forwardRef, useState } from "react";

export interface PlacementMark {
  label: string;
  signIndex: number;
  house?: number;
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
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);

  const housePlanets: Record<number, PlacementMark[]> = {};
  for (const p of placements) {
    const house = p.house ?? ((((p.signIndex - lagnaSignIndex) % 12) + 12) % 12 + 1);
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
    setHoveredHouse(null);
  }

  function showSide(e: React.MouseEvent, titleText: string, lines: string[]) {
    const host = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    // tooltip to the side of the cursor, not covering the hovered text
    const offsetX = 18;
    const offsetY = -10;
    setTooltip({
      x: e.clientX - rect.left + offsetX,
      y: e.clientY - rect.top + offsetY,
      title: titleText,
      lines,
    });
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
          const sIdx = signForHouse(house); // 1 to 12 (Rashi / Sign number)
          const sl = signLabels?.[sIdx];
          const isHovered = hoveredHouse === house;
          // Position sign number at top apex of house, and stack planets below
          const signY = c.y - 20 - Math.min(list.length, 2) * 3;
          const planetBaseY = c.y - 2 + (list.length === 1 ? 4 : 0);
          return (
            <g
              key={house}
              onMouseEnter={() => setHoveredHouse(house)}
              onMouseLeave={hide}
              style={{ cursor: list.length || sl ? "pointer" : "default" }}
            >
              {isHovered && (
                <circle cx={c.x} cy={c.y} r={28} fill="rgba(251,146,60,0.10)" stroke="rgba(251,146,60,0.35)" strokeWidth={1.2} />
              )}
              {/* Rashi / Sign Number (1 to 12) */}
              <text
                x={c.x}
                y={signY}
                textAnchor="middle"
                fontSize={13}
                fontWeight="700"
                fill={isHovered ? "#9a3412" : "#c2410c"}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) =>
                  showSide(
                    e,
                    sl ? `${sl.name} (Sign ${sIdx})` : `Sign ${sIdx}`,
                    [`${houseWord} ${house}`],
                  )
                }
                onMouseMove={(e) =>
                  showSide(
                    e,
                    sl ? `${sl.name} (Sign ${sIdx})` : `Sign ${sIdx}`,
                    [`${houseWord} ${house}`],
                  )
                }
              >
                {sIdx}
              </text>
              {/* Planets / Ascendant in this house */}
              {list.map((mark, i) => (
                <text
                  key={`${house}-${mark.label}-${i}`}
                  x={c.x}
                  y={planetBaseY + i * 15}
                  textAnchor="middle"
                  fontSize={mark.label.length > 5 ? 11.5 : 12.5}
                  fontWeight="700"
                  fill={mark.highlight ? "#b45309" : "#292524"}
                  style={{ cursor: mark.tip ? "pointer" : "default" }}
                  onMouseEnter={(e) => {
                    if (mark.tip) {
                      const [tt, ...rest] = mark.tip.split("\n");
                      showSide(e, tt, rest);
                    }
                  }}
                  onMouseMove={(e) => {
                    if (mark.tip) {
                      const [tt, ...rest] = mark.tip.split("\n");
                      showSide(e, tt, rest);
                    }
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
          className="pointer-events-none absolute z-50 max-w-[260px] rounded-lg border border-goldline bg-panel px-3 py-2 shadow-lg"
          style={{
            left: Math.min(Math.max(tooltip.x - 40, 4), 300),
            top: Math.max(tooltip.y - 52, 4),
          }}
        >
          <p className="text-[11px] font-bold text-saffron-800">{tooltip.title}</p>
          {tooltip.lines.map((l, i) => (
            <p key={i} className="text-[10.5px] leading-snug text-stone-700">
              {l}
            </p>
          ))}
        </div>
      )}
    </div>
  );
});

export default VargaChart;
