"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase/client";
import { syncAdminLeaderboard } from "../../utils/syncAdminLeaderboard";
import { BRANDING } from "../../utils/branding";
import {
  getProgramMissionContext,
  getMaxMissionDayCap,
  getProgressCutoverIso,
  skipMaxMissionDayCap,
  getManualMissionCatchUpRange,
  getFirstIncompleteInRange,
} from "../../utils/programCalendar";
import { motion, AnimatePresence } from "framer-motion";

function QuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const day = searchParams.get("day");
  const studentId = searchParams.get("student_id");

  // State Management
  const [questions, setQuestions] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quiz Mechanics & Feedback
  const [chances, setChances] = useState(2);
  const [feedback, setFeedback] = useState({ text: "", color: "", type: null });
  const [aiHint, setAiHint] = useState("");
  
  // Scoring & Peer Data
  const [userScore, setUserScore] = useState(0);
  const [peerAverage, setPeerAverage] = useState(null);
  const [aiDebrief, setAiDebrief] = useState("Analyzing flight data...");
  const [dayRecap, setDayRecap] = useState("");
  const [reactionThumbs, setReactionThumbs] = useState(false);
  const [reactionHeart, setReactionHeart] = useState(false);
  const [summarySaveError, setSummarySaveError] = useState(null);

  const persistLearnerReaction = useCallback(
    async (thumbs, heart) => {
      if (!studentId || day == null) return;
      try {
        const res = await fetch("/api/daily-summary", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            day: Number(day),
            thumbs_up: thumbs,
            heart_selected: heart,
          }),
        });
        if (res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (data?.error === "missing_service_role") {
          const { error } = await supabase
            .from("daily_summaries")
            .update({ thumbs_up: thumbs, heart_selected: heart })
            .eq("student_id", studentId)
            .eq("day", Number(day));
          if (error)
            console.error(
              "Learner reaction save failed (add thumbs_up, heart_selected columns if missing):",
              error.message
            );
          return;
        }
        console.error("Learner reaction API:", data?.error || res.status);
      } catch (e) {
        console.error("Learner reaction save:", e);
      }
    },
    [studentId, day]
  );

  // HELPER: Personalization Engine
  const personalize = (text) => {
    if (!text) return "";
    return text.replace(/{{name}}/g, studentName);
  };

  useEffect(() => {
    async function loadMissionData() {
      if (!studentId || !day) return;

      setLoading(true); // Ensure loading starts as true

      // 1. Fetch Student Info (preferred_name is primary display name)
      const { data: student, error } = await supabase
        .from("students")
        .select("preferred_name, student_name")
        .eq("id", studentId)
        .single();

      const preferred = student?.preferred_name?.trim();
      const legalFull = student?.student_name?.trim();
      const firstFromLegal = legalFull ? legalFull.split(/\s+/)[0] : "";
      const resolvedStudentName = preferred || firstFromLegal || "";

      if (resolvedStudentName) {
        setStudentName(resolvedStudentName);
      } else {
        console.error("Student not found or preferred_name/student_name missing:", error, student);
        setStudentName("Student");
      }

      let missionCap = skipMaxMissionDayCap(new Date()) ? null : getMaxMissionDayCap();
      let programCtx = getProgramMissionContext(new Date());
      let catchUpRange = getManualMissionCatchUpRange(new Date());
      try {
        const schRes = await fetch("/api/program-schedule", { cache: "no-store" });
        if (schRes.ok) {
          const sch = await schRes.json();
          if (sch.missionCap !== undefined) missionCap = sch.missionCap;
          if (sch.programCtx) programCtx = sch.programCtx;
          if (sch.catchUpRange !== undefined) catchUpRange = sch.catchUpRange;
        }
      } catch {
        /* keep client-side calendar */
      }

      if (missionCap != null && Number(day) > missionCap) {
        router.replace(
          `/quiz?day=${missionCap}&student_id=${encodeURIComponent(studentId)}`
        );
        return;
      }

      const dayNum = Number(day);

      if (
        catchUpRange &&
        !programCtx.useLegacyProgression &&
        programCtx.phase === "live"
      ) {
        if (
          dayNum < catchUpRange.min ||
          dayNum > catchUpRange.max
        ) {
          const cutIso = getProgressCutoverIso();
          let sumQ = supabase
            .from("daily_summaries")
            .select("day")
            .eq("student_id", studentId)
            .eq("is_completed", true);
          if (cutIso) sumQ = sumQ.gte("created_at", cutIso);
          const { data: sums } = await sumQ;
          const nums = (sums || []).map((r) => Number(r.day));
          const target =
            getFirstIncompleteInRange(nums, catchUpRange) ?? catchUpRange.min;
          router.replace(
            `/quiz?day=${target}&student_id=${encodeURIComponent(studentId)}`
          );
          return;
        }
      } else if (
        !programCtx.useLegacyProgression &&
        programCtx.phase === "live" &&
        programCtx.officialDay != null &&
        dayNum !== programCtx.officialDay
      ) {
        router.replace(
          `/quiz?day=${programCtx.officialDay}&student_id=${encodeURIComponent(studentId)}`
        );
        return;
      }

      // Prevent replaying a day that is already marked complete.
      const { data: finished } = await supabase
        .from("daily_summaries")
        .select("id")
        .eq("student_id", studentId)
        .eq("day", Number(day))
        .eq("is_completed", true)
        .maybeSingle();
      if (finished) {
        router.replace(
          `/review?day=${Number(day)}&student_id=${encodeURIComponent(studentId)}`
        );
        return;
      }

      // Fallback guard: if summary row is missing but all questions for this day were
      // already answered in responses, route to review instead of allowing a reattempt.
      const cutIso = getProgressCutoverIso();
      let answeredQ = supabase
        .from("responses")
        .select("question_number")
        .eq("student_id", studentId)
        .eq("day_number", Number(day));
      if (cutIso) answeredQ = answeredQ.gte("created_at", cutIso);
      const { data: answeredRows } = await answeredQ;
      const uniqueAnswered = new Set(
        (answeredRows || [])
          .map((r) => Number(r.question_number))
          .filter((n) => Number.isFinite(n))
      ).size;
      if (uniqueAnswered >= 10) {
        router.replace(
          `/review?day=${Number(day)}&student_id=${encodeURIComponent(studentId)}`
        );
        return;
      }

      if (Number(day) > 1) {
        const { data: prevResponses } = await supabase
          .from('responses')
          .select('correct, topic')
          .eq('student_id', studentId)
          .eq('day_number', Number(day) - 1);

        if (prevResponses?.length > 0) {
          const res = await fetch("/api/debrief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentName: resolvedStudentName,
              day: day,
              responses: prevResponses,
              mode: "recap"
            })
          });
          const data = await res.json().catch(() => ({}));
          const recapText =
            typeof data?.feedback === "string" && data.feedback.trim()
              ? data.feedback.trim()
              : "";
          setDayRecap(recapText);
        }
      }

      // 2. Fetch Questions for the current day
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("day_number", Number(day))
        .order('question_number', { ascending: true });

      if (qs) setQuestions(qs);
      
      setLoading(false); // Only stop loading once EVERYTHING is ready
    }
    loadMissionData();
  }, [day, studentId, router]);

  // Handle Score Calculation on Finish
  useEffect(() => {
    if (quizFinished) {
      async function calculateStats() {
        setSummarySaveError(null);
        const { data: userResponses } = await supabase
          .from('responses')
          .select('question_number, attempt, correct, topic, answer, created_at')
          .eq('student_id', studentId)
          .eq('day_number', Number(day))
          .order('question_number', { ascending: true })
          .order('created_at', { ascending: true });
        
        if (userResponses?.length > 0) {
          // Score by the final attempt per question (not total raw attempts).
          const lastAttemptByQuestion = new Map();
          for (const r of userResponses) {
            const qn = Number(r.question_number);
            if (!Number.isFinite(qn)) continue;
            lastAttemptByQuestion.set(qn, r);
          }
          const finalResponses = [...lastAttemptByQuestion.values()];
          const correctCount = finalResponses.filter((r) => r.correct).length;
          setUserScore(
            finalResponses.length > 0
              ? Math.round((correctCount / finalResponses.length) * 100)
              : 0
          );

          try {
            const res = await fetch("/api/debrief", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentName: studentName,
                day: day,
                responses: finalResponses,
              }),
            });
            const data = await res.json().catch(() => ({}));
            const aiData = {
              feedback:
                typeof data?.feedback === "string" ? data.feedback.trim() : "",
              strengths: Array.isArray(data?.strengths) ? data.strengths : [],
              focus_areas: Array.isArray(data?.focus_areas) ? data.focus_areas : [],
            };
            const text =
              aiData.feedback ||
              (typeof data?.error === "string"
                ? `Briefing unavailable: ${data.error}`
                : "Great work completing this mission. Your results are saved.");

            const aiStrengthsArray = aiData.strengths.length ? aiData.strengths : [];
            const aiFocusArray = aiData.focus_areas.length ? aiData.focus_areas : [];
            const currentDay = Number(day);
            const totalQuestions = finalResponses.length;
            const correctAnswers = correctCount;
            const aiFeedbackText = text;

            /** Matches daily_summaries shape: Gemini debrief + session stats. */
            const dailySummaryRow = {
              student_id: studentId,
              day: currentDay,
              score: (correctAnswers / totalQuestions) * 100,
              correct_count: correctAnswers,
              total_questions: totalQuestions,
              parent_summary: aiFeedbackText,
              strengths: aiStrengthsArray,
              focus_areas: aiFocusArray,
              recommended_micro_lessons: null,
              is_completed: true,
            };

            let summaryError = null;
            const apiRes = await fetch("/api/daily-summary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(dailySummaryRow),
            });
            if (!apiRes.ok) {
              const { error: upErr } = await supabase.from("daily_summaries").upsert(dailySummaryRow, {
                onConflict: "student_id,day",
              });
              summaryError = upErr;
              if (!upErr) {
                const { error: leaderboardError } = await syncAdminLeaderboard(supabase);
                if (leaderboardError)
                  console.error("Error syncing admin leaderboard:", leaderboardError);
              }
            }

            if (summaryError) {
              console.error("Error saving daily summary:", summaryError);
              setSummarySaveError(
                "Your debrief showed on screen, but the summary did not save. Fix one of: (1) Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server. (2) In Supabase: RLS policies allowing insert/update on daily_summaries for your app, plus a UNIQUE (student_id, day) constraint for upserts."
              );
            }

            setAiDebrief(text);
          } catch (err) {
            setAiDebrief("Flight data archived successfully. Well done!");
          }
        }

        // Peer average calculation
        const { data: allPeerData } = await supabase
          .from('responses')
          .select('correct')
          .eq('day_number', Number(day));
        
        if (allPeerData?.length > 0) {
          const totalCorrect = allPeerData.filter(r => r.correct).length;
          setPeerAverage(Math.round((totalCorrect / allPeerData.length) * 100));
        }

        const ctxSnap = getProgramMissionContext(new Date());
        if (studentId && userResponses?.length > 0) {
          let nextCal;
          if (ctxSnap.useLegacyProgression) {
            const { data: sRow } = await supabase
              .from("students")
              .select("current_day")
              .eq("id", studentId)
              .single();
            const cur = Number(sRow?.current_day) || 1;
            const afterMission = Number(day) + 1;
            nextCal = Math.min(40, Math.max(afterMission, cur));
          } else {
            nextCal = Math.min(40, Number(day) + 1);
          }
          const { error: dayErr } = await supabase
            .from("students")
            .update({ current_day: nextCal })
            .eq("id", studentId);
          if (dayErr) console.error("Error updating current_day:", dayErr);
        }
      }
      calculateStats();
    }
  }, [quizFinished, day, studentId, studentName]);

  const handleAnswer = async (choice) => {
    if (feedback.type) return;
    const currentQ = questions[currentIndex];

    // Identify which letter (A, B, C, or D) the user clicked based on the value
    const selectedOptionKey = Object.keys(currentQ).find(key => currentQ[key] === choice);
    const selectedLetter = selectedOptionKey?.split('_')[1].toUpperCase();
    
    // Check if correct
    const isCorrect = selectedLetter === currentQ.correct_answer;

    // --- LOG TO RESPONSES TABLE ---
    const { error: logError } = await supabase.from('responses').insert({
      student_id: studentId,
      day_number: Number(day),
      question_number: currentQ.question_number,
      answer: choice,          // Matches your 'answer' column
      correct: isCorrect,      // Matches your 'correct' column
      attempt: 3 - chances,    // chances=2 -> attempt 1, chances=1 -> attempt 2
      topic: currentQ.topic,
      difficulty: currentQ.difficulty,
      feedback: isCorrect ? currentQ.feedback_correct : currentQ.feedback_incorrect
    });

    if (logError) console.error("Database log failed:", logError.message);

    // --- UPDATE UI ---
    if (isCorrect) {
      setFeedback({ 
        text: personalize(currentQ.feedback_correct) || "Correct! 🌟", 
        color: "#10b981", 
        type: "correct" 
      });
    } else {
      if (chances > 1) {
        setChances(prev => prev - 1);
        setFeedback({ 
          text: "Not quite!", 
          color: "#FF6A1A", 
          type: "retry" 
        });
        setAiHint(personalize(currentQ.retry_hint) || "Take another look and try again.");
      } else {
        setFeedback({ 
          text: personalize(currentQ.feedback_incorrect) || `Target Answer: ${currentQ.correct_answer}`, 
          color: "#f43f5e", 
          type: "incorrect" 
        });
      }
    }
  };

  const handleNext = () => {
    setFeedback({ text: "", color: "", type: null });
    setAiHint("");
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setChances(2);
    } else {
      setQuizFinished(true);
    }
  };

  const goToDashboard = () => {
    if (studentId) {
      router.push(`/dashboard?student_id=${encodeURIComponent(studentId)}&stay=1`);
    } else {
      router.push("/login");
    }
  };

  const goToLogin = () => {
    router.push("/login");
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FFFFFF",
          color: "#1F2937",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#FF6A1A", fontWeight: "bold", letterSpacing: "2px" }}>SYNCHRONIZING NAVIGATOR DATA...</p>
        </div>
        <footer style={BRANDING.FOOTER_STYLE}>{BRANDING.FOOTER_LINE}</footer>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={quizMainColumnStyle}>
      <header style={headerStyle}>
        <button
          type="button"
          onClick={goToDashboard}
          aria-label="Go to dashboard"
          style={{
            ...miniLogoStyle,
            padding: 0,
            overflow: "hidden",
            cursor: "pointer",
            display: "block",
            background: "none",
          }}
        >
          <img
            src={BRANDING.LOGO_URL}
            alt=""
            aria-hidden
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
          />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" onClick={goToDashboard} style={exitBtnStyle}>← Dashboard</button>
          <button type="button" onClick={goToLogin} style={logoutBtnStyle}>Log out</button>
        </div>
      </header>

      <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
        <AnimatePresence mode="wait">
          {showIntro ? (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={cardStyle}>
              {/* DAY RECAP (Gemini's feedback from Day 2 onwards) */}
              {dayRecap && (
                <div style={recapBoxStyle}>
                  <p style={{ fontSize: "14px", lineHeight: "1.5" }}>{dayRecap}</p>
                </div>
              )}

              <h1 style={{ color: "#FF6A1A", fontSize: "24px", marginBottom: "15px" }}>
                Day {day}: Mission Briefing
              </h1>

              <div style={briefingTextStyle}>
                {Number(day) === 1 ? (
                  <>
                    <p style={{ fontWeight: "bold", color: "#FF6A1A", marginBottom: "10px" }}>Hi {studentName}!</p>
                    <p>
                      Welcome to Day 1 of Ad Astra. I am so excited to start this 40-day mission with you.
                      Today is our <strong>Pre-Flight Check</strong>. Think of this like a map; before we soar to the stars,
                      we need to know exactly where we are standing.
                    </p>
                    <p style={{ marginTop: "10px" }}>
                      This isn&apos;t a school exam, so don&apos;t be nervous! It&apos;s just a way for us to see your starting point.
                      Be honest, do your best, and remember: by Day 40, you&apos;re going to look back at today and see how much you&apos;ve grown.
                    </p>
                    <p style={{ marginTop: "15px", fontWeight: "bold", color: "#FF6A1A" }}>
                      {studentName}, are you ready? Let&apos;s see what you&apos;ve got!
                    </p>
                  </>
                ) : (
                  <p>{personalize(questions[0]?.mission_briefing)}</p>
                )}
              </div>

              <button onClick={() => setShowIntro(false)} style={primaryBtnStyle}>
                Begin Flight Check
              </button>
            </motion.div>
          ) : quizFinished ? (
            <motion.div key="finished" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={cardStyle}>
              <h2 style={{ fontSize: "28px", color: "#FF6A1A", textAlign: "center" }}>Mission Complete</h2>
              <div style={scoreBoxStyle}>
                <div style={{ fontSize: "48px", fontWeight: "800", color: "#FF6A1A" }}>{userScore}%</div>
                <p style={{ fontSize: "12px", color: "#94A3B8", letterSpacing: "1px", marginBottom: "20px" }}>
                  SESSION ACCURACY
                </p>

                {summarySaveError && (
                  <p
                    role="alert"
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.5,
                      color: "#fca5a5",
                      background: "rgba(244, 63, 94, 0.12)",
                      border: "1px solid rgba(244, 63, 94, 0.35)",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      marginBottom: "16px",
                      textAlign: "left",
                    }}
                  >
                    {summarySaveError}
                  </p>
                )}

                {/* NEW AI FEEDBACK BOX */}
                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "20px", textAlign: "left" }}>
                  <p style={{ fontSize: "15px", color: "#C2410C", fontWeight: 800, marginBottom: "8px", letterSpacing: "0.02em" }}>
                    🚀 INSTRUCTOR DEBRIEF:
                  </p>
                  <p style={{ fontSize: "18px", lineHeight: "1.75", color: "#0F172A", fontStyle: "normal", fontWeight: 600 }}>
                    "{aiDebrief}"
                  </p>
                </div>

                <div style={reactionSectionStyle}>
                  <p style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "12px", textAlign: "center" }}>
                    Tap if today&apos;s mission and debrief helped you learn.
                  </p>
                  <div
                    style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}
                    role="group"
                    aria-label="Quick feedback on your mission"
                  >
                    <button
                      type="button"
                      aria-pressed={reactionThumbs}
                      aria-label="Thumbs up — this helped"
                      onClick={() => {
                        const next = !reactionThumbs;
                        setReactionThumbs(next);
                        void persistLearnerReaction(next, reactionHeart);
                      }}
                      style={{
                        ...reactionBtnStyle,
                        ...(reactionThumbs ? reactionBtnActiveStyle : {}),
                      }}
                    >
                      <span style={{ fontSize: "26px", lineHeight: 1 }} aria-hidden>
                        👍
                      </span>
                      <span style={reactionLabelStyle}>Helped</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={reactionHeart}
                      aria-label="Heart — I liked it"
                      onClick={() => {
                        const next = !reactionHeart;
                        setReactionHeart(next);
                        void persistLearnerReaction(reactionThumbs, next);
                      }}
                      style={{
                        ...reactionBtnStyle,
                        ...(reactionHeart ? reactionBtnActiveStyle : {}),
                      }}
                    >
                      <span style={{ fontSize: "26px", lineHeight: 1 }} aria-hidden>
                        ❤️
                      </span>
                      <span style={reactionLabelStyle}>Loved it</span>
                    </button>
                  </div>
                  {(reactionThumbs || reactionHeart) && (
                    <p style={{ fontSize: "12px", color: "#10b981", marginTop: "14px", textAlign: "center", fontWeight: 600 }}>
                      Thanks — your instructors can see this with today&apos;s summary.
                    </p>
                  )}
                </div>
              </div>
              <button type="button" onClick={goToDashboard} style={primaryBtnStyle}>Return to dashboard</button>
            </motion.div>
          ) : (
            <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={cardStyle}>
              <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#FF6A1A", fontSize: "12px", fontWeight: "bold" }}>NAV DATA {currentIndex + 1}/{questions.length}</span>
                <span style={{ color: "#4B5563", fontSize: "10px" }}>TOPIC: {questions[currentIndex]?.topic}</span>
              </div>
              
              <h2 style={questionTextStyle}>{personalize(questions[currentIndex]?.question_text)}</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {['option_a', 'option_b', 'option_c', 'option_d'].map(opt => (
                  <button 
                    key={opt} 
                    disabled={!!feedback.type} 
                    onClick={() => handleAnswer(questions[currentIndex][opt])} 
                    style={{...optStyle, opacity: feedback.type ? 0.5 : 1}}
                  >
                    {questions[currentIndex][opt]}
                  </button>
                ))}
              </div>

              {feedback.text && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={feedbackBoxStyle(feedback.color)}>
                  <p style={{ color: feedback.color, fontWeight: "bold", marginBottom: "8px" }}>{feedback.text}</p>
                  {aiHint && <p style={{ fontSize: "14px", color: "#94A3B8", fontStyle: "italic", marginBottom: "15px" }}>🚀 Mission Control: {aiHint}</p>}
                  <button onClick={feedback.type === 'retry' ? () => {setFeedback({text:"", color:"", type:null}); setAiHint("");} : handleNext} style={primaryBtnStyle}>
                    {feedback.type === 'retry' ? "Try again" : "Continue Ascent"}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
      <footer style={BRANDING.FOOTER_STYLE}>{BRANDING.FOOTER_LINE}</footer>
    </div>
  );
}

