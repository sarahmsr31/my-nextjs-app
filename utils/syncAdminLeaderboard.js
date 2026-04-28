/**
 * Rebuilds admin_leaderboard from daily_summaries (completed days only).
 *
 * Writes one row per student per day:
 * - total_score: that specific day's score
 * - days_completed: mission day number (used as day marker in this table)
 * - rank: rank within that day by score desc
 *
 * Requires a UNIQUE constraint on admin_leaderboard(access_code, days_completed)
 * for upsert to work as intended.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {Promise<{ error: Error | null }>}
 */
export async function syncAdminLeaderboard(supabase) {
  const { data: rows, error: fetchError } = await supabase
    .from("daily_summaries")
    .select("student_id, day, score")
    .eq("is_completed", true);

  if (fetchError) return { error: fetchError };
  if (!rows?.length) return { error: null };

  const byStudentDay = new Map();
  for (const r of rows) {
    const sid = r.student_id;
    const day = Number(r.day);
    if (!sid || !Number.isFinite(day) || day < 1) continue;
    const key = `${sid}:${day}`;
    byStudentDay.set(key, {
      student_id: sid,
      day,
      score: Number(r.score) || 0,
    });
  }

  const uniqueRows = [...byStudentDay.values()];
  if (!uniqueRows.length) return { error: null };

  const studentIds = [...new Set(uniqueRows.map((r) => r.student_id))];
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, student_name, preferred_name, class, access_code")
    .in("id", studentIds);

  if (studentsError) return { error: studentsError };

  const studentById = new Map((students || []).map((s) => [s.id, s]));

  const byDay = new Map();
  for (const row of uniqueRows) {
    if (!byDay.has(row.day)) byDay.set(row.day, []);
    byDay.get(row.day).push(row);
  }

  const payloads = [];
  for (const [day, dayRows] of byDay.entries()) {
    dayRows.sort((a, b) => b.score - a.score);
    let rank = 1;

    for (let i = 0; i < dayRows.length; i++) {
      const row = dayRows[i];
      if (i > 0 && row.score < dayRows[i - 1].score) rank = i + 1;

      const s = studentById.get(row.student_id);
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
        total_score: row.score,
        days_completed: day,
        rank,
      });
    }
  }

  if (!payloads.length) return { error: null };

  const chunkSize = 50;
  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    const { error: upsertError } = await supabase
      .from("admin_leaderboard")
      .upsert(chunk, { onConflict: "access_code,days_completed" });
    if (upsertError) return { error: upsertError };
  }

  return { error: null };
}
