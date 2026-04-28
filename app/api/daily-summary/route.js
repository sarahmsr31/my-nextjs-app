import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAdminLeaderboard } from "@/utils/syncAdminLeaderboard";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validUuid(id) {
  return typeof id === "string" && UUID_RE.test(id);
}

function validDay(d) {
  const n = Number(d);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 40;
}

function missingServiceRoleResponse() {
  return NextResponse.json(
    {
      error: "missing_service_role",
      message:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Project Settings → API). The browser anon key is usually blocked by RLS on daily_summaries, so the server saves the row with the service role.",
    },
    { status: 503 }
  );
}

/** Upsert mission summary (bypasses RLS when service role is configured). */
export async function POST(req) {
  const admin = createAdminClient();
  if (!admin) return missingServiceRoleResponse();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const student_id = body.student_id;
  const day = body.day;
  if (!validUuid(student_id) || !validDay(day)) {
    return NextResponse.json({ error: "Invalid student_id or day" }, { status: 400 });
  }

  const row = {
    student_id,
    day: Number(day),
    score: Number(body.score),
    correct_count: Number(body.correct_count),
    total_questions: Number(body.total_questions),
    parent_summary: String(body.parent_summary ?? "").slice(0, 20000),
    strengths: Array.isArray(body.strengths) ? body.strengths : [],
    focus_areas: Array.isArray(body.focus_areas) ? body.focus_areas : [],
    recommended_micro_lessons: null,
    is_completed: true,
  };

  const { error } = await admin.from("daily_summaries").upsert(row, {
    onConflict: "student_id,day",
  });

  if (error) {
    console.error("daily_summaries upsert (service role):", error);
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 }
    );
  }

  const { error: syncErr } = await syncAdminLeaderboard(admin);
  if (syncErr) console.error("syncAdminLeaderboard:", syncErr);

  return NextResponse.json({ ok: true });
}

/** Update learner reaction columns on existing row. */
export async function PATCH(req) {
  const admin = createAdminClient();
  if (!admin) return missingServiceRoleResponse();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const student_id = body.student_id;
  const day = body.day;
  if (!validUuid(student_id) || !validDay(day)) {
    return NextResponse.json({ error: "Invalid student_id or day" }, { status: 400 });
  }

  const patch = {
    thumbs_up: Boolean(body.thumbs_up),
    heart_selected: Boolean(body.heart_selected),
  };

  const { error } = await admin
    .from("daily_summaries")
    .update(patch)
    .eq("student_id", student_id)
    .eq("day", Number(day));

  if (error) {
    console.error("daily_summaries reaction update:", error);
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
