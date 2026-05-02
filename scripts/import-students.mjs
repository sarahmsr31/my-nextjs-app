/**
 * Upsert students into Supabase from a JSON roster file.
 *
 * Setup:
 * 1. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * 2. Run: npm run import-students
 *    (uses scripts/data/ofss265256-students.json by default, or pass a path:
 *     node scripts/import-students.mjs path/to/roster.json)
 * 3. Optional override: create scripts/students-to-import.json (gitignored) to replace
 *    the default roster for your environment.
 *
 * Requires a UNIQUE constraint on students.access_code for upsert onConflict.
 * Rows without access_code are skipped.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function normalizeRow(raw) {
  const access_code = String(raw.access_code ?? "")
    .trim()
    .toUpperCase();
  if (!access_code) return null;

  const row = {
    access_code,
    student_name: String(raw.student_name ?? "").trim() || "Student",
  };

  if (raw.class !== undefined && raw.class !== null && String(raw.class).trim() !== "") {
    row.class = String(raw.class).trim();
  }
  if (raw.preferred_name !== undefined && String(raw.preferred_name ?? "").trim() !== "") {
    row.preferred_name = String(raw.preferred_name).trim();
  }
  if (raw.current_day !== undefined && raw.current_day !== null && raw.current_day !== "") {
    const d = Number(raw.current_day);
    if (Number.isFinite(d) && d >= 1 && d <= 40) row.current_day = Math.floor(d);
  }

  if (raw.age !== undefined && raw.age !== null && raw.age !== "") {
    const a = Number(raw.age);
    if (Number.isFinite(a)) row.age = a;
  }

  const passthrough = [
    "parent_email",
    "parent_name",
    "parent_phone",
    "school",
    "cohort",
  ];
  for (const k of passthrough) {
    if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== "") {
      row[k] = raw[k];
    }
  }

  return row;
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (use .env.local)."
    );
    process.exit(1);
  }

  const argPath = process.argv[2];
  const localOverride = path.join(__dirname, "students-to-import.json");
  const shippedRoster = path.join(__dirname, "data", "ofss265256-students.json");

  let rosterPath = argPath
    ? path.isAbsolute(argPath)
      ? argPath
      : path.join(process.cwd(), argPath)
    : null;

  if (!rosterPath || !fs.existsSync(rosterPath)) {
    if (fs.existsSync(localOverride)) rosterPath = localOverride;
    else if (fs.existsSync(shippedRoster)) rosterPath = shippedRoster;
  }

  if (!rosterPath || !fs.existsSync(rosterPath)) {
    console.error(
      `No roster file found. Pass a JSON path, add scripts/students-to-import.json, or ship scripts/data/ofss265256-students.json`
    );
    process.exit(1);
  }

  console.log("Using roster:", rosterPath);

  let list;
  try {
    list = JSON.parse(fs.readFileSync(rosterPath, "utf8"));
  } catch (e) {
    console.error("Invalid roster JSON:", e.message);
    process.exit(1);
  }

  if (!Array.isArray(list) || list.length === 0) {
    console.error("Roster must be a non-empty JSON array.");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = list.map(normalizeRow).filter(Boolean);
  if (!rows.length) {
    console.error("No valid rows (each entry needs access_code).");
    process.exit(1);
  }

  const { data, error } = await admin.from("students").upsert(rows, {
    onConflict: "access_code",
  });

  if (error) {
    console.error("Upsert failed:", error.message, error.code || "");
    console.error(
      "\nHints: Ensure UNIQUE(access_code) exists on public.students. Remove unknown columns from JSON if your table differs."
    );
    process.exit(1);
  }

  console.log(`Upserted ${rows.length} student row(s).`);
  if (data?.length) console.log(data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
