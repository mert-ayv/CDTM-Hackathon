import { useEffect, useState } from "react";
import { createDiaryEntry, DEMO_USER_ID } from "../api";
import { DayStrip } from "../components/DayStrip";
import type { Food } from "../data";
import { fmtDate, fmtDay, fmtTime, useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

const ACTIVITIES = [
  { id: "lauf", de: "Laufen", en: "Running" },
  { id: "yoga", de: "Yoga", en: "Yoga" },
  { id: "rad", de: "Radfahren", en: "Cycling" },
  { id: "kraft", de: "Krafttraining", en: "Strength" },
  { id: "spazier", de: "Spaziergang", en: "Walk" },
  { id: "keine", de: "Keine", en: "None" },
] as const;

const FOOD_TAGS = [
  { id: "Histamin", de: "Histamin", en: "Histamine" },
  { id: "Gluten", de: "Gluten", en: "Gluten" },
  { id: "Milch", de: "Milch", en: "Dairy" },
  { id: "Nüsse", de: "Nüsse", en: "Nuts" },
  { id: "Alkohol", de: "Alkohol", en: "Alcohol" },
  { id: "Koffein", de: "Koffein", en: "Caffeine" },
] as const;

const TRIGGER_CATEGORY_BY_TAG: Record<string, string> = {
  Histamin: "histamine",
  Alkohol: "alcohol",
  Gluten: "gluten",
  Milch: "dairy",
  Nüsse: "nuts",
  Koffein: "custom",
};

interface MealSlot {
  id: string;
  time: string;
  label: { de: string; en: string };
  foods: Food[];
  hasPhoto: boolean;
}

function makeMealSlots(foods: Food[], hasDayPhoto: boolean): MealSlot[] {
  const breakfast = foods.slice(0, 2);
  const lunch = foods.slice(2, 4);
  const dinner = foods.slice(4, 6);
  return [
    {
      id: "breakfast",
      time: "08:15",
      label: { de: "Frühstück", en: "Breakfast" },
      foods: breakfast,
      hasPhoto: false,
    },
    {
      id: "lunch",
      time: "12:30",
      label: { de: "Mittag", en: "Lunch" },
      foods: lunch,
      hasPhoto: hasDayPhoto,
    },
    {
      id: "dinner",
      time: "19:00",
      label: { de: "Abend", en: "Dinner" },
      foods: dinner,
      hasPhoto: false,
    },
  ];
}

export function Entry({ data, lang, onRoute }: ScreenProps) {
  const t = useT(lang);
  const todayIdx = data.days.length - 1;
  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
  const selectedDay = data.days[selectedIdx];
  const isToday = selectedIdx === todayIdx;

  const [meals, setMeals] = useState<MealSlot[]>(() =>
    makeMealSlots(selectedDay.foods, selectedDay.hasPhoto),
  );
  const [stress, setStress] = useState(selectedDay.stress);
  const [sleep, setSleep] = useState(selectedDay.sleepH);
  const [activity, setActivity] = useState(selectedDay.activity.id);
  const [itch, setItch] = useState(selectedDay.itch);
  const [moisturizer, setMoisturizer] = useState(selectedDay.meds.includes("pflege") ? 2 : 0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "backend" | "local">("idle");
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [foodDraft, setFoodDraft] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    setMeals(makeMealSlots(selectedDay.foods, selectedDay.hasPhoto));
    setStress(selectedDay.stress);
    setSleep(selectedDay.sleepH);
    setActivity(selectedDay.activity.id);
    setItch(selectedDay.itch);
    setMoisturizer(selectedDay.meds.includes("pflege") ? 2 : 0);
    setEditingMealId(null);
    setFoodDraft("");
    setSelectedTags([]);
  }, [selectedIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePhoto = (id: string) =>
    setMeals((ms) => ms.map((m) => (m.id === id ? { ...m, hasPhoto: !m.hasPhoto } : m)));

  const removeFood = (mealId: string, foodId: string) =>
    setMeals((ms) =>
      ms.map((m) => (m.id === mealId ? { ...m, foods: m.foods.filter((f) => f.id !== foodId) } : m)),
    );

  const addMeal = () =>
    setMeals((current) => [
      ...current,
      {
        id: `snack-${current.length}`,
        time: fmtTime(new Date(), lang),
        label: { de: "Snack", en: "Snack" },
        foods: [],
        hasPhoto: false,
      },
    ]);

  const openFoodComposer = (mealId: string) => {
    setEditingMealId(mealId);
    setFoodDraft("");
    setSelectedTags([]);
  };

  const cancelFoodComposer = () => {
    setEditingMealId(null);
    setFoodDraft("");
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) =>
    setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));

  const addFoodToMeal = (mealId: string, food: Food) =>
    setMeals((current) =>
      current.map((meal) => {
        if (meal.id !== mealId) return meal;
        if (meal.foods.some((currentFood) => currentFood.id === food.id)) return meal;
        return { ...meal, foods: [...meal.foods, food] };
      }),
    );

  const saveFoodDraft = (mealId: string, food?: Food) => {
    const name = foodDraft.trim();
    const matchedFood =
      food ||
      data.FOODS.find((item) => item.de.toLowerCase() === name.toLowerCase() || item.en.toLowerCase() === name.toLowerCase());
    if (!matchedFood && !name) return;

    const draftFood: Food =
      matchedFood ||
      {
        id: `custom-${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        de: name,
        en: name,
        tags: selectedTags,
      };

    addFoodToMeal(mealId, {
      ...draftFood,
      tags: Array.from(new Set([...(draftFood.tags || []), ...selectedTags])),
    });
    cancelFoodComposer();
  };

  const saveEntry = async () => {
    setSaveState("saving");
    const payload = {
      userId: DEMO_USER_ID,
      occurredAt: selectedDay.date.toISOString(),
      food: meals.flatMap((meal) =>
        meal.foods.map((food) => ({
          name: food.en,
          mealType: meal.id.startsWith("snack") ? "snack" : meal.id,
          triggerCategories: Array.from(
            new Set(food.tags.map((tag) => TRIGGER_CATEGORY_BY_TAG[tag] || "custom")),
          ),
          notes: food.tags.length ? `Tags: ${food.tags.join(", ")}` : undefined,
        })),
      ),
      sport:
        activity === "keine"
          ? undefined
          : {
              type: activity,
              durationMinutes: 35,
              intensity: Math.min(5, Math.max(1, Math.round(selectedDay.sweat * 4))) as 1 | 2 | 3 | 4 | 5,
              sweatLevel: Math.round(selectedDay.sweat * 8),
              location: "unknown",
            },
      stress: { level: stress * 2, source: "daily-check-in" },
      sleep: { hours: sleep, quality: sleep >= 7 ? 4 : sleep >= 6 ? 3 : 2 },
      activeRashes: [
        {
          bodyRegionId: selectedDay.regions[0]?.regionId || "arm-l-flex",
          side: selectedDay.regions[0]?.side || "front",
          itchiness: itch,
          dryness: Math.min(10, itch * 0.8),
          redness: Math.min(10, itch * 0.9),
          active: itch > 1,
          notes: "Saved from DermaTrack Agent OS demo",
        },
      ],
      habits: moisturizer > 0 ? [`emollient-${moisturizer}x`] : [],
      notes: "Saved from DermaTrack Agent OS.",
    };

    const result = await createDiaryEntry(payload);
    setSaveState(result.source === "backend" ? "backend" : "local");
    window.setTimeout(() => onRoute("today"), 650);
  };

  const dayLabel = isToday
    ? lang === "de"
      ? "Heute"
      : "Today"
    : `${fmtDay(selectedDay.date, lang)} · ${fmtDate(selectedDay.date, lang)}`;

  return (
    <div className="main-inner">
      <PageHead
        kicker={
          isToday
            ? fmtDate(selectedDay.date, lang) + " · " + fmtTime(new Date(), lang)
            : (lang === "de" ? "Bearbeite Eintrag · " : "Editing entry · ") +
              fmtDate(selectedDay.date, lang)
        }
        title={t("app_eintrag")}
        sub={
          lang === "de"
            ? "Wähle einen Tag und trage Mahlzeiten und Tagesform ein. Fotos sind optional."
            : "Pick a day, log meals and your daily state. Photos are optional."
        }
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {!isToday && (
              <Btn kind="ghost" size="md" onClick={() => setSelectedIdx(todayIdx)}>
                {lang === "de" ? "Zu heute" : "Jump to today"}
              </Btn>
            )}
            <Btn
              kind="primary"
              size="md"
              icon={<Icon.check size={14} color="var(--bg)" />}
              onClick={saveEntry}
              style={{ opacity: saveState === "saving" ? 0.72 : 1 }}
            >
              {saveState === "saving"
                ? lang === "de"
                  ? "Speichert..."
                  : "Saving..."
                : isToday
                ? t("loggen")
                : lang === "de"
                ? "Speichern"
                : "Save"}
            </Btn>
          </div>
        }
      />

      <DayStrip days={data.days} selectedIndex={selectedIdx} onSelect={setSelectedIdx} lang={lang} />

      {/* Section 1 — Nutrition */}
      <section style={{ marginBottom: 18 }}>
        <SectionHeader
          icon={<Icon.bowl size={16} color="var(--sage-d)" />}
          title={lang === "de" ? "Ernährung" : "Nutrition"}
          sub={dayLabel}
          right={
            <Btn kind="ghost" size="sm" icon={<Icon.plus size={12} />} onClick={addMeal}>
              {lang === "de" ? "Mahlzeit" : "Meal"}
            </Btn>
          }
        />

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {meals.map((m) => (
            <MealCard
              key={m.id}
              meal={m}
              lang={lang}
              allFoods={data.FOODS}
              isEditing={editingMealId === m.id}
              draft={foodDraft}
              selectedTags={selectedTags}
              onTogglePhoto={() => togglePhoto(m.id)}
              onRemoveFood={(foodId) => removeFood(m.id, foodId)}
              onOpenComposer={() => openFoodComposer(m.id)}
              onDraftChange={setFoodDraft}
              onToggleTag={toggleTag}
              onSaveDraft={(food) => saveFoodDraft(m.id, food)}
              onCancelDraft={cancelFoodComposer}
            />
          ))}
        </div>
      </section>

      {/* Section 2 — Skin & care today */}
      <section style={{ marginBottom: 18 }}>
        <SectionHeader
          icon={<Icon.droplet size={16} color="var(--sage-d)" />}
          title={lang === "de" ? "Haut & Pflege" : "Skin & care"}
          sub={lang === "de" ? "Symptom & wichtigster Hebel" : "Symptom & key lever"}
        />

        <div className="card">
          <div
            className="card-pad"
            style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icon.pulse size={16} color="oklch(0.66 0.18 25)" />
                <div style={{ fontSize: 12, fontWeight: 700 }}>{t("juckreiz")}</div>
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {lang === "de" ? "(0 = keiner, 10 = unerträglich)" : "(0 = none, 10 = unbearable)"}
                </span>
                <span
                  className="num"
                  style={{ marginLeft: "auto", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}
                >
                  {itch.toFixed(1)}
                  <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 500 }}>/10</span>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={itch}
                onChange={(e) => setItch(+e.target.value)}
                style={{ width: "100%", accentColor: "oklch(0.66 0.18 25)" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 9,
                  color: "var(--ink-3)",
                  fontFamily: "var(--font-mono)",
                  marginTop: 2,
                }}
              >
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icon.droplet size={16} color="var(--sage-d)" />
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {lang === "de" ? "Pflege heute" : "Moisturizer today"}
                </div>
                <span
                  className="num"
                  style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}
                >
                  {moisturizer === 0 ? "—" : moisturizer === 3 ? "3+×" : `${moisturizer}×`}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { v: 0, label: "0" },
                  { v: 1, label: "1×" },
                  { v: 2, label: "2×" },
                  { v: 3, label: "3+×" },
                ].map((opt) => {
                  const active = moisturizer === opt.v;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => setMoisturizer(opt.v)}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 8,
                        border: "1px solid " + (active ? "var(--sage-d)" : "var(--line)"),
                        background: active
                          ? "color-mix(in oklch, var(--sage) 28%, var(--card))"
                          : "var(--card)",
                        color: active ? "var(--sage-d)" : "var(--ink-2)",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Daily state */}
      <section>
        <SectionHeader
          icon={<Icon.pulse size={16} color="var(--clay-d)" />}
          title={lang === "de" ? "Tagesform" : "Daily state"}
          sub={lang === "de" ? "Schlaf, Stress, Bewegung" : "Sleep, stress, movement"}
        />

        <div className="card">
          <div
            className="card-pad"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 24 }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icon.bolt size={16} color="var(--clay-d)" />
                <div style={{ fontSize: 12, fontWeight: 700 }}>{t("stress")}</div>
                <span
                  className="num"
                  style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}
                >
                  {stress}/5
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setStress(n)}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background:
                        n <= stress
                          ? `oklch(${0.86 - n * 0.04} ${0.05 + n * 0.02} ${65 - n * 8})`
                          : "var(--card)",
                      color: n <= stress ? "var(--ink)" : "var(--ink-3)",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icon.moon size={16} color="var(--sage-d)" />
                <div style={{ fontSize: 12, fontWeight: 700 }}>{t("schlaf_letzte")}</div>
                <span
                  className="num"
                  style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}
                >
                  {sleep.toFixed(1)}h
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                step={0.1}
                value={sleep}
                onChange={(e) => setSleep(+e.target.value)}
                style={{ width: "100%", accentColor: "var(--sage-d)" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 9,
                  color: "var(--ink-3)",
                  fontFamily: "var(--font-mono)",
                  marginTop: 2,
                }}
              >
                <span>3h</span>
                <span>6h</span>
                <span>10h</span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icon.run size={16} color="var(--clay-d)" />
                <div style={{ fontSize: 12, fontWeight: 700 }}>{t("bewegung")}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {ACTIVITIES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setActivity(a.id)}
                    style={{
                      padding: "6px 11px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      border: "1px solid " + (a.id === activity ? "var(--ink)" : "var(--line)"),
                      background: a.id === activity ? "var(--ink)" : "var(--card)",
                      color: a.id === activity ? "var(--bg)" : "var(--ink)",
                    }}
                  >
                    {a[lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        style={{
          marginTop: 18,
          fontSize: 10,
          color: "var(--ink-3)",
          fontFamily: "var(--font-mono)",
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        {lang === "de"
          ? `Eintrag #${selectedIdx + 1} · ${
              saveState === "backend" ? "Backend gespeichert" : saveState === "local" ? "Demo-Fallback gespeichert" : "bereit"
            } · DiGA-konform`
          : `Entry #${selectedIdx + 1} · ${
              saveState === "backend" ? "saved to backend" : saveState === "local" ? "saved to demo fallback" : "ready"
            } · DiGA-compliant`}
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}

function SectionHeader({ icon, title, sub, right }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "0 4px 10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--ink)",
            }}
          >
            {title}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

interface MealCardProps {
  meal: MealSlot;
  lang: "de" | "en";
  allFoods: Food[];
  isEditing: boolean;
  draft: string;
  selectedTags: string[];
  onTogglePhoto: () => void;
  onRemoveFood: (foodId: string) => void;
  onOpenComposer: () => void;
  onDraftChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  onSaveDraft: (food?: Food) => void;
  onCancelDraft: () => void;
}

function MealCard({
  meal,
  lang,
  allFoods,
  isEditing,
  draft,
  selectedTags,
  onTogglePhoto,
  onRemoveFood,
  onOpenComposer,
  onDraftChange,
  onToggleTag,
  onSaveDraft,
  onCancelDraft,
}: MealCardProps) {
  const isEmpty = meal.foods.length === 0;
  const suggestions = allFoods
    .filter((food) => {
      const query = draft.trim().toLowerCase();
      const notInMeal = !meal.foods.some((currentFood) => currentFood.id === food.id);
      if (!query) return notInMeal;
      return notInMeal && (food.de.toLowerCase().includes(query) || food.en.toLowerCase().includes(query));
    })
    .slice(0, 4);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Photo / placeholder */}
      <button
        onClick={onTogglePhoto}
        style={{
          height: 110,
          border: "none",
          padding: 0,
          cursor: "pointer",
          position: "relative",
          background: meal.hasPhoto
            ? "radial-gradient(circle at 35% 40%, oklch(0.84 0.10 50), oklch(0.66 0.13 38))"
            : "repeating-linear-gradient(135deg, var(--bg-2) 0 8px, var(--card) 8px 16px)",
        }}
      >
        {meal.hasPhoto ? (
          <svg viewBox="0 0 200 100" width="60%" style={{ display: "block", margin: "20px auto" }}>
            <ellipse cx={100} cy={55} rx={68} ry={22} fill="oklch(0.96 0.02 60)" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path
                key={i}
                d={`M ${50 + i * 16} 50 Q ${58 + i * 16} ${44 + (i % 2) * 4} ${66 + i * 16} 50 T ${82 + i * 16} 50`}
                stroke="oklch(0.85 0.12 55)"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
            ))}
            <circle cx={80} cy={50} r={4} fill="oklch(0.55 0.18 25)" />
            <circle cx={120} cy={56} r={4} fill="oklch(0.55 0.18 25)" />
          </svg>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              color: "var(--ink-3)",
            }}
          >
            <Icon.camera size={20} color="var(--ink-3)" />
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {lang === "de" ? "Foto hinzufügen" : "Add photo"}
            </span>
          </div>
        )}
        {meal.hasPhoto && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                padding: "2px 7px",
                borderRadius: 6,
              }}
            >
              {lang === "de" ? "Foto" : "Photo"}
            </span>
          </div>
        )}
      </button>

      {/* Body */}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{meal.label[lang]}</div>
            <div
              className="num"
              style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}
            >
              {meal.time}
            </div>
          </div>
          {meal.hasPhoto && (
            <span className="pill sage" style={{ height: 20, fontSize: 10 }}>
              <Icon.sparkle size={10} /> {lang === "de" ? "KI erkannt" : "AI detected"}
            </span>
          )}
        </div>

        {isEmpty ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              fontStyle: "italic",
              padding: "8px 0",
            }}
          >
            {lang === "de" ? "Noch nichts erfasst." : "Nothing logged yet."}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {meal.foods.map((f) => {
              const flagged = f.tags.some((tg) => ["Histamin", "Gluten", "Milch", "Nüsse"].includes(tg));
              return (
                <button
                  key={f.id}
                  onClick={() => onRemoveFood(f.id)}
                  className={"pill " + (flagged ? "clay" : "neutral")}
                  style={{
                    height: 24,
                    fontSize: 11,
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title={lang === "de" ? "Entfernen" : "Remove"}
                >
                  {f[lang]}
                  {flagged && <span style={{ opacity: 0.7, fontSize: 10 }}>· {f.tags[0]}</span>}
                  <Icon.close size={10} />
                </button>
              );
            })}
          </div>
        )}

        {isEditing ? (
          <div
            style={{
              marginTop: "auto",
              display: "grid",
              gap: 9,
              padding: 10,
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "color-mix(in oklch, var(--sage) 8%, var(--card))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon.bowl size={14} color="var(--sage-d)" />
              <input
                autoFocus
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSaveDraft();
                  if (event.key === "Escape") onCancelDraft();
                }}
                placeholder={lang === "de" ? "z.B. Pasta, Apfel, Kaffee..." : "e.g. pasta, apple, coffee..."}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--ink)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 650,
                }}
              />
            </div>

            {suggestions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {suggestions.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => onSaveDraft(food)}
                    className="pill neutral"
                    style={{ border: "1px solid var(--line)", cursor: "pointer", height: 24, fontSize: 11 }}
                  >
                    {food[lang]}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {FOOD_TAGS.map((tag) => {
                const active = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => onToggleTag(tag.id)}
                    style={{
                      border: "1px solid " + (active ? "var(--clay-d)" : "var(--line)"),
                      background: active ? "color-mix(in oklch, var(--clay) 18%, var(--card))" : "var(--card)",
                      color: active ? "var(--clay-d)" : "var(--ink-2)",
                      borderRadius: 999,
                      padding: "4px 8px",
                      fontSize: 10,
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    {tag[lang]}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
              <button
                onClick={() => onSaveDraft()}
                disabled={!draft.trim()}
                style={{
                  height: 32,
                  borderRadius: 10,
                  border: "1px solid " + (draft.trim() ? "var(--ink)" : "var(--line)"),
                  background: draft.trim() ? "var(--ink)" : "var(--bg-2)",
                  color: draft.trim() ? "var(--bg)" : "var(--ink-3)",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: draft.trim() ? "pointer" : "not-allowed",
                }}
              >
                {lang === "de" ? "Hinzufügen" : "Add food"}
              </button>
              <button
                onClick={onCancelDraft}
                className="icon-btn"
                style={{ width: 32, height: 32 }}
                aria-label={lang === "de" ? "Abbrechen" : "Cancel"}
              >
                <Icon.close size={13} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenComposer}
            style={{
              marginTop: "auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px dashed var(--line)",
              background: "var(--bg-2)",
              color: "var(--ink-2)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Icon.plus size={12} />
            {lang === "de" ? "Lebensmittel hinzufügen" : "Add food"}
          </button>
        )}
      </div>
    </div>
  );
}
