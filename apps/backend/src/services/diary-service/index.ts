import type { Response } from "express";
import {
  deleteDiaryEntry,
  loadDiaryStore,
  upsertDiaryEntry,
  upsertFoodImage,
  upsertFoodImages,
} from "../../repositories/diaryRepository.js";
import { createId, createService, getNumberEnv } from "../../shared/http.js";
import type {
  ActiveRashLog,
  DiaryEntry,
  FoodImageAttachment,
  FoodLogItem,
  FoodTriggerCategory,
  MealType,
  OpenFoodFactsProductSummary,
  Scale1To5,
  SportLog,
  StressLog,
} from "../../shared/types.js";

let entries: DiaryEntry[] = [];
let foodImages: FoodImageAttachment[] = [];

const foodTriggerCategories: Array<{
  id: FoodTriggerCategory;
  label: string;
  examples: string[];
}> = [
  {
    id: "gluten",
    label: "Gluten",
    examples: ["wheat", "rye", "barley", "bread", "pasta"],
  },
  {
    id: "nightshades",
    label: "Nightshades",
    examples: ["tomato", "potato", "pepper", "eggplant", "paprika"],
  },
  {
    id: "dairy",
    label: "Dairy",
    examples: ["milk", "yogurt", "cheese", "cream"],
  },
  {
    id: "egg",
    label: "Egg",
    examples: ["egg", "mayonnaise"],
  },
  {
    id: "nuts",
    label: "Nuts",
    examples: ["peanut", "almond", "hazelnut", "cashew"],
  },
  {
    id: "soy",
    label: "Soy",
    examples: ["soy", "tofu", "edamame"],
  },
  {
    id: "histamine",
    label: "Histamine-rich",
    examples: ["wine", "aged cheese", "fermented", "salami", "tuna"],
  },
  {
    id: "high_sugar",
    label: "High sugar",
    examples: ["sweets", "soft drink", "dessert"],
  },
  {
    id: "spicy",
    label: "Spicy",
    examples: ["chili", "hot sauce", "pepper"],
  },
  {
    id: "alcohol",
    label: "Alcohol",
    examples: ["beer", "wine", "spirits"],
  },
  {
    id: "ultra_processed",
    label: "Ultra-processed",
    examples: ["ready meal", "instant noodles", "packaged snack"],
  },
  {
    id: "additives",
    label: "Additives",
    examples: ["preservatives", "colorants", "emulsifiers"],
  },
  {
    id: "custom",
    label: "Custom",
    examples: ["patient-specific trigger"],
  },
];

const categoryAliases: Record<string, FoodTriggerCategory> = {
  additive: "additives",
  additives: "additives",
  alkohol: "alcohol",
  alcohol: "alcohol",
  aubergine: "nightshades",
  barley: "gluten",
  beer: "alcohol",
  bread: "gluten",
  cheese: "dairy",
  chili: "spicy",
  dairy: "dairy",
  egg: "egg",
  ei: "egg",
  erdnuss: "nuts",
  fermented: "histamine",
  gluten: "gluten",
  histamin: "histamine",
  histamine: "histamine",
  joghurt: "dairy",
  kartoffel: "nightshades",
  potatoes: "nightshades",
  kase: "dairy",
  käse: "dairy",
  milk: "dairy",
  milch: "dairy",
  nachtschattengemuse: "nightshades",
  nachtschattengemüse: "nightshades",
  nachtschatten: "nightshades",
  nightshade: "nightshades",
  nightshades: "nightshades",
  nuts: "nuts",
  paprika: "nightshades",
  pasta: "gluten",
  peanut: "nuts",
  pepper: "nightshades",
  scharf: "spicy",
  soy: "soy",
  soja: "soy",
  spicy: "spicy",
  sugar: "high_sugar",
  süß: "high_sugar",
  suess: "high_sugar",
  tofu: "soy",
  tomato: "nightshades",
  tomatoes: "nightshades",
  tomate: "nightshades",
  ultra_processed: "ultra_processed",
  ultraprocessed: "ultra_processed",
  weizen: "gluten",
  wheat: "gluten",
  wine: "alcohol",
  zucker: "high_sugar",
};

