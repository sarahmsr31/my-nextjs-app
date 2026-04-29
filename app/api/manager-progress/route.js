import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAdminLeaderboard } from "@/utils/syncAdminLeaderboard";

function tokenOk(provided, expected) {
  if (!expected || typeof expected !== "string") return false;
  const a = Buffer.from(String(provided || ""), "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function displayName(s) {
  const pref = s?.preferred_name?.trim();
  const legal = s?.student_name?.trim();
  const first = legal ? legal.split(/\s+/)[0] : "";
  return pref || first || legal || "Student";
}

function buildLeaderboardFromDaily(dailyRows, studentsById) {
  const byStudentDay = new Map();
  for (const r of dailyRows || []) {
    const sid = r.student_id;
    const day = Number(r.day);
    if (!sid || !Number.isFinite(day) || day < 1 || day > 40) continue;
    const key = `${sid}:${day}`;
    const prev = byStudentDay.get(key);
    // Keep latest completion snapshot for a student/day.
    if (!prev || String(r.created_at || "") > String(prev.created_at || "")) {
      byStudentDay.set(key, {
        student_id: sid,
        day,
        score: Number(r.score) || 0,
        created_at: r.created_at || null,
      });
    }
  }

  const byDay = new Map();
  for (const row of byStudentDay.values()) {
    if (!byDay.has(row.day)) byDay.set(row.day, []);
    byDay.get(row.day).push(row);
  }

  const out = [];
  for (const [day, rows] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    rows.sort((a, b) => b.score - a.score);
    let rank = 1;
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && rows[i].score < rows[i - 1].score) rank = i + 1;
      const s = studentsById.get(rows[i].student_id);
      out.push({
        student_name: s ? displayName(s) : "Student",
        class: s?.class != null ? String(s.class).trim() : "",
        access_code: s?.access_code?.trim() || "",
        total_score: rows[i].score,
        days_completed: day,
        rank,
      });
    }
  }
  return out;
}

export async function GET(request) {
  const expected = process.env.MANAGER_PROGRESS_TOKEN;
  const token = request.nextUrl.searchParams.get("token");

  if (!expected) {
    return NextResponse.json(
      { error: "Manager progress is not configured (missing MANAGER_PROGRESS_TOKEN)." },
      { status: 503 }
    );
  }
  if (!tokenOk(token, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const client = admin ?? createServerClient();
  let syncError = null;

  // Self-heal stale leaderboard data: when service role is available, rebuild
  // from completed daily_summaries before reading manager rows.
  if (admin) {
    const { error } = await syncAdminLeaderboard(admin);
    syncError = error?.message || null;
  }

  const { data: dailyRows, error: dailyError } = await client
    .from("daily_summaries")
    .select("student_id, day, score, created_at")
    .eq("is_completed", true)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (dailyError) {
    return NextResponse.json(
      {
        error: dailyError.message,
        hint: admin
          ? null
          : "If RLS blocks reads, set SUPABASE_SERVICE_ROLE_KEY for this API route only.",
      },
      { status: 500 }
    );
  }

  const ids = [...new Set((dailyRows || []).map((r) => r.student_id).filter(Boolean))];
  let studentsById = new Map();
  if (ids.length) {
    const { data: studs } = await client
      .from("students")
      .select("id, student_name, preferred_name, class, access_code")
      .in("id", ids);
    studentsById = new Map((studs || []).map((s) => [s.id, s]));
  }

  const leaderboard = buildLeaderboardFromDaily(dailyRows || [], studentsById);

  const recentDays = (dailyRows || []).slice(0, 120).map((r) => {
    const s = studentsById.get(r.student_id);
    return {
      student_name: s ? displayName(s) : "—",
      class: s?.class != null ? String(s.class).trim() : "",
      day: r.day,
      score: r.score,
      created_at: r.created_at,
    };
  });

  return NextResponse.json({
    leaderboard,
    recentDays,
    dailyError: null,
    syncError,
  });
}
