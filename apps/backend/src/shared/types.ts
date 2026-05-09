export type ISODateString = string;

export type Scale0To10 = number;
export type Scale1To5 = 1 | 2 | 3 | 4 | 5;

export type FoodTriggerCategory =
  | "gluten"
  | "nightshades"
  | "dairy"
  | "egg"
  | "nuts"
  | "soy"
  | "histamine"
  | "high_sugar"
  | "spicy"
  | "alcohol"
  | "ultra_processed"
  | "additives"
  | "custom";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "drink";

export type OpenFoodFactsProductSummary = {
  barcode: string;
  name?: string;
  brand?: string;
  quantity?: string;
  categories?: string[];
  allergens?: string[];
  traces?: string[];
  ingredientsText?: string;
  nutriments?: {
    energyKcal100g?: number;
    fat100g?: number;
    saturatedFat100g?: number;
    carbohydrates100g?: number;
    sugars100g?: number;
    proteins100g?: number;
    salt100g?: number;
    fiber100g?: number;
  };
  nutriScore?: string;
  novaGroup?: number;
  ecoScore?: string;
  imageUrl?: string;
  sourceUrl?: string;
};

export type FoodImageAttachment = {
  id: string;
  userId: string;
  entryId?: string;
  foodItemName?: string;
  source: "upload" | "url";
  storageUrl?: string;
  dataUri?: string;
  originalFilename?: string;
  mimeType?: string;
  linkedBarcode?: string;
  openFoodFactsProduct?: OpenFoodFactsProductSummary;
  analysisStatus: "not_requested" | "enriched" | "failed";
  analysisError?: string;
  notes?: string;
  createdAt: ISODateString;
};

export type FoodLogItem = {
  name: string;
  brand?: string;
  barcode?: string;
  mealType?: MealType;
  amount?: string;
  quantityGrams?: number;
  categories?: string[];
  triggerCategories?: FoodTriggerCategory[];
  openFoodFactsId?: string;
  openFoodFactsProduct?: OpenFoodFactsProductSummary;
  imageIds?: string[];
  notes?: string;
};

export type SportLog = {
  type: string;
  durationMinutes?: number;
  intensity?: Scale1To5;
  sweatLevel?: Scale0To10;
  location?: "indoor" | "outdoor" | "unknown";
  notes?: string;
};

export type StressLog = {
  level: Scale0To10;
  source?: string;
  copingActions?: string[];
  notes?: string;
};

export type ActiveRashLog = {
  bodyRegionId?: string;
  side?: BodySide;
  itchiness: Scale0To10;
  dryness: Scale0To10;
  redness?: Scale0To10;
  pain?: Scale0To10;
  swelling?: Scale0To10;
  active: boolean;
  notes?: string;
};

export type DiaryEntry = {
  id: string;
  userId: string;
  occurredAt: ISODateString;
  food?: FoodLogItem[];
  sport?: SportLog;
  stress?: StressLog;
  stressLevel?: number;
  sleep?: {
    hours?: number;
    quality?: Scale1To5;
  };
  activeRashes?: ActiveRashLog[];
  foodImages?: FoodImageAttachment[];
  habits?: string[];
  lifeChanges?: string[];
  notes?: string;
  createdAt: ISODateString;
};

export type BodySide = "front" | "back";

export type BodyRegion = {
  id: string;
  label: string;
  side: BodySide;
  parentId?: string;
};

export type FlareObservation = {
  id: string;
  userId: string;
  observedAt: ISODateString;
  bodyRegionId: string;
  side: BodySide;
  intensity: 1 | 2 | 3 | 4 | 5;
  itchiness?: number;
  dryness?: number;
  redness?: number;
  scorradTotal?: number;
  notes?: string;
  createdAt: ISODateString;
};

export type RashPhoto = {
  id: string;
  userId: string;
  takenAt: ISODateString;
  bodyRegionId?: string;
  side?: BodySide;
  storageUrl?: string;
  originalFilename?: string;
  aiSeverityScore?: number;
  aiAnalysisStatus: "pending" | "complete" | "failed";
  createdAt: ISODateString;
};

export type EnvironmentSnapshot = {
  id: string;
  userId?: string;
  capturedAt: ISODateString;
  location?: {
    latitude: number;
    longitude: number;
  };
  weather?: {
    temperatureCelsius?: number;
    apparentTemperatureCelsius?: number;
    humidityPercent?: number;
    precipitationMm?: number;
    rainMm?: number;
    weatherCode?: number;
    pressureMslHpa?: number;
    windSpeedKmh?: number;
    windGustsKmh?: number;
    uvIndex?: number;
  };
  pollen?: {
    alder?: number;
    grass?: number;
    birch?: number;
    mugwort?: number;
    olive?: number;
    ragweed?: number;
    pm10?: number;
    pm25?: number;
    europeanAqi?: number;
    overallRisk?: "low" | "medium" | "high" | "unknown";
  };
  symptomContext?: {
    diaryEntryId?: string;
    symptomObserved: boolean;
    activeRashes?: ActiveRashLog[];
    itchiness?: number;
    dryness?: number;
    notes?: string;
  };
  provider?: "open-meteo" | "manual";
  sourceUrl?: string;
  notes?: string;
  source: "manual" | "provider" | "placeholder";
  createdAt?: ISODateString;
};

export type ContextEvent = {
  id: string;
  userId: string;
  occurredAt: ISODateString;
  type:
    | "detergent"
    | "clothing"
    | "pet"
    | "travel"
    | "medication"
    | "home"
    | "other";
  label: string;
  notes?: string;
  createdAt: ISODateString;
};

export type TriggerCandidate = {
  factor: string;
  category: "food" | "environment" | "habit" | "treatment" | "unknown";
  confidence: number;
  explanation: string;
};

export type FlareForecast = {
  userId: string;
  horizonHours: 24 | 48;
  generatedAt: ISODateString;
  risk: "low" | "medium" | "high" | "unknown";
  confidence: number;
  reasons: string[];
};

export type Medication = {
  id: string;
  userId: string;
  name: string;
  type?:
    | "emollient"
    | "topical_steroid"
    | "topical_calcineurin_inhibitor"
    | "antihistamine"
    | "antibiotic"
    | "biologic"
    | "supplement"
    | "other";
  form?:
    | "cream"
    | "ointment"
    | "lotion"
    | "gel"
    | "tablet"
    | "capsule"
    | "drops"
    | "injection"
    | "other";
  activeIngredient?: string;
  strength?: string;
  dosage?: string;
  schedule?: string;
  instructions?: string;
  prescribedBy?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
  active?: boolean;
  notes?: string;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
};

export type TreatmentApplication = {
  id: string;
  userId: string;
  medicationId?: string;
  appliedAt: ISODateString;
  bodyRegionId?: string;
  side?: BodySide;
  amount?: string;
  reason?: "routine" | "flare" | "itch" | "dryness" | "prevention" | "other";
  itchinessBefore?: Scale0To10;
  itchinessAfter?: Scale0To10;
  drynessBefore?: Scale0To10;
  drynessAfter?: Scale0To10;
  rednessBefore?: Scale0To10;
  rednessAfter?: Scale0To10;
  effectiveness?: Scale0To10;
  sideEffects?: string[];
  notes?: string;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
};
