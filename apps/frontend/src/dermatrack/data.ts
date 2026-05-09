// Seeded "production-feeling" data for DermaTrack.
// 30 days, with correlations engineered to surface in trigger analysis.
// Ported from the design handoff (window.DT_DATA → exported constant).

export type Lang = "de" | "en";

export interface Localized {
  de: string;
  en: string;
}

export interface Food extends Localized {
  id: string;
  tags: string[];
}

export interface EnvTrigger extends Localized {
  id: string;
}

export interface Activity extends Localized {
  id: string;
}

export type MedKind = "kortison" | "calcineurin" | "pflege" | "oral";

export interface Med extends Localized {
  id: string;
  kind: MedKind;
  strength: string;
}

export type BodySide = "front" | "back";

export interface BodyRegion extends Localized {
  id: string;
  side: BodySide;
}

export interface RegionAffected {
  regionId: string;
  side: BodySide;
  sev: number;
}

export interface DayLog {
  date: Date;
  dayOffset: number;
  ageDays: number;
  dow: number;
  scorad: number;
  itch: number;
  sleepLoss: number;
  sleepH: number;
  stress: number;
  tempC: number;
  humidity: number;
  birchPollen: number;
  grassPollen: number;
  dustHigh: boolean;
  activity: Activity;
  sweat: number;
  heatTrigger: boolean;
  foods: Food[];
  meds: string[];
  hasPhoto: boolean;
  regions: RegionAffected[];
  voiceNote: string | null;
}

export interface ForecastDay {
  date: Date;
  dayOffset: number;
  risk: number;
  birch: number;
  grass: number;
  tempC: number;
  label: "gering" | "mittel" | "hoch";
}

export type TriggerKind = "food" | "env" | "lifestyle";

export interface TriggerInsight {
  label: Localized;
  lag: number;
  confidence: number;
  evidence: number;
  deltaScorad: number;
  kind: TriggerKind;
}

export interface TreatmentEffect {
  medId: string;
  applications: number;
  deltaScorad: number;
  daysToOnset: number;
  sideEffects: number;
  success: number;
}

export type InsightStrength = "stark" | "mittel" | "positiv" | "strong" | "medium" | "positive";

export interface Insight {
  kind: "pattern" | "environmental" | "lifestyle" | "positive";
  strength: InsightStrength;
  title: string;
  body: string;
}

export interface DermaTrackData {
  days: DayLog[];
  today: DayLog;
  forecast: ForecastDay[];
  triggers: TriggerInsight[];
  treatments: TreatmentEffect[];
  insights: { de: Insight[]; en: Insight[] };
  streak: number;
  FOODS: Food[];
  ENV: EnvTrigger[];
  MEDS: Med[];
  BODY_REGIONS: BodyRegion[];
  TODAY: Date;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260509);
const r = (a: number, b: number) => a + rnd() * (b - a);
const ri = (a: number, b: number) => Math.floor(r(a, b + 1));
const pick = <T,>(arr: T[]): T => arr[ri(0, arr.length - 1)];
const chance = (p: number) => rnd() < p;

const DAYS = 30;
const TODAY = new Date("2026-05-09T08:00:00");

const ALL_FOODS: Food[] = [
  { id: "rotwein", de: "Rotwein", en: "Red wine", tags: ["Histamin", "Alkohol"] },
  { id: "reifer-kaese", de: "Gereifter Käse", en: "Aged cheese", tags: ["Histamin", "Milch"] },
  { id: "tomaten", de: "Tomaten", en: "Tomatoes", tags: ["Histamin"] },
  { id: "erdbeeren", de: "Erdbeeren", en: "Strawberries", tags: ["Histamin"] },
  { id: "walnuesse", de: "Walnüsse", en: "Walnuts", tags: ["Nüsse", "Histamin"] },
  { id: "haselnuss", de: "Haselnüsse", en: "Hazelnuts", tags: ["Nüsse"] },
  { id: "sauerkraut", de: "Sauerkraut", en: "Sauerkraut", tags: ["Histamin"] },
  { id: "thunfisch", de: "Thunfisch", en: "Tuna", tags: ["Histamin"] },
  { id: "weizenbrot", de: "Weizenbrot", en: "Wheat bread", tags: ["Gluten"] },
  { id: "pasta", de: "Pasta", en: "Pasta", tags: ["Gluten"] },
  { id: "milchkaffee", de: "Milchkaffee", en: "Café au lait", tags: ["Milch", "Koffein"] },
  { id: "joghurt", de: "Naturjoghurt", en: "Plain yogurt", tags: ["Milch"] },
  { id: "haferflocken", de: "Haferflocken", en: "Oats", tags: [] },
  { id: "apfel", de: "Apfel", en: "Apple", tags: [] },
  { id: "lachs", de: "Lachs", en: "Salmon", tags: ["Omega-3"] },
  { id: "gruener-tee", de: "Grüner Tee", en: "Green tea", tags: [] },
  { id: "spinat", de: "Spinat", en: "Spinach", tags: ["Histamin"] },
  { id: "reis", de: "Reis", en: "Rice", tags: [] },
  { id: "banane", de: "Banane", en: "Banana", tags: [] },
  { id: "huehnchen", de: "Hühnchen", en: "Chicken", tags: [] },
];

