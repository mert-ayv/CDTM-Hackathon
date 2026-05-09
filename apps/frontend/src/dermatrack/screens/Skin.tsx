import { useEffect, useMemo, useRef, useState } from "react";
import { createFlareObservation, DEMO_USER_ID } from "../api";
import { BodyMap } from "../body";
import type { BodySide, RegionAffected } from "../data";
import { useT } from "../i18n";
import { Icon } from "../icons";
import type { ScreenProps } from "./types";

type SymptomId = "itch" | "redness" | "dryness";
type SymptomValues = Record<SymptomId, number>;
interface RegionPhoto {
  id: string;
  name: string;
  url: string;
  createdAt: number;
}

interface SkinLogEntry {
  id: string;
  regionId: string;
  regionLabel: string;
  side: BodySide;
  values: SymptomValues;
  photoCount: number;
  createdAt: Date;
}

const EMPTY_VALUES: SymptomValues = { itch: 0, redness: 0, dryness: 0 };

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
  "forearm-back-r": { de: "Unterarm hinten rechts", en: "Right back forearm" },
  "glute-l": { de: "Gesaess links", en: "Left glute" },
  "glute-r": { de: "Gesaess rechts", en: "Right glute" },
  "thigh-back-l": { de: "Oberschenkel hinten links", en: "Left back thigh" },
  "thigh-back-r": { de: "Oberschenkel hinten rechts", en: "Right back thigh" },
  "calf-l": { de: "Wade links", en: "Left calf" },
  "calf-r": { de: "Wade rechts", en: "Right calf" },
  "foot-back-l": { de: "Fuss hinten links", en: "Left back foot" },
  "foot-back-r": { de: "Fuss hinten rechts", en: "Right back foot" },
};

function valuesFromSeverity(sev: number): SymptomValues {
  return {
    itch: Math.min(10, +(sev * 1.05).toFixed(1)),
    redness: Math.min(10, +(sev * 0.9).toFixed(1)),
    dryness: Math.min(10, +(sev * 0.95).toFixed(1)),
  };
}

function averageSeverity(values: SymptomValues) {
  return +((values.itch + values.redness + values.dryness) / 3).toFixed(1);
}

