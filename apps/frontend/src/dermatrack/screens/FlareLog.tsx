import { useMemo, useRef, useState } from "react";
import { BodyMap } from "../body";
import type { BodySide, RegionAffected } from "../data";
import {
  addFlareLog,
  makeId,
  type EnvironmentLagSnapshot,
  type FlareLogPhoto,
  type FlareLogRegion,
  type LagWindow,
  type TriggerCategory,
  type TriggerSignal,
} from "../flareLog";
import { useT } from "../i18n";
import { Icon } from "../icons";
import { Btn } from "../shell";
import type { ScreenProps } from "./types";

type Step = "skin" | "triggers" | "review";
type SymptomId = "itch" | "redness" | "dryness" | "severity";

const DEFAULT_LOCATION = { latitude: 48.1374, longitude: 11.5755 };
const STEPS: Array<{ id: Step; de: string; en: string }> = [
  { id: "skin", de: "Haut", en: "Skin" },
  { id: "triggers", de: "Trigger", en: "Triggers" },
  { id: "review", de: "Review", en: "Review" },
];
const WINDOWS: Array<{ id: LagWindow; de: string; en: string }> = [
  { id: "0-6h", de: "0-6 h", en: "0-6 h" },
  { id: "6-12h", de: "6-12 h", en: "6-12 h" },
  { id: "12-24h", de: "12-24 h", en: "12-24 h" },
];
const CATEGORIES: Array<{ id: TriggerCategory; de: string; en: string; icon: keyof typeof Icon }> = [
  { id: "food", de: "Food & drink", en: "Food & drink", icon: "bowl" },
  { id: "stress", de: "Stress", en: "Stress", icon: "bolt" },
  { id: "activity", de: "Activity & sweat", en: "Activity & sweat", icon: "run" },
  { id: "sleep", de: "Sleep", en: "Sleep", icon: "moon" },
  { id: "clothing", de: "Clothing", en: "Clothing", icon: "body" },
  { id: "care", de: "Care/detergent", en: "Care/detergent", icon: "droplet" },
  { id: "notes", de: "Other", en: "Other", icon: "info" },
];
const QUICK_CHIPS: Record<TriggerCategory, string[]> = {
  food: ["Histamine", "Dairy", "Nuts", "Wheat", "Alcohol", "Coffee"],
  stress: ["Deadline", "Conflict", "Travel", "Too few breaks"],
  activity: ["Running", "Strength training", "Heavy sweating", "Outdoor"],
  sleep: ["< 6h sleep", "Restless", "Late bedtime", "Night scratching"],
  clothing: ["Wool", "Synthetic fabric", "Tight clothing", "New detergent"],
  care: ["New cream", "Fragrance", "Peeling", "Disinfectant"],
  notes: ["Infection", "Period", "Pet contact", "House dust"],
};
const STRESSORS = ["Deadline", "Conflict", "Social situation", "Travel", "Overload", "Too few breaks"];
const ACTIVITIES = ["Running", "Strength training", "Cycling", "Yoga", "Walk", "Outdoor"];
const CLOTHING = ["Wool", "Synthetic fabric", "Tight clothing", "Scratchy label", "New detergent", "Heavy sweating"];
const CARE_PRODUCTS = ["New cream", "Fragrance", "Sunscreen", "Disinfectant", "Peeling", "New shampoo"];
const VIRTUAL_REGION_LABELS: Record<string, { de: string; en: string }> = {
  "upper-arm-l": { de: "Oberarm links", en: "Left upper arm" },
  "upper-arm-r": { de: "Oberarm rechts", en: "Right upper arm" },
  "forearm-l": { de: "Unterarm links", en: "Left forearm" },
  "forearm-r": { de: "Unterarm rechts", en: "Right forearm" },
  "thigh-l": { de: "Oberschenkel links", en: "Left thigh" },
  "thigh-r": { de: "Oberschenkel rechts", en: "Right thigh" },
  "shin-l": { de: "Unterschenkel links", en: "Left lower leg" },
  "shin-r": { de: "Unterschenkel rechts", en: "Right lower leg" },
  "foot-l": { de: "Fuss links", en: "Left foot" },
  "foot-r": { de: "Fuss rechts", en: "Right foot" },
  "shoulder-back-l": { de: "Schulter hinten links", en: "Left rear shoulder" },
  "shoulder-back-r": { de: "Schulter hinten rechts", en: "Right rear shoulder" },
  "upper-arm-back-l": { de: "Oberarm hinten links", en: "Left back upper arm" },
  "upper-arm-back-r": { de: "Oberarm hinten rechts", en: "Right back upper arm" },
  "forearm-back-l": { de: "Unterarm hinten links", en: "Left back forearm" },
  "forearm-back-r": { de: "Unterarm hinten rechts", en: "Left back forearm" },
  "glute-l": { de: "Gesaess links", en: "Left glute" },
  "glute-r": { de: "Gesaess rechts", en: "Right glute" },
  "thigh-back-l": { de: "Oberschenkel hinten links", en: "Left back thigh" },
  "thigh-back-r": { de: "Oberschenkel hinten rechts", en: "Right back thigh" },
  "calf-l": { de: "Wade links", en: "Left calf" },
  "calf-r": { de: "Wade rechts", en: "Right calf" },
  "foot-back-l": { de: "Fuss hinten links", en: "Left back foot" },
  "foot-back-r": { de: "Fuss hinten rechts", en: "Right back foot" },
};