type UnknownRecord = Record<string, unknown>;

type OpenFoodFactsProduct = UnknownRecord & {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  product_name_en?: string;
  brands?: string;
  quantity?: string;
  categories_tags_en?: string[];
  allergens_tags?: string[];
  traces_tags?: string[];
  ingredients_text?: string;
  ingredients_text_de?: string;
  ingredients_text_en?: string;
  nutriments?: UnknownRecord;
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  image_front_url?: string;
  image_url?: string;
};

type OpenFoodFactsLookupResult =
  | { status: "found"; product: OpenFoodFactsProductSummary }
  | { status: "not_found"; barcode: string }
  | { status: "error"; error: string };

async function initializeDiaryStore() {
  try {
    const store = await loadDiaryStore();
    entries = store.entries;
    foodImages = store.foodImages;
    console.log(
      `Diary Service loaded ${entries.length} entries and ${foodImages.length} food images from storage.`,
    );
  } catch (error) {
    console.warn(
      `Diary Service storage load failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

void initializeDiaryStore();

async function persistEntry(entry: DiaryEntry) {
  try {
    await upsertDiaryEntry(entry);
    await upsertFoodImages(entry.foodImages ?? []);
  } catch (error) {
    console.warn(
      `Diary Service database persist failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

async function persistFoodImage(image: FoodImageAttachment) {
  try {
    await upsertFoodImage(image);
  } catch (error) {
    console.warn(
      `Diary Service food image persist failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

async function deleteStoredEntry(id: string) {
  try {
    await deleteDiaryEntry(id);
  } catch (error) {
    console.warn(
      `Diary Service database delete failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function clampScale(value: unknown, fallback: number, min = 0, max = 10) {
  const numberValue = asNumber(value) ?? fallback;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function asScale1To5(value: unknown): Scale1To5 | undefined {
  const numberValue = asNumber(value);

  if (!numberValue) {
    return undefined;
  }

  return Math.min(5, Math.max(1, Math.round(numberValue))) as Scale1To5;
}

function asIsoDate(value: unknown, fallback: string) {
  const raw = asString(value);

  if (!raw) {
    return fallback;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeCategoryToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, "_")
    .replace(/[^\p{L}\p{N}_äöüß]/gu, "");
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ß", "ss")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toFoodTriggerCategory(value: string): FoodTriggerCategory | undefined {
  const normalized = normalizeCategoryToken(value);
  const deUmlautFallback = normalized
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ß", "ss");

  return categoryAliases[normalized] ?? categoryAliases[deUmlautFallback];
}

function inferTriggerCategories(...sources: Array<string | undefined>) {
  const inferred = new Set<FoodTriggerCategory>();
  const searchable = normalizeSearchText(sources.filter(Boolean).join(" "));
  const searchableWords = new Set(searchable.split(" ").filter(Boolean));

  for (const [token, category] of Object.entries(categoryAliases)) {
    const normalizedToken = normalizeSearchText(token);
    const isPhrase = normalizedToken.includes(" ");
    const isMatch = isPhrase
      ? searchable.includes(normalizedToken)
      : searchableWords.has(normalizedToken);

    if (isMatch) {
      inferred.add(category);
    }
  }

  return [...inferred];
}

function normalizeTriggerCategories(value: unknown, foodName?: string) {
  const explicit = asStringArray(value)
    .map(toFoodTriggerCategory)
    .filter((item): item is FoodTriggerCategory => Boolean(item));
  const inferred = inferTriggerCategories(foodName, asStringArray(value).join(" "));

  return [...new Set([...explicit, ...inferred])];
}

function normalizeMealType(value: unknown): MealType | undefined {
  const normalized = asString(value)?.toLowerCase();
  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack", "drink"];

  return mealTypes.find((mealType) => mealType === normalized);
}

function getNutriment(nutriments: UnknownRecord | undefined, key: string) {
  return asNumber(nutriments?.[key]);
}

function normalizeOpenFoodFactsProduct(
  product: OpenFoodFactsProduct,
  fallbackBarcode?: string,
): OpenFoodFactsProductSummary {
  const barcode = product.code ?? fallbackBarcode ?? "";
  const ingredientsText =
    product.ingredients_text_de ??
    product.ingredients_text_en ??
    product.ingredients_text;

  return {
    barcode,
    name: product.product_name_de ?? product.product_name_en ?? product.product_name,
    brand: product.brands,
    quantity: product.quantity,
    categories: product.categories_tags_en,
    allergens: product.allergens_tags,
    traces: product.traces_tags,
    ingredientsText,
    nutriments: {
      energyKcal100g: getNutriment(product.nutriments, "energy-kcal_100g"),
      fat100g: getNutriment(product.nutriments, "fat_100g"),
      saturatedFat100g: getNutriment(product.nutriments, "saturated-fat_100g"),
      carbohydrates100g: getNutriment(product.nutriments, "carbohydrates_100g"),
      sugars100g: getNutriment(product.nutriments, "sugars_100g"),
      proteins100g: getNutriment(product.nutriments, "proteins_100g"),
      salt100g: getNutriment(product.nutriments, "salt_100g"),
      fiber100g: getNutriment(product.nutriments, "fiber_100g"),
    },
    nutriScore: product.nutriscore_grade,
    novaGroup: product.nova_group,
    ecoScore: product.ecoscore_grade,
    imageUrl: product.image_front_url ?? product.image_url,
    sourceUrl: barcode
      ? `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`
      : undefined,
  };
}

function openFoodFactsHeaders() {
  return {
    "user-agent":
      process.env.OPENFOODFACTS_USER_AGENT ??
      "neurodermitis-tracker/0.1 (prototype)",
  };
}

async function lookupOpenFoodFactsByBarcode(
  barcode: string,
): Promise<OpenFoodFactsLookupResult> {
  const baseUrl = process.env.OPENFOODFACTS_BASE_URL ?? "https://world.openfoodfacts.org";
  const url = new URL(`/api/v2/product/${encodeURIComponent(barcode)}`, baseUrl);
  url.searchParams.set(
    "fields",
    [
      "code",
      "product_name",
      "product_name_de",
      "product_name_en",
      "brands",
      "quantity",
      "categories_tags_en",
      "allergens_tags",
      "traces_tags",
      "ingredients_text",
      "ingredients_text_de",
      "ingredients_text_en",
      "nutriments",
      "nutriscore_grade",
      "nova_group",
      "ecoscore_grade",
      "image_front_url",
      "image_url",
    ].join(","),
  );

  try {
    const response = await fetch(url, { headers: openFoodFactsHeaders() });

    if (!response.ok) {
      return { status: "error", error: `OpenFoodFacts returned ${response.status}` };
    }

    const data = asRecord(await response.json());
    const product = asRecord(data.product) as OpenFoodFactsProduct;

    if (data.status === 0 || !Object.keys(product).length) {
      return { status: "not_found", barcode };
    }

    return {
      status: "found",
      product: normalizeOpenFoodFactsProduct(product, barcode),
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "OpenFoodFacts request failed",
    };
  }
}

async function searchOpenFoodFacts(query: string, pageSize: number) {
  const baseUrl = process.env.OPENFOODFACTS_BASE_URL ?? "https://world.openfoodfacts.org";
  const url = new URL("/api/v2/search", baseUrl);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set(
    "fields",
    [
      "code",
      "product_name",
      "product_name_de",
      "product_name_en",
      "brands",
      "quantity",
      "categories_tags_en",
      "allergens_tags",
      "traces_tags",
      "ingredients_text",
      "ingredients_text_de",
      "ingredients_text_en",
      "nutriments",
      "nutriscore_grade",
      "nova_group",
      "ecoscore_grade",
      "image_front_url",
      "image_url",
    ].join(","),
  );

  const response = await fetch(url, { headers: openFoodFactsHeaders() });

  if (!response.ok) {
    throw new Error(`OpenFoodFacts returned ${response.status}`);
  }

  const data = asRecord(await response.json());
  const products = Array.isArray(data.products) ? data.products : [];

  return products
    .map((product) => normalizeOpenFoodFactsProduct(asRecord(product)))
    .filter((product) => product.barcode || product.name);
}

function normalizeFoodImages(
  value: unknown,
  userId: string,
  now: string,
): FoodImageAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const raw = asRecord(item);
    const linkedBarcode = asString(raw.linkedBarcode) ?? asString(raw.barcode);
    const source = asString(raw.storageUrl) ? "url" : "upload";

    return {
      id: createId("food_image"),
      userId,
      foodItemName: asString(raw.foodItemName),
      source,
      storageUrl: asString(raw.storageUrl),
      dataUri: asString(raw.dataUri),
      originalFilename: asString(raw.originalFilename),
      mimeType: asString(raw.mimeType),
      linkedBarcode,
      analysisStatus: "not_requested",
      notes: asString(raw.notes),
      createdAt: now,
    };
  });
}

async function enrichFoodItem(
  foodItem: FoodLogItem,
  enrichOpenFoodFacts: boolean,
) {
  if (!enrichOpenFoodFacts || !foodItem.barcode) {
    return foodItem;
  }

  const result = await lookupOpenFoodFactsByBarcode(foodItem.barcode);

  if (result.status !== "found") {
    return foodItem;
  }

  return {
    ...foodItem,
    brand: foodItem.brand ?? result.product.brand,
    categories: foodItem.categories?.length
      ? foodItem.categories
      : result.product.categories,
    openFoodFactsId: result.product.barcode,
    openFoodFactsProduct: result.product,
    triggerCategories: [
      ...new Set([
        ...(foodItem.triggerCategories ?? []),
        ...inferTriggerCategories(
          result.product.name,
          result.product.ingredientsText,
          result.product.categories?.join(" "),
          result.product.allergens?.join(" "),
          result.product.traces?.join(" "),
        ),
      ]),
    ],
  };
}

async function normalizeFoodItems(
  value: unknown,
  enrichOpenFoodFacts: boolean,
): Promise<FoodLogItem[] | undefined> {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((item) => {
      const raw = asRecord(item);
      const name = asString(raw.name);

      if (!name) {
        return undefined;
      }

      const categories = asStringArray(raw.categories);
      const barcode = asString(raw.barcode);

      const foodItem: FoodLogItem = {
        name,
        brand: asString(raw.brand),
        barcode,
        mealType: normalizeMealType(raw.mealType),
        amount: asString(raw.amount),
        quantityGrams: asNumber(raw.quantityGrams),
        categories,
        triggerCategories: [
          ...new Set([
            ...normalizeTriggerCategories(raw.triggerCategories, name),
            ...inferTriggerCategories(name, categories.join(" ")),
          ]),
        ],
        openFoodFactsId: asString(raw.openFoodFactsId),
        imageIds: asStringArray(raw.imageIds),
        notes: asString(raw.notes),
      };

      return foodItem;
    })
    .filter((item): item is FoodLogItem => Boolean(item));

  return Promise.all(
    normalized.map((foodItem) => enrichFoodItem(foodItem, enrichOpenFoodFacts)),
  );
}

function normalizeSport(value: unknown): SportLog | undefined {
  const raw = asRecord(value);
  const type = asString(raw.type);

  if (!type) {
    return undefined;
  }

  const location = asString(raw.location);

  return {
    type,
    durationMinutes: asNumber(raw.durationMinutes),
    intensity: asScale1To5(raw.intensity),
    sweatLevel: clampScale(raw.sweatLevel, 0),
    location:
      location === "indoor" || location === "outdoor" ? location : "unknown",
    notes: asString(raw.notes),
  };
}

function normalizeStress(value: unknown, legacyStressLevel: unknown): StressLog | undefined {
  const raw = asRecord(value);
  const explicitLevel = raw.level ?? legacyStressLevel;
  const level = asNumber(explicitLevel);

  if (level === undefined) {
    return undefined;
  }

  return {
    level: clampScale(level, 0),
    source: asString(raw.source),
    copingActions: asStringArray(raw.copingActions),
    notes: asString(raw.notes),
  };
}

function normalizeActiveRashes(value: unknown): ActiveRashLog[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rashes = value.map((item) => {
    const raw = asRecord(item);
    const side = asString(raw.side);

    return {
      bodyRegionId: asString(raw.bodyRegionId),
      side: side === "front" || side === "back" ? side : undefined,
      itchiness: clampScale(raw.itchiness, 0),
      dryness: clampScale(raw.dryness, 0),
      redness: clampScale(raw.redness, 0),
      pain: clampScale(raw.pain, 0),
      swelling: clampScale(raw.swelling, 0),
      active: asBoolean(raw.active, true),
      notes: asString(raw.notes),
    } satisfies ActiveRashLog;
  });

  return rashes.length ? rashes : undefined;
}

function normalizeSleep(value: unknown): DiaryEntry["sleep"] {
  const raw = asRecord(value);
  const hours = asNumber(raw.hours);
  const quality = asScale1To5(raw.quality);

  return hours !== undefined || quality !== undefined ? { hours, quality } : undefined;
}

async function createDiaryEntryFromBody(value: unknown): Promise<DiaryEntry> {
  const body = asRecord(value);
  const now = new Date().toISOString();
  const userId = asString(body.userId) ?? "demo-user";
  const enrichOpenFoodFacts = asBoolean(body.enrichOpenFoodFacts, false);
  const images = normalizeFoodImages(body.foodImages, userId, now);
  const food = await normalizeFoodItems(body.food, enrichOpenFoodFacts);
  const stress = normalizeStress(body.stress, body.stressLevel);
  const entryId = createId("diary");
  const entryImages = images.map((image) => ({ ...image, entryId }));
  const foodWithImageIds = food?.map((foodItem) => {
    const matchingImageIds = entryImages
      .filter((image) => image.foodItemName === foodItem.name)
      .map((image) => image.id);

    return matchingImageIds.length
      ? {
          ...foodItem,
          imageIds: [...new Set([...(foodItem.imageIds ?? []), ...matchingImageIds])],
        }
      : foodItem;
  });

  foodImages.push(...entryImages);

  return {
    id: entryId,
    userId,
    occurredAt: asIsoDate(body.occurredAt, now),
    food: foodWithImageIds,
    sport: normalizeSport(body.sport),
    stress,
    stressLevel: stress?.level,
    sleep: normalizeSleep(body.sleep),
    activeRashes: normalizeActiveRashes(body.activeRashes),
    foodImages: entryImages.length ? entryImages : undefined,
    habits: asStringArray(body.habits),
    lifeChanges: asStringArray(body.lifeChanges),
    notes: asString(body.notes),
    createdAt: now,
  };
}

function applyEntryPatch(entry: DiaryEntry, value: unknown): DiaryEntry {
  const body = asRecord(value);
  const patched = { ...entry };

  if ("occurredAt" in body) {
    patched.occurredAt = asIsoDate(body.occurredAt, entry.occurredAt);
  }

  if ("sport" in body) {
    patched.sport = normalizeSport(body.sport);
  }

  if ("stress" in body || "stressLevel" in body) {
    patched.stress = normalizeStress(body.stress, body.stressLevel);
    patched.stressLevel = patched.stress?.level;
  }

  if ("sleep" in body) {
    patched.sleep = normalizeSleep(body.sleep);
  }

  if ("activeRashes" in body) {
    patched.activeRashes = normalizeActiveRashes(body.activeRashes);
  }

  if ("habits" in body) {
    patched.habits = asStringArray(body.habits);
  }

  if ("lifeChanges" in body) {
    patched.lifeChanges = asStringArray(body.lifeChanges);
  }

  if ("notes" in body) {
    patched.notes = asString(body.notes);
  }

  return patched;
}

function badRequest(response: Response, message: string) {
  response.status(400).json({ error: "bad_request", message });
}

function filterEntries(requestQuery: UnknownRecord) {
  const userId = asString(requestQuery.userId);
  const from = asString(requestQuery.from);
  const to = asString(requestQuery.to);
  const category = asString(requestQuery.category);
  const categoryFilter = category ? toFoodTriggerCategory(category) : undefined;
  const hasRash = asString(requestQuery.hasRash);

  return entries.filter((entry) => {
    if (userId && entry.userId !== userId) {
      return false;
    }

    if (from && entry.occurredAt < asIsoDate(from, from)) {
      return false;
    }

    if (to && entry.occurredAt > asIsoDate(to, to)) {
      return false;
    }

    if (category && !categoryFilter) {
      return false;
    }

    if (
      categoryFilter &&
      !entry.food?.some((foodItem) =>
        foodItem.triggerCategories?.includes(categoryFilter),
      )
    ) {
      return false;
    }

    if (hasRash === "true" && !entry.activeRashes?.some((rash) => rash.active)) {
      return false;
    }

    return true;
  });
}

function buildDiarySummary(userId: string | undefined, days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const relevantEntries = entries.filter((entry) => {
    if (userId && entry.userId !== userId) {
      return false;
    }

    return new Date(entry.occurredAt).getTime() >= since;
  });

  const stressLevels = relevantEntries
    .map((entry) => entry.stress?.level ?? entry.stressLevel)
    .filter((item): item is number => item !== undefined);
  const rashes = relevantEntries.flatMap((entry) => entry.activeRashes ?? []);
  const sports = relevantEntries
    .map((entry) => entry.sport)
    .filter((item): item is SportLog => Boolean(item));
  const categoryCounts = new Map<FoodTriggerCategory, number>();

  for (const entry of relevantEntries) {
    for (const foodItem of entry.food ?? []) {
      for (const category of foodItem.triggerCategories ?? []) {
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      }
    }
  }

  return {
    userId,
    days,
    entryCount: relevantEntries.length,
    averages: {
      stress:
        stressLevels.length > 0
          ? stressLevels.reduce((sum, level) => sum + level, 0) / stressLevels.length
          : null,
      itchiness:
        rashes.length > 0
          ? rashes.reduce((sum, rash) => sum + rash.itchiness, 0) / rashes.length
          : null,
      dryness:
        rashes.length > 0
          ? rashes.reduce((sum, rash) => sum + rash.dryness, 0) / rashes.length
          : null,
      sweat:
        sports.length > 0
          ? sports.reduce((sum, sport) => sum + (sport.sweatLevel ?? 0), 0) /
            sports.length
          : null,
    },
    counts: {
      foodItems: relevantEntries.reduce(
        (sum, entry) => sum + (entry.food?.length ?? 0),
        0,
      ),
      sportSessions: sports.length,
      activeRashLogs: rashes.filter((rash) => rash.active).length,
      foodImages: relevantEntries.reduce(
        (sum, entry) => sum + (entry.foodImages?.length ?? 0),
        0,
      ),
    },
    topFoodTriggerCategories: [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => right.count - left.count),
  };
}

createService({
  name: "Diary Service",
  port: getNumberEnv("DIARY_SERVICE_PORT", 3001),
  registerRoutes(app) {
    app.get("/metadata", (_request, response) => {
      response.json({
        scales: {
          stress: { min: 0, max: 10 },
          sweat: { min: 0, max: 10 },
          itchiness: { min: 0, max: 10 },
          dryness: { min: 0, max: 10 },
          redness: { min: 0, max: 10 },
          sportIntensity: { min: 1, max: 5 },
        },
        mealTypes: ["breakfast", "lunch", "dinner", "snack", "drink"],
        foodTriggerCategories,
      });
    });

    app.get("/entries", (request, response) => {
      response.json({
        entries: filterEntries(request.query as UnknownRecord),
      });
    });

    app.post("/entries", async (request, response) => {
      const body = asRecord(request.body);

      if (!Array.isArray(body.food) && !body.sport && !body.stress && !body.activeRashes) {
        badRequest(
          response,
          "Create at least one diary signal: food, sport, stress or activeRashes.",
        );
        return;
      }

      const entry = await createDiaryEntryFromBody(request.body);

      entries.push(entry);
      await persistEntry(entry);
      response.status(201).json({ entry });
    });

    app.get("/entries/:id", (request, response) => {
      const entry = entries.find((item) => item.id === request.params.id);

      if (!entry) {
        response.status(404).json({ error: "entry_not_found" });
        return;
      }

      response.json({ entry });
    });

    app.patch("/entries/:id", async (request, response) => {
      const entryIndex = entries.findIndex((item) => item.id === request.params.id);

      if (entryIndex === -1) {
        response.status(404).json({ error: "entry_not_found" });
        return;
      }

      const patched = applyEntryPatch(entries[entryIndex], request.body);
      entries[entryIndex] = patched;
      await persistEntry(patched);

      response.json({ entry: patched });
    });

    app.delete("/entries/:id", async (request, response) => {
      const entryIndex = entries.findIndex((item) => item.id === request.params.id);

      if (entryIndex === -1) {
        response.status(404).json({ error: "entry_not_found" });
        return;
      }

      const [deleted] = entries.splice(entryIndex, 1);
      await deleteStoredEntry(deleted.id);
      response.json({ deleted });
    });

    app.get("/summary", (request, response) => {
      const days = Math.min(365, Math.max(1, asNumber(request.query.days) ?? 14));
      response.json({
        summary: buildDiarySummary(asString(request.query.userId), days),
      });
    });

    app.get("/food/categories", (_request, response) => {
      response.json({ categories: foodTriggerCategories });
    });

    app.get("/food/images", (request, response) => {
      const userId = asString(request.query.userId);
      response.json({
        images: userId
          ? foodImages.filter((image) => image.userId === userId)
          : foodImages,
      });
    });

    app.post("/food/images", async (request, response) => {
      const body = asRecord(request.body);
      const now = new Date().toISOString();
      const userId = asString(body.userId) ?? "demo-user";
      const [image] = normalizeFoodImages([body], userId, now);

      if (!image.storageUrl && !image.dataUri) {
        badRequest(response, "Provide storageUrl or dataUri for the food image.");
        return;
      }

      if (image.linkedBarcode && asBoolean(body.enrichOpenFoodFacts, false)) {
        const result = await lookupOpenFoodFactsByBarcode(image.linkedBarcode);

        if (result.status === "found") {
          image.analysisStatus = "enriched";
          image.openFoodFactsProduct = result.product;
        } else {
          image.analysisStatus = "failed";
          image.analysisError =
            result.status === "not_found" ? "product_not_found" : result.error;
        }
      }

      foodImages.push(image);
      await persistFoodImage(image);
      response.status(201).json({ image });
    });

    app.get("/food/openfoodfacts/products/:barcode", async (request, response) => {
      const result = await lookupOpenFoodFactsByBarcode(request.params.barcode);

      if (result.status === "not_found") {
        response.status(404).json({ error: "product_not_found", barcode: result.barcode });
        return;
      }

      if (result.status === "error") {
        response.status(502).json({ error: "openfoodfacts_unavailable", message: result.error });
        return;
      }

      response.json({
        provider: "OpenFoodFacts",
        product: result.product,
        inferredTriggerCategories: inferTriggerCategories(
          result.product.name,
          result.product.ingredientsText,
          result.product.categories?.join(" "),
          result.product.allergens?.join(" "),
          result.product.traces?.join(" "),
        ),
      });
    });

    app.get("/food/openfoodfacts/search", async (request, response) => {
      const query = asString(request.query.q ?? request.query.query);

      if (!query) {
        badRequest(response, "Provide q or query.");
        return;
      }

      const pageSize = Math.min(25, Math.max(1, asNumber(request.query.pageSize) ?? 10));

      try {
        const products = await searchOpenFoodFacts(query, pageSize);
        response.json({
          provider: "OpenFoodFacts",
          query,
          products,
        });
      } catch (error) {
        response.status(502).json({
          error: "openfoodfacts_unavailable",
          message:
            error instanceof Error ? error.message : "OpenFoodFacts request failed",
        });
      }
    });
  },
});
