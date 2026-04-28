/**
 * Rebuilds admin_leaderboard from daily_summaries (completed days only).
 * Requires a UNIQUE constraint on admin_leaderboard(access_code) for upsert.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {Promise<{ error: Error | null }>}
 */
export async function syncAdminLeaderboard(supabase) {
  const { data: rows, error: fetchError } = await supabase
    .from("daily_summaries")
    .select("student_id, score")
    .eq("is_completed", true);

  if (fetchError) return { error: fetchError };
  if (!rows?.length) return { error: null };

  const byStudent = new Map();
  for (const r of rows) {
    const sid = r.student_id;
    if (!sid) continue;
    if (!byStudent.has(sid)) byStudent.set(sid, { total_score: 0, days_completed: 0 });
    const agg = byStudent.get(sid);
    agg.total_score += Number(r.score) || 0;
    agg.days_completed += 1;
  }

  const studentIds = [...byStudent.keys()];
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, student_name, preferred_name, class, access_code")
    .in("id", studentIds);

  if (studentsError) return { error: studentsError };

  const studentById = new Map((students || []).map((s) => [s.id, s]));

  const sorted = [...byStudent.entries()].sort((a, b) => {
    const diff = b[1].total_score - a[1].total_score;
    if (diff !== 0) return diff;
    return b[1].days_completed - a[1].days_completed;
  });

  let rank = 1;
  const payloads = [];
  for (let i = 0; i < sorted.length; i++) {
    const [id, agg] = sorted[i];
    if (i > 0 && agg.total_score < sorted[i - 1][1].total_score) rank = i + 1;

    const s = studentById.get(id);
    const code = s?.access_code?.trim();
    if (!code) continue;

    const pref = s.preferred_name?.trim();
    const legal = s.student_name?.trim();
    const first = legal ? legal.split(/\s+/)[0] : "";
    const student_name = pref || first || legal || "Student";

    payloads.push({
      student_name,
      class: s.class != null ? String(s.class).trim() : "",
      access_code: code,
      total_score: agg.total_score,
      days_completed: agg.days_completed,
      rank,
    });
  }

  if (!payloads.length) return { error: null };

  const chunkSize = 50;
  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    const { error: upsertError } = await supabase
      .from("admin_leaderboard")
      .upsert(chunk, { onConflict: "access_code" });
    if (upsertError) return { error: upsertError };
  }

  return { error: null };
}