const ENV_TRIGGERS: EnvTrigger[] = [
  { id: "birke", de: "Birkenpollen", en: "Birch pollen" },
  { id: "graes", de: "Gräserpollen", en: "Grass pollen" },
  { id: "staub", de: "Hausstaub", en: "House dust" },
  { id: "wolle", de: "Wolle", en: "Wool" },
  { id: "hitze", de: "Hitze + Schweiß", en: "Heat + sweat" },
];

const ACTIVITIES: Activity[] = [
  { id: "lauf", de: "Laufen", en: "Running" },
  { id: "yoga", de: "Yoga", en: "Yoga" },
  { id: "rad", de: "Radfahren", en: "Cycling" },
  { id: "kraft", de: "Krafttraining", en: "Strength" },
  { id: "spazier", de: "Spaziergang", en: "Walk" },
  { id: "keine", de: "Keine", en: "None" },
];

const MEDS: Med[] = [
  { id: "hydro", de: "Hydrocortison 1%", en: "Hydrocortisone 1%", kind: "kortison", strength: "leicht" },
  { id: "pimecro", de: "Pimecrolimus 1%", en: "Pimecrolimus 1%", kind: "calcineurin", strength: "mittel" },
  { id: "mometason", de: "Mometason", en: "Mometasone", kind: "kortison", strength: "stark" },
  { id: "pflege", de: "Eucerin Pflegelotion", en: "Emollient lotion", kind: "pflege", strength: "—" },
  { id: "antihist", de: "Cetirizin 10mg", en: "Cetirizine 10mg", kind: "oral", strength: "—" },
];

const BODY_REGIONS: BodyRegion[] = [
  { id: "face-l", de: "Wange links", en: "Left cheek", side: "front" },
  { id: "face-r", de: "Wange rechts", en: "Right cheek", side: "front" },
  { id: "neck-f", de: "Hals (vorn)", en: "Neck (front)", side: "front" },
  { id: "chest", de: "Brust", en: "Chest", side: "front" },
  { id: "arm-l-flex", de: "Ellenbeuge links", en: "Left elbow flex", side: "front" },
  { id: "arm-r-flex", de: "Ellenbeuge rechts", en: "Right elbow flex", side: "front" },
  { id: "wrist-l", de: "Handgelenk links", en: "Left wrist", side: "front" },
  { id: "wrist-r", de: "Handgelenk rechts", en: "Right wrist", side: "front" },
  { id: "belly", de: "Bauch", en: "Belly", side: "front" },
  { id: "knee-l", de: "Kniekehle links", en: "Left knee back", side: "back" },
  { id: "knee-r", de: "Kniekehle rechts", en: "Right knee back", side: "back" },
  { id: "back-up", de: "Oberer Rücken", en: "Upper back", side: "back" },
  { id: "back-low", de: "Unterer Rücken", en: "Lower back", side: "back" },
  { id: "neck-b", de: "Nacken", en: "Neck (back)", side: "back" },
];

const days: DayLog[] = [];
const baseScorad = 24;

