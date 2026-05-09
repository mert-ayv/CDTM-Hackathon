import { useEffect, useMemo, useRef } from "react";
import { BodyChart, ViewSide } from "body-muscles";
import type { BodyState, MuscleId } from "body-muscles";
import type { BodySide, Lang, RegionAffected } from "./data";

const REGION_MUSCLES: Record<string, MuscleId[]> = {
  "face-l": ["face", "head"],
  "face-r": ["face", "head"],
  "neck-f": ["neck-left", "neck-right"],
  chest: ["chest-upper-left", "chest-lower-left", "chest-upper-right", "chest-lower-right"],
  belly: ["abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right", "obliques-left", "obliques-right"],
  "arm-l-flex": ["elbow-left", "biceps-left"],
  "arm-r-flex": ["elbow-right", "biceps-right"],
  "upper-arm-l": ["shoulder-front-left", "shoulder-side-left", "biceps-left"],
  "upper-arm-r": ["shoulder-front-right", "shoulder-side-right", "biceps-right"],
  "forearm-l": ["forearm-left"],
  "forearm-r": ["forearm-right"],
  "wrist-l": ["hand-left", "forearm-left"],
  "wrist-r": ["hand-right", "forearm-right"],
  "thigh-l": ["hip-flexor-left", "quads-left", "adductors-left"],
  "thigh-r": ["hip-flexor-right", "quads-right", "adductors-right"],
  "shin-l": ["tibialis-anterior-left", "knee-left"],
  "shin-r": ["tibialis-anterior-right", "knee-right"],
  "foot-l": ["foot-left"],
  "foot-r": ["foot-right"],
  "neck-b": ["nape", "head-back"],
  "back-up": ["traps-upper-left", "traps-mid-left", "traps-lower-left", "traps-upper-right", "traps-mid-right", "traps-lower-right"],
  "back-low": ["spine", "lower-back-erectors-left", "lower-back-ql-left", "lower-back-erectors-right", "lower-back-ql-right"],
  "shoulder-back-l": ["deltoid-rear-left"],
  "shoulder-back-r": ["deltoid-rear-right"],
  "upper-arm-back-l": ["triceps-long-left", "triceps-lateral-left"],
  "upper-arm-back-r": ["triceps-long-right", "triceps-lateral-right"],
  "forearm-back-l": ["forearm-flexors-left", "forearm-extensors-left"],
  "forearm-back-r": ["forearm-flexors-right", "forearm-extensors-right"],
  "glute-l": ["gluteus-medius-left", "gluteus-maximus-left"],
  "glute-r": ["gluteus-medius-right", "gluteus-maximus-right"],
  "thigh-back-l": ["hamstrings-medial-left", "hamstrings-lateral-left"],
  "thigh-back-r": ["hamstrings-medial-right", "hamstrings-lateral-right"],
  "knee-l": ["knee-back-left", "hamstrings-medial-left", "hamstrings-lateral-left"],
  "knee-r": ["knee-back-right", "hamstrings-medial-right", "hamstrings-lateral-right"],
  "calf-l": ["calves-gastroc-medial-left", "calves-gastroc-lateral-left", "calves-soleus-left"],
  "calf-r": ["calves-gastroc-medial-right", "calves-gastroc-lateral-right", "calves-soleus-right"],
  "foot-back-l": ["foot-back-left"],
  "foot-back-r": ["foot-back-right"],
};

const MUSCLE_TO_REGION = Object.entries(REGION_MUSCLES).reduce<Record<string, string>>((acc, [regionId, muscleIds]) => {
  muscleIds.forEach((muscleId) => {
    if (!acc[muscleId]) acc[muscleId] = regionId;
  });
  return acc;
}, {});

function toViewSide(side: BodySide) {
  return side === "front" ? ViewSide.FRONT : ViewSide.BACK;
}

function buildBodyState(regions: RegionAffected[], side: BodySide, selectedId: string | null | undefined): BodyState {
  const bodyState: BodyState = {};

  regions.forEach((region) => {
    if (region.side !== side) return;
    const muscleIds = REGION_MUSCLES[region.regionId] || [region.regionId];
    muscleIds.forEach((muscleId) => {
      bodyState[muscleId] = {
        intensity: region.sev,
        selected: region.regionId === selectedId,
      };
    });
  });

  if (selectedId) {
    const selectedMuscles = REGION_MUSCLES[selectedId] || [selectedId];
    if (selectedMuscles.some((id) => !bodyState[id]?.selected)) {
      selectedMuscles.forEach((muscleId) => {
        bodyState[muscleId] = {
          intensity: Math.max(bodyState[muscleId]?.intensity ?? 0, 1),
          selected: true,
        };
      });
    }
  }

  return bodyState;
}

function restyleChart(container: HTMLDivElement) {
  const wrapper = container.querySelector<HTMLElement>(".body-chart-container");
  const svg = container.querySelector<SVGSVGElement>(".body-chart-svg");

  if (wrapper) {
    wrapper.style.padding = "0";
    wrapper.style.alignItems = "stretch";
  }

  if (svg) {
    svg.style.maxHeight = "100%";
    svg.style.maxWidth = "100%";
    svg.style.height = "100%";
    svg.style.filter = "drop-shadow(0 10px 18px rgba(42, 35, 26, 0.11))";
  }
}

export interface BodyMapProps {
  side?: BodySide;
  regions?: RegionAffected[];
  onRegionTap?: ((id: string) => void) | null;
  selectedId?: string | null;
  lang?: Lang;
}

export function BodyMap({ side = "front", regions = [], onRegionTap, selectedId, lang = "de" }: BodyMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<BodyChart | null>(null);
  const sideRef = useRef(side);
  const onRegionTapRef = useRef(onRegionTap);
  const bodyState = useMemo(() => buildBodyState(regions, side, selectedId), [regions, side, selectedId]);

  sideRef.current = side;
  onRegionTapRef.current = onRegionTap;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    chartRef.current = new BodyChart(host, {
      view: toViewSide(side),
      bodyState,
      ariaLabel: lang === "de" ? "Interaktive Koerperkarte fuer Hauttracking" : "Interactive skin tracking body map",
      enableTransitions: true,
      onMuscleClick: (muscleId) => {
        onRegionTapRef.current?.(MUSCLE_TO_REGION[muscleId] || muscleId);
      },
    });

    restyleChart(host);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.update({ view: toViewSide(side), bodyState });
    if (hostRef.current) restyleChart(hostRef.current);
  }, [bodyState, side]);

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
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
