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

  const { data: leaderboard, error: lbError } = await client
    .from("admin_leaderboard")
    .select("student_name, class, access_code, total_score, days_completed, rank")
    .order("days_completed", { ascending: true })
    .order("rank", { ascending: true });

  if (lbError) {
    return NextResponse.json(
      {
        error: lbError.message,
        hint: admin
          ? null
          : "If RLS blocks reads, set SUPABASE_SERVICE_ROLE_KEY for this API route only.",
      },
      { status: 500 }
    );
  }

  const { data: dailyRows, error: dailyError } = await client
    .from("daily_summaries")
    .select("student_id, day, score, created_at")
    .eq("is_completed", true)
    .order("created_at", { ascending: false })
    .limit(120);

  let recentDays = [];
  if (!dailyError && dailyRows?.length) {
    const ids = [...new Set(dailyRows.map((r) => r.student_id).filter(Boolean))];
    const { data: studs } = await client
      .from("students")
      .select("id, student_name, preferred_name, class")
      .in("id", ids);
    const byId = new Map((studs || []).map((s) => [s.id, s]));
    recentDays = dailyRows.map((r) => {
      const s = byId.get(r.student_id);
      return {
        student_name: s ? displayName(s) : "—",
        class: s?.class != null ? String(s.class).trim() : "",
        day: r.day,
        score: r.score,
        created_at: r.created_at,
      };
    });
  }

  return NextResponse.json({
    leaderboard: leaderboard || [],
    recentDays,
    dailyError: dailyError?.message || null,
    syncError,
  });
}
