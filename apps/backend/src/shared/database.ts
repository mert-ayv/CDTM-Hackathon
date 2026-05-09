import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | undefined;

function shouldUseSsl() {
  return process.env.DATABASE_SSL !== "false";
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabasePool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
}

export async function queryDatabase<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getDatabasePool().query<T>(text, values);
}

export async function getDatabaseHealth() {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      status: "not_configured",
    };
  }

  try {
    const result = await queryDatabase<{ now: Date }>("select now()");
    return {
      configured: true,
      status: "ok",
      timestamp: result.rows[0]?.now,
    };
  } catch (error) {
    return {
      configured: true,
      status: "degraded",
      error: error instanceof Error ? error.message : "Database check failed.",
    };
  }
}

export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return undefined;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "rash-photos";
}