// --- STYLES ---
const containerStyle = { minHeight: "100vh", backgroundColor: "#FFFFFF", color: "#1F2937", padding: "20px", display: "flex", flexDirection: "column" };
const quizMainColumnStyle = { flex: 1, display: "flex", flexDirection: "column", width: "100%", maxWidth: "600px", margin: "0 auto" };
const headerStyle = { width: "100%", marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const miniLogoStyle = { width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: "1px solid #FF6A1A" };
const exitBtnStyle = { color: "#94A3B8", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600 };
const logoutBtnStyle = { color: "#6B7280", background: "none", border: "none", cursor: "pointer", fontSize: "12px", textDecoration: "underline" };
const cardStyle = { background: "#F8FAFC", padding: "40px", borderRadius: "30px", border: "1px solid #E2E8F0", boxShadow: "0 12px 26px rgba(15,23,42,0.08)" };
const briefingTextStyle = { lineHeight: "1.8", color: "#334155", marginBottom: "30px", fontSize: "16px" };
const questionTextStyle = { fontSize: "22px", marginBottom: "30px", lineHeight: "1.4", fontWeight: "600" };
const optStyle = { textAlign: "left", padding: "18px", background: "#FFFFFF", color: "#1F2937", border: "1px solid #CBD5E1", borderRadius: "16px", cursor: "pointer", fontSize: "15px", transition: "all 0.2s" };
const primaryBtnStyle = { width: "100%", padding: "16px", background: "#FF6A1A", color: "#1A1B1C", border: "none", borderRadius: "14px", fontWeight: "800", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px" };
const scoreBoxStyle = { background: "#FFFFFF", padding: "30px", borderRadius: "24px", textAlign: "center", margin: "25px 0", border: "1px solid #CBD5E1" };
const feedbackBoxStyle = (color) => ({ marginTop: "25px", padding: "20px", background: "#FFFFFF", borderRadius: "20px", borderLeft: `4px solid ${color}` });
const recapBoxStyle = { background: "rgba(255, 106, 26, 0.12)", border: "1px dashed #FF6A1A", padding: "15px", borderRadius: "15px", marginBottom: "20px", color: "#FF6A1A", fontStyle: "italic" };
const reactionSectionStyle = {
  marginTop: "22px",
  paddingTop: "18px",
  borderTop: "1px solid #2D2F31",
};
const reactionBtnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "6px",
  minWidth: "96px",
  padding: "14px 18px",
  borderRadius: "16px",
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#334155",
  cursor: "pointer",
  transition: "border-color 0.2s, background 0.2s, transform 0.15s",
};
const reactionBtnActiveStyle = {
  border: "1px solid #FF6A1A",
  background: "rgba(255, 106, 26, 0.14)",
  boxShadow: "0 0 0 1px rgba(255, 106, 26, 0.3)",
};
const reactionLabelStyle = { fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", color: "#94A3B8" };

// --- DEFAULT EXPORT ---
export default function QuizPage() {
  return (
    <Suspense fallback={<div style={{color: '#FF6A1A', textAlign: 'center', marginTop: '100px', fontWeight: 'bold'}}>INITIALIZING MISSION DATA...</div>}>
      <QuizContent />
    </Suspense>
  );
}