const EMPTY_REGION = { itch: 0, redness: 0, dryness: 0, severity: 1 };

function localDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoFromLocal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function averageRegion(region: Pick<FlareLogRegion, "itch" | "redness" | "dryness" | "severity">) {
  return +((region.itch + region.redness + region.dryness + region.severity) / 4).toFixed(1);
}

function fallbackRegionLabel(id: string, lang: "de" | "en") {
  const direct = VIRTUAL_REGION_LABELS[id]?.[lang];
  if (direct) return direct;
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTime(iso: string, lang: "de" | "en") {
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtNumber(value: number | undefined, digits = 0) {
  return value === undefined ? "-" : value.toFixed(digits);
}

function triggerMetricLabel(trigger: TriggerSignal) {
  if (trigger.category === "sleep") {
    const quality = trigger.label.match(/quality\s+([\d.]+)\/5/i)?.[1];
    return quality ? `Quality ${quality}/5` : trigger.notes || null;
  }
  if (trigger.intensity === undefined) return null;
  if (trigger.category === "stress") return `Stress level ${trigger.intensity}/10`;
  if (trigger.category === "activity") return `Sweat/heat ${trigger.intensity}/10`;
  if (trigger.category === "clothing") return `Irritation ${trigger.intensity}/10`;
  if (trigger.category === "care") return `Reaction ${trigger.intensity}/10`;
  return `Level ${trigger.intensity}/10`;
}

function backendBodyRegionId(regionId: string | undefined, side: BodySide | undefined) {
  if (!regionId) return undefined;
  const direct: Record<string, string> = {
    chest: "chest",
    belly: "abdomen",
    "neck-f": "neck_front",
    "neck-b": "neck_back",
    "back-up": "upper_back",
    "back-low": "lower_back",
    "face-l": "head",
    "face-r": "head",
  };
  if (direct[regionId]) return direct[regionId];
  if (regionId.includes("arm") || regionId.includes("forearm") || regionId.includes("wrist")) {
    return regionId.includes("-r") ? (side === "back" ? "right_arm_back" : "right_arm_front") : side === "back" ? "left_arm_back" : "left_arm_front";
  }
  if (regionId.includes("thigh") || regionId.includes("shin") || regionId.includes("knee") || regionId.includes("calf") || regionId.includes("glute")) {
    return regionId.includes("-r") ? (side === "back" ? "right_leg_back" : "right_leg_front") : side === "back" ? "left_leg_back" : "left_leg_front";
  }
  if (regionId.includes("foot")) {
    return regionId.includes("-r") ? "right_foot_front" : "left_foot_front";
  }
  return undefined;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fetchEnvironmentTimeline(observedAt: string): Promise<EnvironmentLagSnapshot[]> {
  const params = new URLSearchParams({
    latitude: String(DEFAULT_LOCATION.latitude),
    longitude: String(DEFAULT_LOCATION.longitude),
    observedAt,
    lookbackHours: "24",
  });
  const response = await fetch(`/api/environment/timeline?${params.toString()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = (await response.json()) as { timeline?: EnvironmentLagSnapshot[] };
  return payload.timeline ?? [];
}

async function uploadPhoto(photo: FlareLogPhoto, regions: FlareLogRegion[], observedAt: string): Promise<FlareLogPhoto> {
  const region = photo.regionId ? regions.find((item) => item.regionId === photo.regionId) : undefined;
  try {
    const response = await fetch("/api/photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: "demo-user",
        takenAt: observedAt,
        bodyRegionId: backendBodyRegionId(photo.regionId, region?.side),
        side: region?.side,
        dataUri: photo.dataUrl,
        originalFilename: photo.name,
        severityScore: region?.severity,
        itchiness: region?.itch,
        dryness: region?.dryness,
        redness: region?.redness,
        analyze: false,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as { photo?: { id?: string } };
    return { ...photo, backendPhotoId: payload.photo?.id, uploadStatus: "uploaded" };
  } catch {
    return { ...photo, uploadStatus: "failed" };
  }
}

export function FlareLog({ data, lang, onRoute }: ScreenProps) {
  const t = useT(lang);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<Step>("skin");
  const [side, setSide] = useState<BodySide>("front");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [customRegionSide, setCustomRegionSide] = useState<Record<string, BodySide>>({});
  const [observedAtLocal, setObservedAtLocal] = useState(() => localDateTimeValue(new Date()));
  const [regions, setRegions] = useState<Record<string, FlareLogRegion>>({});
  const [photos, setPhotos] = useState<FlareLogPhoto[]>([]);
  const [triggers, setTriggers] = useState<TriggerSignal[]>([]);
  const [activeWindow, setActiveWindow] = useState<LagWindow>("0-6h");
  const [activeCategory, setActiveCategory] = useState<TriggerCategory>("food");
  const [customTrigger, setCustomTrigger] = useState("");
  const [selectedStressors, setSelectedStressors] = useState<string[]>([]);
  const [stressOther, setStressOther] = useState("");
  const [stressIntensity, setStressIntensity] = useState(5);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [activityOther, setActivityOther] = useState("");
  const [activityDuration, setActivityDuration] = useState(45);
  const [sweatIntensity, setSweatIntensity] = useState(4);
  const [selectedClothing, setSelectedClothing] = useState<string[]>([]);
  const [clothingOther, setClothingOther] = useState("");
  const [clothingIntensity, setClothingIntensity] = useState(5);
  const [selectedCare, setSelectedCare] = useState<string[]>([]);
  const [careOther, setCareOther] = useState("");
  const [careIntensity, setCareIntensity] = useState(5);
  const [notes, setNotes] = useState("");
  const [environmentTimeline, setEnvironmentTimeline] = useState<EnvironmentLagSnapshot[]>([]);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedMeta = selectedRegionId ? data.BODY_REGIONS.find((region) => region.id === selectedRegionId) : null;
  const selectedSide = selectedRegionId ? selectedMeta?.side || customRegionSide[selectedRegionId] || side : side;
  const selectedLabel = selectedRegionId ? selectedMeta?.[lang] || fallbackRegionLabel(selectedRegionId, lang) : "";
  const selectedRegion = selectedRegionId ? regions[selectedRegionId] : null;
  const regionList = useMemo(() => Object.values(regions).sort((a, b) => b.severity - a.severity), [regions]);
  const observedAtIso = toIsoFromLocal(observedAtLocal);

  const mapRegions = useMemo<RegionAffected[]>(() => {
    return regionList.map((region) => ({
      regionId: region.regionId,
      side: region.side,
      sev: averageRegion(region),
    }));
  }, [regionList]);

  const selectRegion = (regionId: string) => {
    const meta = data.BODY_REGIONS.find((region) => region.id === regionId);
    const nextSide = meta?.side || side;
    setSelectedRegionId(regionId);
    if (!meta) setCustomRegionSide((current) => (current[regionId] ? current : { ...current, [regionId]: side }));
    setRegions((current) => {
      if (current[regionId]) return current;
      return {
        ...current,
        [regionId]: {
          id: makeId("region"),
          regionId,
          regionLabel: meta?.[lang] || fallbackRegionLabel(regionId, lang),
          side: nextSide,
          ...EMPTY_REGION,
        },
      };
    });
  };

  const updateSelectedRegion = (field: SymptomId, value: number) => {
    if (!selectedRegionId) return;
    setRegions((current) => {
      const existing = current[selectedRegionId];
      if (!existing) return current;
      return { ...current, [selectedRegionId]: { ...existing, [field]: value } };
    });
  };

  const removeRegion = (regionId: string) => {
    setRegions((current) => {
      const next = { ...current };
      delete next[regionId];
      return next;
    });
    setPhotos((current) => current.filter((photo) => photo.regionId !== regionId));
    if (selectedRegionId === regionId) setSelectedRegionId(null);
  };

  const addTrigger = (label: string, options?: Partial<Pick<TriggerSignal, "category" | "intensity" | "notes">>) => {
    const clean = label.trim();
    if (!clean) return;
    setTriggers((current) => [
      ...current,
      {
        id: makeId("trigger"),
        window: activeWindow,
        category: options?.category ?? activeCategory,
        label: clean,
        intensity: options?.intensity,
        notes: options?.notes,
      },
    ]);
    setCustomTrigger("");
  };

  const toggleValue = (value: string, setter: (next: string[]) => void, current: string[]) => {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const addStructuredTriggers = () => {
    if (activeCategory === "stress") {
      const labels = [...selectedStressors, stressOther.trim()].filter(Boolean);
      if (!labels.length) return;
      labels.forEach((label) => addTrigger(label, { category: "stress", intensity: stressIntensity }));
      setSelectedStressors([]);
      setStressOther("");
      return;
    }
    if (activeCategory === "sleep") {
      addTrigger(`Sleep ${sleepHours} h`, { category: "sleep", notes: `Quality ${sleepQuality}/5` });
      return;
    }
    if (activeCategory === "activity") {
      const labels = [...selectedActivities, activityOther.trim()].filter(Boolean);
      if (!labels.length) return;
      labels.forEach((label) =>
        addTrigger(`${label} · ${activityDuration} min`, {
          category: "activity",
          intensity: sweatIntensity,
          notes: `sweat:${sweatIntensity}`,
        }),
      );
      setSelectedActivities([]);
      setActivityOther("");
      return;
    }
    if (activeCategory === "clothing") {
      const labels = [...selectedClothing, clothingOther.trim()].filter(Boolean);
      if (!labels.length) return;
      labels.forEach((label) => addTrigger(label, { category: "clothing", intensity: clothingIntensity }));
      setSelectedClothing([]);
      setClothingOther("");
      return;
    }
    if (activeCategory === "care") {
      const labels = [...selectedCare, careOther.trim()].filter(Boolean);
      if (!labels.length) return;
      labels.forEach((label) => addTrigger(label, { category: "care", intensity: careIntensity }));
      setSelectedCare([]);
      setCareOther("");
    }
  };

  const removeTrigger = (id: string) => {
    setTriggers((current) => current.filter((trigger) => trigger.id !== id));
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const nextPhotos = await Promise.all(
      imageFiles.map(async (file) => ({
        id: makeId("photo"),
        regionId: selectedRegionId ?? undefined,
        name: file.name,
        dataUrl: await fileToDataUrl(file),
        createdAt: new Date().toISOString(),
      })),
    );
    setPhotos((current) => [...current, ...nextPhotos]);
  };

  const loadTimeline = async () => {
    setEnvironmentError(null);
    try {
      const timeline = await fetchEnvironmentTimeline(observedAtIso);
      setEnvironmentTimeline(timeline);
      return timeline;
    } catch (error) {
      setEnvironmentError(error instanceof Error ? error.message : "Environment timeline unavailable");
      const fallback: EnvironmentLagSnapshot[] = [0, 6, 12, 24].map((lagHours) => ({
        lagHours,
        capturedAt: new Date(new Date(observedAtIso).getTime() - lagHours * 60 * 60 * 1000).toISOString(),
        source: "placeholder",
        weather: {
          temperatureCelsius: data.today.tempC,
          humidityPercent: data.today.humidity,
        },
        pollen: {
          birch: data.today.birchPollen,
          grass: data.today.grassPollen,
          overallRisk: data.today.birchPollen >= 3 || data.today.grassPollen >= 3 ? "high" : data.today.birchPollen >= 2 ? "medium" : "low",
        },
      }));
      setEnvironmentTimeline(fallback);
      return fallback;
    }
  };

  const finalize = async () => {
    if (regionList.length === 0) return;
    setIsSaving(true);
    const timeline = environmentTimeline.length ? environmentTimeline : await loadTimeline();
    const uploadedPhotos = await Promise.all(photos.map((photo) => uploadPhoto(photo, regionList, observedAtIso)));
    addFlareLog({
      id: makeId("flare"),
      observedAt: observedAtIso,
      createdAt: new Date().toISOString(),
      regions: regionList,
      triggers,
      photos: uploadedPhotos,
      environmentTimeline: timeline,
      notes: notes.trim() || undefined,
    });
    setIsSaving(false);
    onRoute("triggers");
  };

  const canContinueFromSkin = regionList.length > 0;
  const currentStepIndex = STEPS.findIndex((item) => item.id === step);
  const selectedPhotos = selectedRegionId ? photos.filter((photo) => photo.regionId === selectedRegionId) : photos.filter((photo) => !photo.regionId);
  const optionButton = (label: string, selected: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={"pill " + (selected ? "sage" : "neutral")}
      style={{ border: selected ? "1px solid var(--sage-d)" : 0, fontWeight: 800 }}
    >
      {selected ? "* " : "+ "}
      {label}
    </button>
  );
  const sliderRow = (label: string, value: number, max: number, onChange: (value: number) => void, suffix = "/10", min = 0, stepValue = 1) => (
    <label style={{ display: "grid", gap: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 850 }}>{label}</span>
        <span className="num" style={{ fontWeight: 850 }}>
          {value}
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={stepValue}
        value={value}
        onChange={(event) => onChange(+event.target.value)}
        style={{ width: "100%", accentColor: "var(--sage-d)" }}
      />
    </label>
  );
  const otherInput = (value: string, onChange: (value: string) => void, placeholder = "Other") => (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{
        height: 42,
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "var(--card)",
        color: "var(--ink)",
        padding: "0 12px",
      }}
    />
  );
  const triggerComposer = (() => {
    if (activeCategory === "stress") {
      return (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STRESSORS.map((item) => optionButton(item, selectedStressors.includes(item), () => toggleValue(item, setSelectedStressors, selectedStressors)))}
          </div>
          {otherInput(stressOther, setStressOther, "Other stressor")}
          {sliderRow("Stress intensity", stressIntensity, 10, setStressIntensity)}
          <Btn kind="primary" onClick={addStructuredTriggers} icon={<Icon.plus size={14} />}>
            Save stress
          </Btn>
        </>
      );
    }
    if (activeCategory === "sleep") {
      return (
        <>
          {sliderRow("Sleep duration", sleepHours, 12, setSleepHours, " h", 0, 0.5)}
          {sliderRow("Sleep quality", sleepQuality, 5, setSleepQuality, "/5", 1, 1)}
          <Btn kind="primary" onClick={addStructuredTriggers} icon={<Icon.plus size={14} />}>
            Save sleep
          </Btn>
        </>
      );
    }
    if (activeCategory === "activity") {
      return (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ACTIVITIES.map((item) => optionButton(item, selectedActivities.includes(item), () => toggleValue(item, setSelectedActivities, selectedActivities)))}
          </div>
          {otherInput(activityOther, setActivityOther, "Other activity")}
          {sliderRow("Duration", activityDuration, 180, setActivityDuration, " min", 0, 5)}
          {sliderRow("Sweat/heat", sweatIntensity, 10, setSweatIntensity)}
          <Btn kind="primary" onClick={addStructuredTriggers} icon={<Icon.plus size={14} />}>
            Save activity
          </Btn>
        </>
      );
    }
    if (activeCategory === "clothing") {
      return (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CLOTHING.map((item) => optionButton(item, selectedClothing.includes(item), () => toggleValue(item, setSelectedClothing, selectedClothing)))}
          </div>
          {otherInput(clothingOther, setClothingOther, "Other clothing or fabric")}
          {sliderRow("Friction/irritation", clothingIntensity, 10, setClothingIntensity)}
          <Btn kind="primary" onClick={addStructuredTriggers} icon={<Icon.plus size={14} />}>
            Save clothing
          </Btn>
        </>
      );
    }
    if (activeCategory === "care") {
      return (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CARE_PRODUCTS.map((item) => optionButton(item, selectedCare.includes(item), () => toggleValue(item, setSelectedCare, selectedCare)))}
          </div>
          {otherInput(careOther, setCareOther, "Other product")}
          {sliderRow("Skin reaction/uncertainty", careIntensity, 10, setCareIntensity)}
          <Btn kind="primary" onClick={addStructuredTriggers} icon={<Icon.plus size={14} />}>
            Save care
          </Btn>
        </>
      );
    }
    return (
      <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {QUICK_CHIPS[activeCategory].map((chip) => (
            <button key={chip} className="pill neutral" style={{ border: 0 }} onClick={() => addTrigger(chip)}>
              + {chip}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input
            value={customTrigger}
            onChange={(event) => setCustomTrigger(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addTrigger(customTrigger);
            }}
            placeholder={activeCategory === "food" ? "Other food or drink" : "Other"}
            style={{
              height: 42,
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "var(--card)",
              color: "var(--ink)",
              padding: "0 12px",
            }}
          />
          <Btn kind="primary" onClick={() => addTrigger(customTrigger)} icon={<Icon.plus size={14} />}>
            Add
          </Btn>
        </div>
      </>
    );
  })();

  return (
    <div className="main-inner" style={{ maxWidth: 1060, minHeight: "calc(100vh - 112px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div className="page-title" style={{ fontSize: 28, lineHeight: 1.05 }}>
            {lang === "de" ? "Flare Log" : "Flare log"}
          </div>
          <div style={{ marginTop: 6, color: "var(--ink-3)", fontSize: 14 }}>
            {lang === "de"
              ? "Erfasse Ausschlag, Trigger der letzten 24 h und Umweltwerte in einem Eintrag."
              : "Capture rash, 24 h triggers and environment in one entry."}
          </div>
        </div>
        <label style={{ display: "grid", gap: 5, minWidth: 210 }}>
          <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", fontWeight: 800 }}>
            {lang === "de" ? "Ausschlag bemerkt" : "Flare noticed"}
          </span>
          <input
            type="datetime-local"
            value={observedAtLocal}
            onChange={(event) => setObservedAtLocal(event.target.value)}
            style={{
              height: 38,
              borderRadius: 10,
              border: "1px solid var(--line)",
              padding: "0 10px",
              background: "var(--card)",
              color: "var(--ink)",
              fontWeight: 700,
            }}
          />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {STEPS.map((item, index) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "skin" || canContinueFromSkin) setStep(item.id);
            }}
            style={{
              height: 42,
              borderRadius: 12,
              border: "1px solid " + (step === item.id ? "var(--ink)" : "var(--line)"),
              background: step === item.id ? "var(--ink)" : "var(--card)",
              color: step === item.id ? "var(--bg)" : "var(--ink)",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: item.id !== "skin" && !canContinueFromSkin ? 0.45 : 1,
            }}
          >
            <span className="num">{index + 1}</span>
            {item[lang]}
          </button>
        ))}
      </div>

      {step === "skin" && (
        <div className="grid" style={{ gridTemplateColumns: "1.05fr 0.95fr", alignItems: "stretch" }}>
          <div
            style={{
              minHeight: 610,
              borderRadius: 24,
              border: "1px solid var(--line)",
              background: "linear-gradient(180deg, var(--card), color-mix(in oklch, var(--sage) 8%, var(--bg)))",
              boxShadow: "var(--shadow-sm)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 6, zIndex: 2 }}>
              {(["front", "back"] as BodySide[]).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setSide(item);
                    setSelectedRegionId(null);
                  }}
                  style={{
                    height: 34,
                    minWidth: 72,
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    background: side === item ? "var(--ink)" : "rgba(255,255,255,0.82)",
                    color: side === item ? "var(--bg)" : "var(--ink)",
                    fontWeight: 800,
                  }}
                >
                  {item === "front" ? t("vorne") : t("hinten")}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSide(side === "front" ? "back" : "front")}
              className="icon-btn"
              style={{ position: "absolute", top: 14, right: 14, width: 38, height: 38, zIndex: 2 }}
            >
              <Icon.rotate size={16} />
            </button>
            <div style={{ position: "absolute", inset: "54px 12px 18px" }}>
              <BodyMap side={side} regions={mapRegions} selectedId={selectedRegionId} onRegionTap={selectRegion} lang={lang} />
            </div>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            <div className="card-head">
              <div>
                <h3>{selectedRegionId ? selectedLabel : lang === "de" ? "Region auswaehlen" : "Select region"}</h3>
                <span className="head-sub">
                  {regionList.length} {lang === "de" ? "Region(en) im Log" : "region(s) in log"}
                </span>
              </div>
              {selectedRegionId && (
                <button className="icon-btn" onClick={() => removeRegion(selectedRegionId)} style={{ width: 34, height: 34 }}>
                  <Icon.close size={15} />
                </button>
              )}
            </div>

            <div className="card-pad" style={{ display: "grid", gap: 16 }}>
              {selectedRegion ? (
                <>
                  {(
                    [
                      { id: "severity", label: lang === "de" ? "Staerke" : "Severity", color: "oklch(0.62 0.18 25)" },
                      { id: "itch", label: t("juckreiz"), color: "oklch(0.62 0.16 32)" },
                      { id: "redness", label: lang === "de" ? "Roetung" : "Redness", color: "oklch(0.61 0.18 24)" },
                      { id: "dryness", label: t("trockenheit"), color: "oklch(0.63 0.10 78)" },
                    ] as Array<{ id: SymptomId; label: string; color: string }>
                  ).map((row) => (
                    <label key={row.id} style={{ display: "grid", gap: 7 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 800 }}>{row.label}</span>
                        <span className="num" style={{ fontSize: 18, fontWeight: 850 }}>
                          {selectedRegion[row.id].toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={0.1}
                        value={selectedRegion[row.id]}
                        onChange={(event) => updateSelectedRegion(row.id, +event.target.value)}
                        style={{ width: "100%", accentColor: row.color }}
                      />
                    </label>
                  ))}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void handlePhotoFiles(event.target.files);
                      event.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      height: 44,
                      borderRadius: 14,
                      border: "1px dashed var(--line)",
                      background: "color-mix(in oklch, var(--sage) 10%, var(--card))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontWeight: 800,
                    }}
                  >
                    <Icon.camera size={16} />
                    {lang === "de" ? "Foto hinzufuegen" : "Add photo"}
                  </button>

                  {selectedPhotos.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                      {selectedPhotos.map((photo) => (
                        <div key={photo.id} style={{ aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
                          <img src={photo.dataUrl} alt={photo.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    minHeight: 230,
                    borderRadius: 18,
                    border: "1px dashed var(--line)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--ink-3)",
                    textAlign: "center",
                    padding: 20,
                    fontWeight: 700,
                  }}
                >
                  {lang === "de" ? "Tippe auf der Body Map auf die betroffene Region." : "Tap the affected area on the body map."}
                </div>
              )}

              {regionList.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {regionList.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => {
                        setSide(region.side);
                        setSelectedRegionId(region.regionId);
                      }}
                      className={"pill " + (selectedRegionId === region.regionId ? "clay" : "neutral")}
                      style={{ border: 0 }}
                    >
                      {region.regionLabel} <span className="num">{region.severity.toFixed(1)}</span>
                    </button>
                  ))}
                </div>
              )}

              <Btn kind="sage" size="lg" onClick={() => canContinueFromSkin && setStep("triggers")} icon={<Icon.arrowRight size={16} />}>
                {lang === "de" ? "Weiter zu Triggern" : "Continue to triggers"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {step === "triggers" && (
        <div className="grid" style={{ gridTemplateColumns: "0.86fr 1.14fr" }}>
          <div className="card">
            <div className="card-head">
              <h3>{lang === "de" ? "Zeitfenster" : "Time window"}</h3>
              <span className="head-sub">0-24 h</span>
            </div>
            <div className="card-pad" style={{ display: "grid", gap: 8 }}>
              {WINDOWS.map((window) => (
                <button
                  key={window.id}
                  onClick={() => setActiveWindow(window.id)}
                  style={{
                    height: 46,
                    borderRadius: 13,
                    border: "1px solid " + (activeWindow === window.id ? "var(--ink)" : "var(--line)"),
                    background: activeWindow === window.id ? "var(--ink)" : "var(--card)",
                    color: activeWindow === window.id ? "var(--bg)" : "var(--ink)",
                    fontWeight: 850,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 14px",
                  }}
                >
                  <span>{window[lang]}</span>
                  <span className="num">{triggers.filter((trigger) => trigger.window === window.id).length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>{lang === "de" ? "Trigger erfassen" : "Add triggers"}</h3>
                <span className="head-sub">{activeWindow}</span>
              </div>
            </div>
            <div className="card-pad" style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {CATEGORIES.map((category) => {
                  const IconCmp = Icon[category.icon];
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      style={{
                        height: 34,
                        borderRadius: 999,
                        border: "1px solid " + (activeCategory === category.id ? "var(--ink)" : "var(--line)"),
                        background: activeCategory === category.id ? "var(--ink)" : "var(--card)",
                        color: activeCategory === category.id ? "var(--bg)" : "var(--ink)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 11px",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      <IconCmp size={14} />
                      {category[lang]}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid var(--line-2)",
                  background: "color-mix(in oklch, var(--bg) 62%, var(--card))",
                  padding: 14,
                  display: "grid",
                  gap: 13,
                }}
              >
                {triggerComposer}
              </div>

              <div style={{ display: "grid", gap: 9 }}>
                {triggers.length === 0 ? (
                  <div style={{ padding: 18, borderRadius: 14, background: "var(--bg-2)", color: "var(--ink-3)", textAlign: "center" }}>
                    {lang === "de" ? "Noch keine Trigger erfasst." : "No triggers captured yet."}
                  </div>
                ) : (
                  triggers.map((trigger) => (
                    <div
                      key={trigger.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "90px 1fr auto 34px",
                        gap: 10,
                        alignItems: "center",
                        padding: 10,
                        borderRadius: 14,
                        border: "1px solid var(--line-2)",
                        background: "var(--card)",
                      }}
                    >
                      <span className="pill neutral">{trigger.window}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {trigger.label}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                          {CATEGORIES.find((category) => category.id === trigger.category)?.[lang]}
                        </div>
                      </div>
                      {triggerMetricLabel(trigger) ? (
                        <span className="pill sage" style={{ justifySelf: "end", whiteSpace: "nowrap" }}>
                          {triggerMetricLabel(trigger)}
                        </span>
                      ) : (
                        <span />
                      )}
                      <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => removeTrigger(trigger.id)}>
                        <Icon.close size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <Btn kind="ghost" onClick={() => setStep("skin")}>
                  {lang === "de" ? "Zurueck" : "Back"}
                </Btn>
                <Btn kind="sage" onClick={() => setStep("review")} icon={<Icon.arrowRight size={16} />}>
                  {lang === "de" ? "Review" : "Review"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="grid" style={{ gridTemplateColumns: "1.2fr 0.8fr" }}>
          <div className="card">
            <div className="card-head">
              <div>
                <h3>{lang === "de" ? "Eintrag finalisieren" : "Finalize entry"}</h3>
                <span className="head-sub">{formatTime(observedAtIso, lang)}</span>
              </div>
              <Btn kind="ghost" size="sm" onClick={() => void loadTimeline()} icon={<Icon.cloud size={14} />}>
                {lang === "de" ? "Umwelt laden" : "Load environment"}
              </Btn>
            </div>
            <div className="card-pad" style={{ display: "grid", gap: 16 }}>
              <div>
                <div className="stat-label">{lang === "de" ? "Regionen" : "Regions"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                  {regionList.map((region) => (
                    <span key={region.id} className="pill clay">
                      {region.regionLabel} <span className="num">{region.severity.toFixed(1)}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="stat-label">{lang === "de" ? "Trigger nach Zeitfenster" : "Triggers by window"}</div>
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {WINDOWS.map((window) => (
                    <div key={window.id} style={{ padding: 12, borderRadius: 14, background: "var(--bg-2)" }}>
                      <div style={{ fontSize: 12, fontWeight: 850, marginBottom: 7 }}>{window[lang]}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {triggers.filter((trigger) => trigger.window === window.id).length === 0 ? (
                          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{lang === "de" ? "Keine Angabe" : "No entry"}</span>
                        ) : (
                          triggers
                            .filter((trigger) => trigger.window === window.id)
                            .map((trigger) => (
                              <span key={trigger.id} className="pill neutral">
                                {trigger.label}
                              </span>
                            ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span className="stat-label">{lang === "de" ? "Notizen" : "Notes"}</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder={lang === "de" ? "Was ist sonst wichtig?" : "Anything else important?"}
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--line)",
                    background: "var(--card)",
                    color: "var(--ink)",
                    padding: 12,
                    resize: "vertical",
                  }}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <Btn kind="ghost" onClick={() => setStep("triggers")}>
                  {lang === "de" ? "Zurueck" : "Back"}
                </Btn>
                <Btn kind="sage" onClick={() => void finalize()} icon={<Icon.check size={16} />} style={{ opacity: isSaving ? 0.72 : 1 }}>
                  {isSaving ? (lang === "de" ? "Speichert..." : "Saving...") : lang === "de" ? "Eintrag speichern" : "Save entry"}
                </Btn>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>{lang === "de" ? "Umwelt-Rueckblick" : "Environment lookback"}</h3>
              <span className="head-sub">24 h</span>
            </div>
            <div className="card-pad" style={{ display: "grid", gap: 10 }}>
              {environmentError && (
                <div style={{ padding: 10, borderRadius: 12, background: "var(--bg-2)", color: "var(--ink-3)", fontSize: 12 }}>
                  {lang === "de" ? "Live-Daten nicht verfuegbar, Fallback aktiv." : "Live data unavailable, fallback active."}
                </div>
              )}
              {environmentTimeline.length === 0 ? (
                <button
                  onClick={() => void loadTimeline()}
                  style={{
                    minHeight: 160,
                    borderRadius: 16,
                    border: "1px dashed var(--line)",
                    background: "var(--bg-2)",
                    color: "var(--ink-2)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                  }}
                >
                  {lang === "de" ? "Wetter & Pollen laden" : "Load weather & pollen"}
                </button>
              ) : (
                environmentTimeline.map((item) => (
                  <div key={item.lagHours} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--line-2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                      <strong>{item.lagHours === 0 ? "0 h" : `-${item.lagHours} h`}</strong>
                      <span style={{ color: "var(--ink-3)", fontSize: 11 }}>{formatTime(item.capturedAt, lang)}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                      <span className="pill neutral">{fmtNumber(item.weather?.temperatureCelsius, 1)} C</span>
                      <span className="pill neutral">{fmtNumber(item.weather?.humidityPercent)}% RH</span>
                      <span className="pill neutral">Birke {fmtNumber(item.pollen?.birch, 1)}</span>
                      <span className="pill neutral">Gras {fmtNumber(item.pollen?.grass, 1)}</span>
                    </div>
                  </div>
                ))
              )}
              {photos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {photos.map((photo) => (
                    <img key={photo.id} src={photo.dataUrl} alt={photo.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12 }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStepIndex >= 0 && (
        <div style={{ marginTop: 16, color: "var(--ink-3)", fontSize: 11, textAlign: "center" }}>
          {lang === "de"
            ? "Tracking dient der Mustererkennung und ersetzt keine medizinische Diagnose."
            : "Tracking supports pattern detection and does not replace medical diagnosis."}
        </div>
      )}
    </div>
  );
}
