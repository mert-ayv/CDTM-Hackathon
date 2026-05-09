import "dotenv/config";
import {
  getDatabaseHealth,
  getSupabaseClient,
  getSupabaseStorageBucket,
} from "../src/shared/database.js";

async function run() {
  const database = await getDatabaseHealth();
  const supabase = getSupabaseClient();

  console.log(
    JSON.stringify(
      {
        database,
        supabase: {
          configured: Boolean(supabase),
          storageBucket: getSupabaseStorageBucket(),
        },
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