for (let d = DAYS - 1; d >= 0; d--) {
  const date = new Date(TODAY);
  date.setDate(TODAY.getDate() - d);
  const dow = date.getDay();
  const idx = DAYS - 1 - d;

  const tempC = Math.round(r(11, 24) * 10) / 10;
  const humidity = ri(38, 78);
  const birchPollen = idx > 6 && idx < 22 ? ri(2, 4) : ri(0, 2);
  const grassPollen = idx > 18 ? ri(1, 3) : ri(0, 1);
  const dustHigh = chance(0.3);

  let sleepH = +r(5.4, 8.2).toFixed(1);
  if (dow === 5 || dow === 6) sleepH = +r(6.0, 8.6).toFixed(1);
  if (idx === 12 || idx === 13) sleepH = +r(4.8, 5.6).toFixed(1);
  let stress = ri(1, 4);
  if (dow >= 1 && dow <= 4) stress = ri(2, 5);
  if (idx === 12) stress = 5;

  const act = pick(ACTIVITIES);
  const sweat = act.id === "lauf" || act.id === "kraft" ? r(0.7, 1.2) : r(0.0, 0.4);
  const heatTrigger = sweat > 0.9 && tempC > 19;

  const mealCount = ri(3, 4);
  const todayFoods: Food[] = [];
  for (let m = 0; m < mealCount; m++) {
    const f = pick(ALL_FOODS);
    if (!todayFoods.find((x) => x.id === f.id)) todayFoods.push(f);
  }
  if ([2, 9, 16, 23].includes(idx) && !todayFoods.find((x) => x.id === "rotwein")) {
    todayFoods.push(ALL_FOODS.find((x) => x.id === "rotwein")!);
    todayFoods.push(ALL_FOODS.find((x) => x.id === "reifer-kaese")!);
  }
  if ([4, 11, 19, 26].includes(idx) && !todayFoods.find((x) => x.id === "walnuesse")) {
    todayFoods.push(ALL_FOODS.find((x) => x.id === "walnuesse")!);
  }

  let scorad = baseScorad + r(-2, 2);
  if (birchPollen >= 3) scorad += 1.6;
  if (heatTrigger) scorad += 0.9;

  function pastHadFood(deltaDays: number, foodId: string) {
    const ref = days[days.length - deltaDays];
    return ref && ref.foods.find((f) => f.id === foodId);
  }
  if (pastHadFood(1, "rotwein")) scorad += 2.4;
  if (pastHadFood(1, "reifer-kaese")) scorad += 1.8;
  if (pastHadFood(1, "tomaten") && pastHadFood(1, "reifer-kaese")) scorad += 0.6;
  if (days.length > 0 && days[days.length - 1].sleepH < 6) scorad += 1.4;
  if (days.length > 0 && days[days.length - 1].stress >= 4) scorad += 1.0;

  if (idx > 11 && idx < 17) scorad += 1.4;
  if (idx > 23) scorad -= 1.6;

  scorad = Math.max(8, Math.min(48, scorad));
  scorad = +scorad.toFixed(1);

  const itch = +Math.max(0, Math.min(10, scorad / 5.0 + r(-0.8, 0.8))).toFixed(1);
  const sleepLoss = +Math.max(0, Math.min(10, (10 - sleepH) * 0.9 + scorad / 8)).toFixed(1);

  const hasPhoto = idx % 3 === 0 || idx === 0;

  const regionsAffected: RegionAffected[] = [];
  const candidate = BODY_REGIONS.slice();
  const k = scorad < 18 ? 2 : scorad < 26 ? 4 : 6;
  for (let i = 0; i < k; i++) {
    const reg = candidate.splice(ri(0, candidate.length - 1), 1)[0];
    regionsAffected.push({
      regionId: reg.id,
      side: reg.side,
      sev: +Math.max(0, Math.min(10, scorad / 5 + r(-1.2, 1.2))).toFixed(1),
    });
  }

  const todayMeds: string[] = ["pflege"];
  if (scorad > 24) todayMeds.push("hydro");
  if (idx > 11 && idx < 18) todayMeds.push("mometason");
  if (idx > 22) todayMeds.push("pimecro");
  if (chance(0.2)) todayMeds.push("antihist");

  days.push({
    date,
    dayOffset: d,
    ageDays: idx,
    dow,
    scorad,
    itch,
    sleepLoss,
    sleepH,
    stress,
    tempC,
    humidity,
    birchPollen,
    grassPollen,
    dustHigh,
    activity: act,
    sweat: +sweat.toFixed(2),
    heatTrigger,
    foods: todayFoods,
    meds: todayMeds,
    hasPhoto,
    regions: regionsAffected,
    voiceNote: idx === 28 ? "Gestern Abend stark gejuckt, Schlaf war schlecht." : null,
  });
}

const today = days[days.length - 1];

const forecast: ForecastDay[] = [];
for (let i = 1; i <= 7; i++) {
  const date = new Date(TODAY);
  date.setDate(TODAY.getDate() + i);
  const birch = Math.max(0, 4 - Math.floor(i / 2) + (i === 3 ? 1 : 0));
  const grass = Math.min(4, 1 + Math.floor(i / 2));
  const tempC = +(16 + r(-2, 6) + i * 0.4).toFixed(1);

  const recentMean = (today.scorad + days[days.length - 2].scorad + days[days.length - 3].scorad) / 3;
  let risk = recentMean / 50;
  risk += birch >= 3 ? 0.10 : 0;
  risk += grass >= 3 ? 0.05 : 0;
  risk += i === 2 ? 0.08 : 0;
  risk += i === 3 ? 0.16 : 0;
  risk -= i > 4 ? 0.06 : 0;
  risk = Math.max(0.08, Math.min(0.95, risk + r(-0.04, 0.04)));
  forecast.push({
    date,
    dayOffset: i,
    risk: +risk.toFixed(2),
    birch,
    grass,
    tempC,
    label: risk > 0.6 ? "hoch" : risk > 0.4 ? "mittel" : "gering",
  });
}

