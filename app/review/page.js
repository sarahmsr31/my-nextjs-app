"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../utils/supabase/client";
import { BRANDING } from "../../utils/branding";
import {
  getMaxMissionDayCap,
  skipMaxMissionDayCap,
} from "../../utils/programCalendar";

function ReviewContent() {
  const router = useRouter();
  const params = useSearchParams();
  const day = Number(params.get("day"));
  const studentId = params.get("student_id");

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [reactionThumbs, setReactionThumbs] = useState(false);
  const [reactionHeart, setReactionHeart] = useState(false);
  const [savingReaction, setSavingReaction] = useState(false);
  const [reactionNotice, setReactionNotice] = useState("");

  async function saveReaction(nextThumbs, nextHeart) {
    if (!studentId || !Number.isFinite(day) || day < 1) return;
    setSavingReaction(true);
    setReactionNotice("");
    const { error } = await supabase
      .from("daily_summaries")
      .update({ thumbs_up: nextThumbs, heart_selected: nextHeart })
      .eq("student_id", studentId)
      .eq("day", day);
    if (error) {
      setReactionNotice("Could not save feedback right now.");
    } else {
      setReactionNotice("Feedback saved.");
    }
    setSavingReaction(false);
  }

  useEffect(() => {
    async function load() {
      if (!studentId || !Number.isFinite(day) || day < 1) {
        setLoading(false);
        return;
      }

      const missionCap = skipMaxMissionDayCap(new Date()) ? null : getMaxMissionDayCap();
      if (missionCap != null && day > missionCap) {
        setLoading(false);
        router.replace(
          `/dashboard?student_id=${encodeURIComponent(studentId)}&stay=1&tab=log`
        );
        return;
      }

      setLoading(true);
      const { data: daily } = await supabase
        .from("daily_summaries")
        .select("score, parent_summary, strengths, focus_areas, thumbs_up, heart_selected")
        .eq("student_id", studentId)
        .eq("day", day)
        .maybeSingle();

      setSummary(daily || null);
      setReactionThumbs(Boolean(daily?.thumbs_up));
      setReactionHeart(Boolean(daily?.heart_selected));
      setLoading(false);
    }
    load();
  }, [studentId, day, router]);

  if (loading) return <div style={loadingStyle}>Loading mission log...</div>;

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <button
          type="button"
          onClick={() => router.push(`/dashboard?student_id=${encodeURIComponent(studentId)}&stay=1&tab=log`)}
          style={backBtnStyle}
        >
          ← Back to Flight Archive
        </button>
        <h1 style={titleStyle}>Day {day} Mission Log</h1>
      </header>

      {summary && (
        <section style={cardStyle}>
          <p style={metaStyle}>Session Accuracy: {Math.round(Number(summary.score) || 0)}%</p>
          <p style={debriefStyle}>"{summary.parent_summary}"</p>
        </section>
      )}

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Your Feedback</h2>
        <p style={feedbackPromptStyle}>
          {reactionThumbs || reactionHeart
            ? "Feedback submitted for this mission."
            : "How did this mission feel for you?"}
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            aria-pressed={reactionThumbs}
            disabled={savingReaction}
            onClick={() => {
              const next = !reactionThumbs;
              setReactionThumbs(next);
              void saveReaction(next, reactionHeart);
            }}
            style={{
              ...reactionBtnStyle,
              ...(reactionThumbs ? reactionBtnActiveStyle : {}),
              opacity: savingReaction ? 0.7 : 1,
            }}
          >
            👍 Helped
          </button>
          <button
            type="button"
            aria-pressed={reactionHeart}
            disabled={savingReaction}
            onClick={() => {
              const next = !reactionHeart;
              setReactionHeart(next);
              void saveReaction(reactionThumbs, next);
            }}
            style={{
              ...reactionBtnStyle,
              ...(reactionHeart ? reactionBtnActiveStyle : {}),
              opacity: savingReaction ? 0.7 : 1,
            }}
          >
            ❤️ Loved it
          </button>
        </div>
        {reactionNotice ? <p style={noticeStyle}>{reactionNotice}</p> : null}
      </section>

      <footer style={BRANDING.FOOTER_STYLE}>{BRANDING.FOOTER_LINE}</footer>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  background: "#FFFFFF",
  color: "#1F2937",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
};
const headerStyle = { maxWidth: "900px", width: "100%", margin: "0 auto 18px" };
const titleStyle = { margin: "12px 0 0", color: "#FF6A1A", fontSize: "26px" };
const backBtnStyle = { background: "none", border: "1px solid #94A3B8", color: "#334155", padding: "8px 14px", borderRadius: "12px", cursor: "pointer" };
const cardStyle = {
  maxWidth: "900px",
  width: "100%",
  margin: "0 auto 16px",
  border: "1px solid #E2E8F0",
  background: "#F8FAFC",
  borderRadius: "18px",
  padding: "16px",
};
const sectionTitleStyle = { marginTop: 0, color: "#FF6A1A", fontSize: "18px" };
const metaStyle = { margin: "0 0 8px", color: "#64748B", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" };
const debriefStyle = { margin: 0, color: "#1F2937", lineHeight: 1.6, fontStyle: "italic" };
const feedbackPromptStyle = { margin: "0 0 12px", color: "#334155" };
const reactionBtnStyle = {
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#334155",
  borderRadius: "12px",
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};
const reactionBtnActiveStyle = {
  border: "1px solid #FF6A1A",
  background: "rgba(255, 106, 26, 0.14)",
};
const noticeStyle = { margin: "10px 0 0", color: "#64748B", fontSize: "12px" };
const loadingStyle = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFFFF", color: "#FF6A1A", fontWeight: 700 };

export default function ReviewPage() {
  return (
    <Suspense fallback={<div style={loadingStyle}>Loading mission log...</div>}>
      <ReviewContent />
    </Suspense>
  );
}

