import {
  isDatabaseConfigured,
  queryDatabase,
} from "../shared/database.js";
import type { DiaryEntry, FoodImageAttachment } from "../shared/types.js";

type DiaryEntryRow = {
  id: string;
  user_id: string;
  occurred_at: string;
  food: DiaryEntry["food"] | null;
  sport: DiaryEntry["sport"] | null;
  stress: DiaryEntry["stress"] | null;
  stress_level: number | null;
  sleep: DiaryEntry["sleep"] | null;
  active_rashes: DiaryEntry["activeRashes"] | null;
  habits: string[] | null;
  life_changes: string[] | null;
  notes: string | null;
  created_at: string;
};

type FoodImageRow = {
  id: string;
  user_id: string;
  entry_id: string | null;
  food_item_name: string | null;
  source: FoodImageAttachment["source"];
  storage_url: string | null;
  data_uri: string | null;
  original_filename: string | null;
  mime_type: string | null;
  linked_barcode: string | null;
  open_food_facts_product: FoodImageAttachment["openFoodFactsProduct"] | null;
  analysis_status: FoodImageAttachment["analysisStatus"];
  analysis_error: string | null;
  notes: string | null;
  created_at: string;
};

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToFoodImage(row: FoodImageRow): FoodImageAttachment {
  return {
    id: row.id,
    userId: row.user_id,
    entryId: row.entry_id ?? undefined,
    foodItemName: row.food_item_name ?? undefined,
    source: row.source,
    storageUrl: row.storage_url ?? undefined,
    dataUri: row.data_uri ?? undefined,
    originalFilename: row.original_filename ?? undefined,
    mimeType: row.mime_type ?? undefined,
    linkedBarcode: row.linked_barcode ?? undefined,
    openFoodFactsProduct: row.open_food_facts_product ?? undefined,
    analysisStatus: row.analysis_status,
    analysisError: row.analysis_error ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: toIsoString(row.created_at),
  };
}

function rowToDiaryEntry(
  row: DiaryEntryRow,
  imagesByEntryId: Map<string, FoodImageAttachment[]>,
): DiaryEntry {
  const foodImages = imagesByEntryId.get(row.id);

  return {
    id: row.id,
    userId: row.user_id,
    occurredAt: toIsoString(row.occurred_at),
    food: row.food ?? undefined,
    sport: row.sport ?? undefined,
    stress: row.stress ?? undefined,
    stressLevel: row.stress_level ?? undefined,
    sleep: row.sleep ?? undefined,
    activeRashes: row.active_rashes ?? undefined,
    foodImages: foodImages?.length ? foodImages : undefined,
    habits: row.habits ?? undefined,
    lifeChanges: row.life_changes ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: toIsoString(row.created_at),
  };
}

export async function loadDiaryStore() {
  if (!isDatabaseConfigured()) {
    return {
      entries: [] as DiaryEntry[],
      foodImages: [] as FoodImageAttachment[],
    };
  }

  const [entriesResult, imagesResult] = await Promise.all([
    queryDatabase<DiaryEntryRow>(
      "select * from diary_entries order by occurred_at desc, created_at desc",
    ),
    queryDatabase<FoodImageRow>(
      "select * from food_images order by created_at desc",
    ),
  ]);

  const foodImages = imagesResult.rows.map(rowToFoodImage);
  const imagesByEntryId = new Map<string, FoodImageAttachment[]>();

  for (const image of foodImages) {
    if (!image.entryId) {
      continue;
    }

    imagesByEntryId.set(image.entryId, [
      ...(imagesByEntryId.get(image.entryId) ?? []),
      image,
    ]);
  }

  return {
    entries: entriesResult.rows.map((row) => rowToDiaryEntry(row, imagesByEntryId)),
    foodImages,
  };
}

export async function upsertDiaryEntry(entry: DiaryEntry) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase(
    `
      insert into diary_entries (
        id, user_id, occurred_at, food, sport, stress, stress_level, sleep,
        active_rashes, habits, life_changes, notes, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
      on conflict (id) do update set
        user_id = excluded.user_id,
        occurred_at = excluded.occurred_at,
        food = excluded.food,
        sport = excluded.sport,
        stress = excluded.stress,
        stress_level = excluded.stress_level,
        sleep = excluded.sleep,
        active_rashes = excluded.active_rashes,
        habits = excluded.habits,
        life_changes = excluded.life_changes,
        notes = excluded.notes,
        updated_at = now()
    `,
    [
      entry.id,
      entry.userId,
      entry.occurredAt,
      entry.food ?? null,
      entry.sport ?? null,
      entry.stress ?? null,
      entry.stressLevel ?? null,
      entry.sleep ?? null,
      entry.activeRashes ?? null,
      entry.habits ?? null,
      entry.lifeChanges ?? null,
      entry.notes ?? null,
      entry.createdAt,
    ],
  );
}

export async function deleteDiaryEntry(id: string) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase("delete from diary_entries where id = $1", [id]);
}

export async function upsertFoodImage(image: FoodImageAttachment) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await queryDatabase(
    `
      insert into food_images (
        id, user_id, entry_id, food_item_name, source, storage_url, data_uri,
        original_filename, mime_type, linked_barcode, open_food_facts_product,
        analysis_status, analysis_error, notes, created_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      on conflict (id) do update set
        user_id = excluded.user_id,
        entry_id = excluded.entry_id,
        food_item_name = excluded.food_item_name,
        source = excluded.source,
        storage_url = excluded.storage_url,
        data_uri = excluded.data_uri,
        original_filename = excluded.original_filename,
        mime_type = excluded.mime_type,
        linked_barcode = excluded.linked_barcode,
        open_food_facts_product = excluded.open_food_facts_product,
        analysis_status = excluded.analysis_status,
        analysis_error = excluded.analysis_error,
        notes = excluded.notes
    `,
    [
      image.id,
      image.userId,
      image.entryId ?? null,
      image.foodItemName ?? null,
      image.source,
      image.storageUrl ?? null,
      image.dataUri ?? null,
      image.originalFilename ?? null,
      image.mimeType ?? null,
      image.linkedBarcode ?? null,
      image.openFoodFactsProduct ?? null,
      image.analysisStatus,
      image.analysisError ?? null,
      image.notes ?? null,
      image.createdAt,
    ],
  );
}

export async function upsertFoodImages(images: FoodImageAttachment[]) {
  await Promise.all(images.map(upsertFoodImage));
}
