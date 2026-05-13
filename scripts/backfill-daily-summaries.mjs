/**
 * Backfill missing daily_summaries rows from recorded responses.
 *
 * Usage:
 *   node scripts/backfill-daily-summaries.mjs 9
 *   node scripts/backfill-daily-summaries.mjs 9 10
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

function parseDays(argv) {
  const nums = argv
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 40);
  return nums.length ? [...new Set(nums)] : [9];
}

function buildSummaryRow(studentId, day, finalResponses) {
  const totalQuestions = finalResponses.length;
  const correctCount = finalResponses.filter((r) => r.correct).length;
  return {
    student_id: studentId,
    day,
    score: totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0,
    correct_count: correctCount,
    total_questions: totalQuestions,
    parent_summary:
      "Mission summary backfilled from recorded responses. AI debrief was unavailable at completion time.",
    strengths: [],
    focus_areas: [],
    recommended_micro_lessons: null,
    is_completed: true,
  };
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and service role key (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY)."
    );
    process.exit(1);
  }

  const days = parseDays(process.argv.slice(2));
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: questionRows, error: questionErr } = await admin
    .from("questions")
    .select("day_number, question_number")
    .in("day_number", days);

  if (questionErr) {
    console.error("Failed to read questions:", questionErr.message);
    process.exit(1);
  }

  const questionCountByDay = new Map();
  for (const day of days) questionCountByDay.set(day, 0);
  for (const row of questionRows || []) {
    const day = Number(row.day_number);
    if (!questionCountByDay.has(day)) continue;
    questionCountByDay.set(day, questionCountByDay.get(day) + 1);
  }

  const { data: summaryRows, error: summaryErr } = await admin
    .from("daily_summaries")
    .select("student_id, day")
    .in("day", days)
    .eq("is_completed", true);

  if (summaryErr) {
    console.error("Failed to read daily_summaries:", summaryErr.message);
    process.exit(1);
  }

  const existing = new Set(
    (summaryRows || []).map((r) => `${r.student_id}:${Number(r.day)}`)
  );

  const { data: responseRows, error: responseErr } = await admin
    .from("responses")
    .select("student_id, day_number, question_number, correct, created_at")
    .in("day_number", days)
    .order("created_at", { ascending: true });

  if (responseErr) {
    console.error("Failed to read responses:", responseErr.message);
    process.exit(1);
  }

  const byStudentDay = new Map();
  for (const row of responseRows || []) {
    const studentId = row.student_id;
    const day = Number(row.day_number);
    const qn = Number(row.question_number);
    if (!studentId || !Number.isFinite(day) || !Number.isFinite(qn)) continue;
    const keyStr = `${studentId}:${day}`;
    if (!byStudentDay.has(keyStr)) byStudentDay.set(keyStr, new Map());
    byStudentDay.get(keyStr).set(qn, {
      question_number: qn,
      correct: Boolean(row.correct),
    });
  }

  const inserts = [];
  const skippedExisting = [];
  const skippedIncomplete = [];

  for (const [keyStr, questionMap] of byStudentDay.entries()) {
    const [studentId, dayStr] = keyStr.split(":");
    const day = Number(dayStr);
    if (existing.has(keyStr)) {
      skippedExisting.push(keyStr);
      continue;
    }
    const expected = questionCountByDay.get(day) || 0;
    const finalResponses = [...questionMap.values()];
    if (!expected || finalResponses.length < expected) {
      skippedIncomplete.push({
        studentId,
        day,
        answered: finalResponses.length,
        expected,
      });
      continue;
    }
    inserts.push(buildSummaryRow(studentId, day, finalResponses));
  }

  if (!inserts.length) {
    console.log("No missing completed daily_summaries found to backfill.");
    console.log(
      JSON.stringify(
        {
          days,
          already_present: skippedExisting.length,
          incomplete_or_partial: skippedIncomplete.length,
        },
        null,
        2
      )
    );
    return;
  }

  const { error: upsertErr } = await admin
    .from("daily_summaries")
    .upsert(inserts, { onConflict: "student_id,day" });

  if (upsertErr) {
    console.error("Backfill upsert failed:", upsertErr.message, upsertErr.code || "");
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        days,
        inserted: inserts.length,
        already_present: skippedExisting.length,
        incomplete_or_partial: skippedIncomplete.length,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