function fallbackRegionLabel(id: string, lang: "de" | "en") {
  const direct = VIRTUAL_REGION_LABELS[id]?.[lang];
  if (direct) return direct;
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function entryDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatEntryDate(date: Date, lang: "de" | "en") {
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatEntryTime(date: Date, lang: "de" | "en") {
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function Skin({ data, lang }: ScreenProps) {
  const t = useT(lang);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photosByRegionRef = useRef<Record<string, RegionPhoto[]>>({});
  const [side, setSide] = useState<BodySide>("front");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [customRegionSide, setCustomRegionSide] = useState<Record<string, BodySide>>({});
  const [photosByRegion, setPhotosByRegion] = useState<Record<string, RegionPhoto[]>>({});
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<SkinLogEntry[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "backend" | "local">("idle");
  const [symptomsByRegion, setSymptomsByRegion] = useState<Record<string, SymptomValues>>(() => {
    const initial: Record<string, SymptomValues> = {};
    data.today.regions.forEach((region) => {
      initial[region.regionId] = valuesFromSeverity(region.sev);
    });
    return initial;
  });

  const selectedMeta = selectedRegion ? data.BODY_REGIONS.find((region) => region.id === selectedRegion) : null;
  const selectedSide = selectedRegion ? selectedMeta?.side || customRegionSide[selectedRegion] || side : null;
  const selectedLabel = selectedRegion ? selectedMeta?.[lang] || fallbackRegionLabel(selectedRegion, lang) : "";
  const selectedValues = selectedRegion ? symptomsByRegion[selectedRegion] || EMPTY_VALUES : EMPTY_VALUES;
  const selectedPhotos = selectedRegion ? photosByRegion[selectedRegion] || [] : [];
  const logGroups = useMemo(() => {
    return logEntries.reduce<Array<{ key: string; date: Date; entries: SkinLogEntry[] }>>((groups, entry) => {
      const key = entryDateKey(entry.createdAt);
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.push({ key, date: entry.createdAt, entries: [entry] });
      }
      return groups;
    }, []);
  }, [logEntries]);

  photosByRegionRef.current = photosByRegion;

  useEffect(() => {
    return () => {
      Object.values(photosByRegionRef.current)
        .flat()
        .forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, []);

  const regions = useMemo<RegionAffected[]>(
    () => {
      const knownIds = new Set(data.BODY_REGIONS.map((region) => region.id));
      const trackedIds = new Set([
        ...Object.keys(symptomsByRegion).filter((regionId) => !knownIds.has(regionId)),
        ...Object.keys(photosByRegion).filter((regionId) => !knownIds.has(regionId)),
      ]);
      if (selectedRegion && !knownIds.has(selectedRegion)) trackedIds.add(selectedRegion);

      return [
        ...data.BODY_REGIONS.map((region) => ({
          regionId: region.id,
          side: region.side,
          sev: averageSeverity(symptomsByRegion[region.id] || EMPTY_VALUES),
        })),
        ...Array.from(trackedIds).map((regionId) => ({
          regionId,
          side: customRegionSide[regionId] || side,
          sev: averageSeverity(symptomsByRegion[regionId] || EMPTY_VALUES),
        })),
      ].filter((region) => region.sev > 0 || region.regionId === selectedRegion || (photosByRegion[region.regionId]?.length ?? 0) > 0);
    },
    [customRegionSide, data.BODY_REGIONS, photosByRegion, selectedRegion, side, symptomsByRegion],
  );

  const setSymptom = (id: SymptomId, value: number) => {
    if (!selectedRegion) return;
    setSymptomsByRegion((current) => ({
      ...current,
      [selectedRegion]: {
        ...(current[selectedRegion] || EMPTY_VALUES),
        [id]: value,
      },
    }));
  };

  const selectSide = (nextSide: BodySide) => {
    setSide(nextSide);
    if (selectedSide && selectedSide !== nextSide) setSelectedRegion(null);
  };

  const handleRegionTap = (regionId: string) => {
    setSelectedRegion(regionId);
    if (!data.BODY_REGIONS.some((region) => region.id === regionId)) {
      setCustomRegionSide((current) => (current[regionId] ? current : { ...current, [regionId]: side }));
    }
  };

  const triggerPhotoUpload = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoFiles = (files: FileList | null) => {
    if (!selectedRegion || !files?.length) return;

    const nextPhotos = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${file.name}`,
        name: file.name,
        url: URL.createObjectURL(file),
        createdAt: Date.now(),
      }));

    if (!nextPhotos.length) return;

    setPhotosByRegion((current) => ({
      ...current,
      [selectedRegion]: [...(current[selectedRegion] || []), ...nextPhotos],
    }));
  };

  const removePhoto = (photo: RegionPhoto) => {
    if (!selectedRegion) return;
    URL.revokeObjectURL(photo.url);
    setPhotosByRegion((current) => ({
      ...current,
      [selectedRegion]: (current[selectedRegion] || []).filter((item) => item.id !== photo.id),
    }));
  };

  const saveCurrentEntry = async () => {
    if (!selectedRegion || !selectedSide) return;
    const createdAt = new Date();
    const entry: SkinLogEntry = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${createdAt.getTime()}-${selectedRegion}`,
      regionId: selectedRegion,
      regionLabel: selectedLabel,
      side: selectedSide,
      values: { ...selectedValues },
      photoCount: selectedPhotos.length,
      createdAt,
    };

    setLogEntries((current) => [
      entry,
      ...current,
    ]);
    setIsLogOpen(true);
    setSaveState("saving");

    const avg = averageSeverity(selectedValues);
    const result = await createFlareObservation({
      userId: DEMO_USER_ID,
      observedAt: createdAt.toISOString(),
      bodyRegionId: selectedRegion,
      side: selectedSide,
      intensity: Math.min(5, Math.max(1, Math.round(avg / 2))) as 1 | 2 | 3 | 4 | 5,
      itchiness: selectedValues.itch,
      dryness: selectedValues.dryness,
      redness: selectedValues.redness,
      scorradTotal: data.today.scorad,
      notes:
        selectedPhotos.length > 0
          ? `Saved from body map with ${selectedPhotos.length} photo(s).`
          : "Saved from body map.",
    });

    setSaveState(result.source === "backend" ? "backend" : "local");
  };

  const symptomRows: Array<{ id: SymptomId; label: string; color: string }> = [
    { id: "itch", label: t("juckreiz"), color: "oklch(0.62 0.16 32)" },
    { id: "redness", label: t("röte"), color: "oklch(0.61 0.18 24)" },
    { id: "dryness", label: t("trockenheit"), color: "oklch(0.63 0.10 78)" },
  ];

  return (
    <div className="main-inner" style={{ maxWidth: 980, minHeight: "calc(100vh - 112px)", paddingBottom: 18 }}>
      <div
        style={{
          minHeight: "calc(100vh - 150px)",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="page-title" style={{ fontSize: 24, lineHeight: 1.05 }}>
              {t("körperkarte")}
            </div>
            <div style={{ marginTop: 5, fontSize: 13, color: "var(--ink-3)" }}>
              {lang === "de" ? "Region antippen und Symptome eintragen." : "Tap a region and enter symptoms."}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              border: "1px solid var(--line)",
              borderRadius: 14,
              background: "var(--card)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {[
              { id: "front" as BodySide, label: t("vorne") },
              { id: "back" as BodySide, label: t("hinten") },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => selectSide(item.id)}
                style={{
                  height: 34,
                  minWidth: 72,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: 0,
                  background: side === item.id ? "var(--ink)" : "transparent",
                  color: side === item.id ? "var(--bg)" : "var(--ink-2)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            minHeight: 460,
            borderRadius: 26,
            border: "1px solid var(--line)",
            background: "linear-gradient(180deg, var(--card), color-mix(in oklch, var(--sage) 8%, var(--bg)))",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: "22px 10px 18px" }}>
            <BodyMap side={side} regions={regions} selectedId={selectedRegion} onRegionTap={handleRegionTap} lang={lang} />
          </div>
          <button
            onClick={() => selectSide(side === "front" ? "back" : "front")}
            className="icon-btn"
            style={{ position: "absolute", top: 14, right: 14, width: 38, height: 38 }}
            aria-label={lang === "de" ? "Ansicht drehen" : "Rotate view"}
          >
            <Icon.rotate size={16} />
          </button>
        </div>

        {selectedRegion ? (
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 22,
              background: "var(--card)",
              boxShadow: "0 18px 50px rgba(29, 24, 18, 0.12)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", fontWeight: 800 }}>
                  {lang === "de" ? "Ausgewählte Region" : "Selected region"}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{selectedLabel}</div>
                {saveState !== "idle" && (
                  <div style={{ marginTop: 6 }}>
                    <span className={"pill " + (saveState === "backend" ? "sage" : saveState === "local" ? "warn" : "neutral")}>
                      {saveState === "saving"
                        ? lang === "de"
                          ? "Synchronisiert..."
                          : "Syncing..."
                        : saveState === "backend"
                        ? lang === "de"
                          ? "Backend gespeichert"
                          : "Saved to backend"
                        : lang === "de"
                        ? "Demo-Fallback gespeichert"
                        : "Saved to demo fallback"}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={triggerPhotoUpload}>
                  <Icon.camera size={16} />
                </button>
                <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setSelectedRegion(null)}>
                  <Icon.close size={16} />
                </button>
              </div>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                handlePhotoFiles(event.target.files);
                event.target.value = "";
              }}
              style={{ display: "none" }}
            />

            <div style={{ display: "grid", gap: 14 }}>
              {symptomRows.map((row) => (
                <label key={row.id} style={{ display: "grid", gap: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: row.color }} />
                      {row.label}
                    </span>
                    <span className="num" style={{ fontSize: 18, fontWeight: 800 }}>
                      {selectedValues[row.id].toFixed(1)}
                      <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>/10</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.1}
                    value={selectedValues[row.id]}
                    onChange={(event) => setSymptom(row.id, +event.target.value)}
                    style={{ width: "100%", accentColor: row.color }}
                  />
                </label>
              ))}
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <button
                onClick={triggerPhotoUpload}
                style={{
                  height: 44,
                  borderRadius: 14,
                  border: "1px dashed var(--line)",
                  background: "color-mix(in oklch, var(--sage) 10%, var(--card))",
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 750,
                }}
              >
                <Icon.camera size={16} />
                {lang === "de" ? "Foto hinzufügen" : "Add photo"}
              </button>

              {selectedPhotos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                  {selectedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        position: "relative",
                        aspectRatio: "1",
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid var(--line)",
                        background: "var(--bg-2)",
                      }}
                    >
                      <img src={photo.url} alt={photo.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <button
                        onClick={() => removePhoto(photo)}
                        className="icon-btn"
                        style={{
                          position: "absolute",
                          top: 5,
                          right: 5,
                          width: 24,
                          height: 24,
                          background: "rgba(255,255,255,0.9)",
                        }}
                        aria-label={lang === "de" ? "Foto entfernen" : "Remove photo"}
                      >
                        <Icon.close size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={saveCurrentEntry}
                style={{
                  height: 46,
                  borderRadius: 14,
                  border: "1px solid var(--ink)",
                  background: "var(--ink)",
                  color: "var(--bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                <Icon.plus size={16} color="var(--bg)" />
                {saveState === "saving"
                  ? lang === "de"
                    ? "Speichert..."
                    : "Saving..."
                  : lang === "de"
                  ? "Eintrag speichern"
                  : "Save entry"}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              minHeight: 68,
              border: "1px solid var(--line)",
              borderRadius: 22,
              background: "color-mix(in oklch, var(--card) 82%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-3)",
              fontSize: 14,
              fontWeight: 650,
            }}
          >
            {lang === "de" ? "Tippe auf eine Körperregion." : "Tap a body region."}
          </div>
        )}

        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 22,
            background: "var(--card)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setIsLogOpen((open) => !open)}
            style={{
              width: "100%",
              border: 0,
              background: "transparent",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              color: "var(--ink)",
            }}
          >
            <span style={{ display: "grid", gap: 2, textAlign: "left" }}>
              <span style={{ fontSize: 15, fontWeight: 850 }}>{lang === "de" ? "Eintragsübersicht" : "Entry overview"}</span>
              <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>
                {logEntries.length} {lang === "de" ? "gespeicherte Einträge" : "saved entries"}
              </span>
            </span>
            <Icon.chevDown
              size={18}
              style={{ transform: isLogOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease" }}
            />
          </button>

          {isLogOpen && (
            <div style={{ borderTop: "1px solid var(--line-2)", padding: 12, display: "grid", gap: 12 }}>
              {logEntries.length === 0 ? (
                <div style={{ padding: 14, color: "var(--ink-3)", fontSize: 13, textAlign: "center" }}>
                  {lang === "de"
                    ? "Noch keine Einträge. Wähle eine Region und speichere die Werte."
                    : "No entries yet. Select a region and save the values."}
                </div>
              ) : (
                logGroups.map((group) => (
                  <div key={group.key} style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 800, padding: "0 4px" }}>
                      {formatEntryDate(group.date, lang)}
                    </div>
                    {group.entries.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "64px 1fr",
                          gap: 10,
                          padding: 12,
                          border: "1px solid var(--line-2)",
                          borderRadius: 14,
                          background: "color-mix(in oklch, var(--bg) 58%, var(--card))",
                        }}
                      >
                        <div className="num" style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 800 }}>
                          {formatEntryTime(entry.createdAt, lang)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                            <div style={{ fontSize: 14, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {entry.regionLabel}
                            </div>
                            <div className="num" style={{ fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                              {entry.side === "front" ? t("vorne") : t("hinten")}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            {symptomRows.map((row) => (
                              <span
                                key={row.id}
                                style={{
                                  borderRadius: 999,
                                  background: "var(--card)",
                                  border: "1px solid var(--line)",
                                  padding: "4px 8px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {row.label}: <span className="num">{entry.values[row.id].toFixed(1)}</span>
                              </span>
                            ))}
                            {entry.photoCount > 0 && (
                              <span
                                style={{
                                  borderRadius: 999,
                                  background: "color-mix(in oklch, var(--sage) 16%, var(--card))",
                                  border: "1px solid var(--line)",
                                  padding: "4px 8px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {entry.photoCount} {lang === "de" ? "Foto(s)" : "photo(s)"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
