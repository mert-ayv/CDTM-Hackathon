export type ISODateString = string;

export type FoodLogItem = {
  name: string;
  brand?: string;
  barcode?: string;
  amount?: string;
  categories?: string[];
  openFoodFactsId?: string;
};

export type DiaryEntry = {
  id: string;
  userId: string;
  occurredAt: ISODateString;
  food?: FoodLogItem[];
  sport?: {
    type: string;
    durationMinutes?: number;
    intensity?: 1 | 2 | 3 | 4 | 5;
  };
  stressLevel?: number;
  sleep?: {
    hours?: number;
    quality?: 1 | 2 | 3 | 4 | 5;
  };
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
    humidityPercent?: number;
    uvIndex?: number;
  };
  pollen?: {
    grass?: number;
    birch?: number;
    ragweed?: number;
    overallRisk?: "low" | "medium" | "high" | "unknown";
  };
  source: "manual" | "provider" | "placeholder";
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
  dosage?: string;
  schedule?: string;
  prescribedBy?: string;
  createdAt: ISODateString;
};

export type TreatmentApplication = {
  id: string;
  userId: string;
  medicationId?: string;
  appliedAt: ISODateString;
  bodyRegionId?: string;
  amount?: string;
  notes?: string;
  createdAt: ISODateString;
};
