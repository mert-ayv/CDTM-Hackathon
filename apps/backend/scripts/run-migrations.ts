import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabasePool } from "../src/shared/database.js";

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), "..");
const migrationsDirectory = path.join(backendRoot, "migrations");

async function run() {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const appliedResult = await client.query<{ version: string }>(
      "select version from schema_migrations",
    );
    const appliedVersions = new Set(
      appliedResult.rows.map((row) => row.version),
    );
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      if (appliedVersions.has(file)) {
        console.log(`Skipping ${file}`);
        continue;
      }

      const sql = await readFile(path.join(migrationsDirectory, file), "utf8");

      console.log(`Applying ${file}`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into schema_migrations (version) values ($1)",
          [file],
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    console.log("Database migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