function makeTrigger(
  label: Localized,
  lag: number,
  confidence: number,
  evidence: number,
  deltaScorad: number,
  kind: TriggerKind,
): TriggerInsight {
  return { label, lag, confidence, evidence, deltaScorad, kind };
}

const triggers: TriggerInsight[] = [
  makeTrigger({ de: "Rotwein", en: "Red wine" }, 24, 92, 4, 2.4, "food"),
  makeTrigger({ de: "Gereifter Käse", en: "Aged cheese" }, 24, 84, 4, 1.8, "food"),
  makeTrigger({ de: "Schlaf < 6h", en: "Sleep < 6h" }, 24, 78, 6, 1.6, "lifestyle"),
  makeTrigger({ de: "Birkenpollen ≥ 3", en: "Birch pollen ≥ 3" }, 6, 74, 9, 1.5, "env"),
  makeTrigger({ de: "Walnüsse", en: "Walnuts" }, 6, 62, 4, 1.1, "food"),
  makeTrigger({ de: "Hitze + Schweiß", en: "Heat + sweat" }, 6, 58, 5, 0.9, "env"),
  makeTrigger({ de: "Stress ≥ 4", en: "Stress ≥ 4" }, 24, 53, 7, 0.9, "lifestyle"),
  makeTrigger({ de: "Tomaten", en: "Tomatoes" }, 24, 41, 3, 0.5, "food"),
];

const treatments: TreatmentEffect[] = [
  { medId: "hydro", applications: 14, deltaScorad: -2.1, daysToOnset: 1.5, sideEffects: 0, success: 0.78 },
  { medId: "pimecro", applications: 9, deltaScorad: -0.8, daysToOnset: 3.0, sideEffects: 1, success: 0.58 },
  { medId: "mometason", applications: 6, deltaScorad: -3.4, daysToOnset: 0.8, sideEffects: 0, success: 0.92 },
  { medId: "pflege", applications: 30, deltaScorad: -0.4, daysToOnset: 2.0, sideEffects: 0, success: 0.45 },
  { medId: "antihist", applications: 7, deltaScorad: -0.6, daysToOnset: 1.0, sideEffects: 0, success: 0.50 },
];

const insights: { de: Insight[]; en: Insight[] } = {
  de: [
    {
      kind: "pattern",
      strength: "stark",
      title: "Histamin-Muster wahrscheinlich",
      body:
        "Du hattest 3× Flares 24 h nach Rotwein + reifem Käse — typisches Histamin-Muster. SCORAD stieg im Schnitt um +2.4 Punkte.",
    },
    {
      kind: "environmental",
      strength: "mittel",
      title: "Birkenpollen verstärken Schübe",
      body:
        "An 9 Tagen mit Pollenflug ≥ 3 trat innerhalb von 6 h ein Juckreiz-Anstieg auf. Antihistaminikum am Vorabend könnte helfen.",
    },
    {
      kind: "lifestyle",
      strength: "mittel",
      title: "Schlaf wirkt stärker als erwartet",
      body:
        "Nach Nächten unter 6 h stieg dein SCORAD durchschnittlich um +1.6. Der Effekt ist um den Faktor 2 größer als an Tagen mit Stress allein.",
    },
    {
      kind: "positive",
      strength: "positiv",
      title: "Mometason wirkt am schnellsten",
      body:
        "Im Mittel −3.4 SCORAD-Punkte innerhalb von 24 h. Hydrocortison wirkt langsamer (−2.1) — sinnvoll für leichtere Tage.",
    },
  ],
  en: [
    {
      kind: "pattern",
      strength: "strong",
      title: "Histamine pattern likely",
      body:
        "You had 3 flares ~24 h after red wine + aged cheese — classic histamine pattern. SCORAD rose +2.4 on average.",
    },
    {
      kind: "environmental",
      strength: "medium",
      title: "Birch pollen amplifies flares",
      body: "On 9 days with pollen ≥ 3, itch rose within 6 h. An antihistamine the night before could help.",
    },
    {
      kind: "lifestyle",
      strength: "medium",
      title: "Sleep matters more than expected",
      body: "After nights below 6 h SCORAD rose +1.6 on average — about 2× the size of stress alone.",
    },
    {
      kind: "positive",
      strength: "positive",
      title: "Mometasone works fastest",
      body: "Average −3.4 SCORAD points within 24 h. Hydrocortisone is slower (−2.1) — better for milder days.",
    },
  ],
};

let streak = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].foods.length > 0 || days[i].regions.length > 0) streak++;
  else break;
}

export const DT_DATA: DermaTrackData = {
  days,
  today,
  forecast,
  triggers,
  treatments,
  insights,
  streak,
  FOODS: ALL_FOODS,
  ENV: ENV_TRIGGERS,
  MEDS,
  BODY_REGIONS,
  TODAY,
};
