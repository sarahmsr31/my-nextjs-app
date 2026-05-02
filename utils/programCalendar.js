/**
 * Ad Astra program schedule (default: 40 consecutive calendar days from launch).
 *
 * - Before launch: progress uses "legacy" mode (sequential completion + student.current_day)
 *   unless NEXT_PUBLIC_PROGRAM_TEST_MISSION_DAY is set (1–40) to simulate the class day.
 * - On/after launch: everyone uses the same official mission day (no makeup; missed days stay missed).
 * - May 1 reset: set NEXT_PUBLIC_PROGRAM_PROGRESS_CUTOVER to an ISO timestamp so only rows
 *   created on/after that count toward completion (optional; requires created_at on tables).
 *
 * Env:
 * - NEXT_PUBLIC_PROGRAM_LAUNCH_DATE — YYYY-MM-DD (default 2026-05-01)
 * - NEXT_PUBLIC_PROGRAM_TOTAL_DAYS — default 40
 * - NEXT_PUBLIC_PROGRAM_DAY_STRATEGY — "consecutive" | "weekdays" (40 weekdays, May 1 = day 1)
 * - NEXT_PUBLIC_PROGRAM_TEST_MISSION_DAY — only before launch; simulates official day 1–40
 * - NEXT_PUBLIC_PROGRAM_PROGRESS_CUTOVER — optional ISO time; filter progress after reset
 * - NEXT_PUBLIC_PROGRAM_MAX_MISSION_DAY — optional 1–40; cohort may not open quiz/review beyond
 *   this day (e.g. set to 1 so only Day 1 is live and Days 2–40 stay locked until you raise it).
 * - NEXT_PUBLIC_PROGRAM_SCHEDULE_MODE — "calendar" (default) uses launch date progression;
 *   "manual" ignores the calendar until end date below — you choose the live bank each day via CLASS_MISSION_DAY.
 * - NEXT_PUBLIC_PROGRAM_CLASS_MISSION_DAY — when schedule mode is manual (and within pilot dates),
 *   the mission day ALL students open (1–40). Example: cohort missed Day 1 — set to 1 until they finish.
 * - NEXT_PUBLIC_PROGRAM_MANUAL_SCHEDULE_END_DATE — YYYY-MM-DD (default 2026-06-16). Manual mode stops
 *   after this calendar day (inclusive pilot); from the next day the calendar automation runs again unless
 *   you keep SCHEDULE_MODE=manual and extend/adjust dates.
 */


function parseYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysDiffUtc(a, b) {
  const t1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const t2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((t2 - t1) / 86400000);
}

function envStr(key, fallback) {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return fallback;
}

function buildWeekdaySchedule(launchYmd, total) {
  const start = parseYmd(launchYmd);
  if (!start) return [];
  const out = [];
  const d = new Date(start);
  out.push(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  );
  d.setDate(d.getDate() + 1);
  while (out.length < total) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      out.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function toYmdLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** When set (1–40), mission day is capped for the whole cohort (locks higher days). */
export function getMaxMissionDayCap() {
  const v = envStr("NEXT_PUBLIC_PROGRAM_MAX_MISSION_DAY", "").trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1 || n > 40) return null;
  return Math.floor(n);
}

function getTotalDays() {
  return Math.min(40, Math.max(1, Number(envStr("NEXT_PUBLIC_PROGRAM_TOTAL_DAYS", "40")) || 40));
}

/**
 * Pilot window where SCHEDULE_MODE=manual skips calendar-based mission day and skips MAX_MISSION_DAY cap.
 * After END_DATE (local), automation resumes from the calendar if mode stays manual (checks end).
 */
export function skipMaxMissionDayCap(now = new Date()) {
  const mode = envStr("NEXT_PUBLIC_PROGRAM_SCHEDULE_MODE", "calendar").toLowerCase();
  if (mode !== "manual") return false;

  const endStr =
    envStr("NEXT_PUBLIC_PROGRAM_MANUAL_SCHEDULE_END_DATE", "2026-06-16") || "2026-06-16";
  const pilotEnd = parseYmd(endStr);
  const today = startOfLocalDay(now);
  if (!pilotEnd) return true;
  return today <= pilotEnd;
}

