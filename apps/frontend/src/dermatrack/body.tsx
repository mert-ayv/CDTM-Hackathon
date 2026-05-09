import type { BodySide, Lang, RegionAffected } from "./data";

interface RegionShape {
  id: string;
  side: BodySide;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  kind: "ellipse";
}

const REGIONS_FRONT: RegionShape[] = [
  { id: "face-l", side: "front", cx: 92, cy: 52, rx: 7, ry: 8, kind: "ellipse" },
  { id: "face-r", side: "front", cx: 108, cy: 52, rx: 7, ry: 8, kind: "ellipse" },
  { id: "neck-f", side: "front", cx: 100, cy: 80, rx: 10, ry: 5, kind: "ellipse" },
  { id: "chest", side: "front", cx: 100, cy: 112, rx: 28, ry: 16, kind: "ellipse" },
  { id: "belly", side: "front", cx: 100, cy: 156, rx: 22, ry: 14, kind: "ellipse" },
  { id: "arm-l-flex", side: "front", cx: 60, cy: 150, rx: 7, ry: 9, kind: "ellipse" },
  { id: "arm-r-flex", side: "front", cx: 140, cy: 150, rx: 7, ry: 9, kind: "ellipse" },
  { id: "wrist-l", side: "front", cx: 46, cy: 196, rx: 6, ry: 7, kind: "ellipse" },
  { id: "wrist-r", side: "front", cx: 154, cy: 196, rx: 6, ry: 7, kind: "ellipse" },
];

const REGIONS_BACK: RegionShape[] = [
  { id: "neck-b", side: "back", cx: 100, cy: 80, rx: 10, ry: 5, kind: "ellipse" },
  { id: "back-up", side: "back", cx: 100, cy: 112, rx: 28, ry: 16, kind: "ellipse" },
  { id: "back-low", side: "back", cx: 100, cy: 156, rx: 22, ry: 12, kind: "ellipse" },
  { id: "knee-l", side: "back", cx: 88, cy: 280, rx: 8, ry: 10, kind: "ellipse" },
  { id: "knee-r", side: "back", cx: 112, cy: 280, rx: 8, ry: 10, kind: "ellipse" },
];

function FigureShape({ side }: { side: BodySide }) {
  const skin = "url(#skin)";
  const stroke = "oklch(0.74 0.018 60)";
  const sw = 1;
  return (
    <g fill={skin} stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <path d="M 78 196 C 76 200 75 208 76 220 L 72 296 C 71 314 73 326 78 332 C 84 336 90 332 92 320 L 96 244 C 97 232 97 220 96 210 L 96 196 Z" />
      <path d="M 122 196 C 124 200 125 208 124 220 L 128 296 C 129 314 127 326 122 332 C 116 336 110 332 108 320 L 104 244 C 103 232 103 220 104 210 L 104 196 Z" />
      <path d="M 70 86 C 60 90 52 100 48 112 L 38 156 C 36 172 38 188 42 200 C 46 208 52 210 56 204 C 60 198 60 186 58 174 L 62 142 L 62 168 C 62 184 62 196 62 204 Z" />
      <path d="M 130 86 C 140 90 148 100 152 112 L 162 156 C 164 172 162 188 158 200 C 154 208 148 210 144 204 C 140 198 140 186 142 174 L 138 142 L 138 168 C 138 184 138 196 138 204 Z" />
      <path d="M 78 86 C 86 84 92 84 100 84 C 108 84 114 84 122 86 C 128 92 130 100 130 110 L 130 158 C 130 174 128 188 124 196 L 76 196 C 72 188 70 174 70 158 L 70 110 C 70 100 72 92 78 86 Z" />
      <path d="M 90 70 L 90 86 L 110 86 L 110 70 Z" />
      <ellipse cx={100} cy={50} rx={20} ry={22} />
      <ellipse cx={82} cy={334} rx={9} ry={3} />
      <ellipse cx={118} cy={334} rx={9} ry={3} />
      {side === "back" && (
        <>
          <path d="M 100 90 L 100 196" stroke="oklch(0.78 0.012 60)" strokeWidth={0.6} strokeDasharray="2 3" fill="none" />
          <ellipse cx={100} cy={50} rx={20} ry={22} fill="url(#skin)" />
        </>
      )}
      {side === "front" && (
        <g stroke="oklch(0.80 0.012 60)" strokeWidth={0.5} fill="none" opacity={0.55}>
          <path d="M 84 96 Q 100 102 116 96" />
          <path d="M 100 100 L 100 150" strokeDasharray="1.5 2" />
        </g>
      )}
    </g>
  );
}

export interface BodyMapProps {
  side?: BodySide;
  regions?: RegionAffected[];
  onRegionTap?: ((id: string) => void) | null;
  selectedId?: string | null;
  lang?: Lang;
}

export function BodyMap({ side = "front", regions = [], onRegionTap, selectedId }: BodyMapProps) {
  const list = side === "front" ? REGIONS_FRONT : REGIONS_BACK;
  const sevById: Record<string, number> = {};
  regions.forEach((r) => {
    if (r.side === side) sevById[r.regionId] = r.sev;
  });

  return (
    <svg viewBox="0 0 200 360" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      <defs>
        <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.965 0.012 60)" />
          <stop offset="1" stopColor="oklch(0.93 0.018 60)" />
        </linearGradient>
        <radialGradient id="hot">
          <stop offset="0" stopColor="oklch(0.78 0.18 30)" stopOpacity="0.75" />
          <stop offset="1" stopColor="oklch(0.78 0.18 30)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={100} cy={332} rx={46} ry={3.5} fill="oklch(0.20 0.012 230)" opacity={0.07} />
      <FigureShape side={side} />
      {list.map((r) => {
        const sev = sevById[r.id];
        if (!sev) return null;
        const op = 0.25 + (sev / 10) * 0.55;
        return (
          <ellipse key={r.id + "-glow"} cx={r.cx} cy={r.cy} rx={r.rx + 8} ry={r.ry + 8} fill="url(#hot)" opacity={op} />
        );
      })}
      {list.map((r) => {
        const sev = sevById[r.id] || 0;
        const isSelected = selectedId === r.id;
        const fill =
          sev > 0
            ? `oklch(${0.78 - sev * 0.012} ${0.06 + sev * 0.014} ${65 - sev * 5})`
            : "rgba(255,255,255,0.0)";
        return (
          <g key={r.id} style={{ cursor: "pointer" }} onClick={() => onRegionTap && onRegionTap(r.id)}>
            <ellipse
              cx={r.cx}
              cy={r.cy}
              rx={r.rx}
              ry={r.ry}
              fill={fill}
              stroke={isSelected ? "var(--ink)" : "oklch(0.70 0.018 60 / 0.4)"}
              strokeWidth={isSelected ? 1.6 : 0.8}
              strokeDasharray={sev > 0 ? "" : "2 2"}
            />
            {isSelected && (
              <circle
                cx={r.cx}
                cy={r.cy}
                r={Math.max(r.rx, r.ry) + 5}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export interface MiniBodyProps {
  regions: RegionAffected[];
  side?: BodySide;
  size?: number;
}

export function MiniBody({ regions, side = "front", size = 80 }: MiniBodyProps) {
  return (
    <div style={{ width: size, height: size * 1.6 }}>
      <BodyMap side={side} regions={regions} onRegionTap={null} selectedId={null} />
    </div>
  );
}