/**
 * Calendar-based mission context before cohort cap is applied.
 * @returns {{ phase: 'prelaunch' | 'live' | 'ended', officialDay: number | null, useLegacyProgression: boolean }}
 */
function getProgramMissionContextUncapped(now = new Date()) {
  const total = getTotalDays();
  const today = startOfLocalDay(now);

  if (skipMaxMissionDayCap(now)) {
    const md = Number(envStr("NEXT_PUBLIC_PROGRAM_CLASS_MISSION_DAY", ""));
    if (Number.isFinite(md) && md >= 1 && md <= total) {
      const d = Math.floor(md);
      if (d > total) {
        return { phase: "ended", officialDay: total, useLegacyProgression: false };
      }
      return { phase: "live", officialDay: d, useLegacyProgression: false };
    }
    // Manual pilot but missing/invalid CLASS_MISSION_DAY — keep cohort on Day 1 until configured.
    return { phase: "live", officialDay: 1, useLegacyProgression: false };
  }

  const launchYmd = envStr("NEXT_PUBLIC_PROGRAM_LAUNCH_DATE", "2026-05-01");
  const strategy = envStr("NEXT_PUBLIC_PROGRAM_DAY_STRATEGY", "consecutive");

  const start = parseYmd(launchYmd);
  if (!start) {
    return { phase: "prelaunch", officialDay: null, useLegacyProgression: true };
  }

  const startDay = startOfLocalDay(start);

  if (today < startDay) {
    const test = Number(envStr("NEXT_PUBLIC_PROGRAM_TEST_MISSION_DAY", ""));
    if (Number.isFinite(test) && test >= 1 && test <= total) {
      return {
        phase: "live",
        officialDay: Math.floor(test),
        useLegacyProgression: false,
      };
    }
    return { phase: "prelaunch", officialDay: null, useLegacyProgression: true };
  }

  if (strategy === "weekdays") {
    const schedule = buildWeekdaySchedule(launchYmd, total);
    const ymd = toYmdLocal(today);
    let idx = schedule.indexOf(ymd);
    let officialDay;
    if (idx >= 0) {
      officialDay = idx + 1;
    } else {
      let last = 0;
      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i] <= ymd) last = i + 1;
      }
      if (last < 1) officialDay = 1;
      else officialDay = last;
    }
    if (officialDay > total) {
      return { phase: "ended", officialDay: total, useLegacyProgression: false };
    }
    const lastYmd = schedule[total - 1];
    if (ymd > lastYmd) {
      return { phase: "ended", officialDay: total, useLegacyProgression: false };
    }
    return { phase: "live", officialDay, useLegacyProgression: false };
  }

  // consecutive calendar days: launch = day 1
  const diff = daysDiffUtc(startDay, today);
  const dayNum = diff + 1;
  if (dayNum > total) {
    return { phase: "ended", officialDay: total, useLegacyProgression: false };
  }
  return { phase: "live", officialDay: dayNum, useLegacyProgression: false };
}

/**
 * Program mission context with optional NEXT_PUBLIC_PROGRAM_MAX_MISSION_DAY cap.
 * @returns {{ phase: 'prelaunch' | 'live' | 'ended', officialDay: number | null, useLegacyProgression: boolean }}
 */
export function getProgramMissionContext(now = new Date()) {
  const ctx = getProgramMissionContextUncapped(now);
  const cap = skipMaxMissionDayCap(now) ? null : getMaxMissionDayCap();
  if (ctx.officialDay != null && cap != null) {
    return { ...ctx, officialDay: Math.min(ctx.officialDay, cap) };
  }
  return ctx;
}

/** Optional Supabase filter: only count progress at/after this instant (May 1 reset). */
export function getProgressCutoverIso() {
  const v = envStr("NEXT_PUBLIC_PROGRAM_PROGRESS_CUTOVER", "").trim();
  return v || null;
}
