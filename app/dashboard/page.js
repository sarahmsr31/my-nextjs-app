"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { BRANDING } from "../../utils/branding";

function DashboardLaunch({ studentName = "Navigator", onStartMission, onLogoClick }) {
  const dashboardContainer = {
    padding: "40px 20px",
    maxWidth: "900px",
    margin: "0 auto",
    textAlign: "center",
    color: "#E2E8F0",
  };

  const infoCard = {
    background: "#1E293B",
    border: "1px solid #334155",
    borderRadius: "20px",
    padding: "30px",
    marginTop: "30px",
    textAlign: "left",
  };

  return (
    <div style={dashboardContainer}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {onLogoClick ? (
          <button
            type="button"
            onClick={onLogoClick}
            aria-label="Go to dashboard"
            style={{
              margin: "0 auto 20px",
              display: "block",
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              lineHeight: 0,
            }}
          >
            <img
              src={BRANDING.LOGO_URL}
              alt="Ad Astra Academy"
              style={{ width: "120px", height: "auto", objectFit: "contain", display: "block", pointerEvents: "none" }}
            />
          </button>
        ) : (
          <img
            src={BRANDING.LOGO_URL}
            alt="Ad Astra Academy"
            style={{ width: "120px", height: "auto", marginBottom: "20px", objectFit: "contain" }}
          />
        )}
        <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#FF6A1A", marginBottom: "10px" }}>
          Welcome to Your Mission Dashboard
        </h1>
        <p style={{ fontSize: "18px", color: "#94A3B8" }}>
          Hello, {studentName}! Your path to the stars starts here.
        </p>
      </motion.div>

      <motion.div
        style={infoCard}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2 style={{ color: "#FF6A1A", fontSize: "20px", marginBottom: "15px" }}>🚀 The Flight Rule</h2>
        <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "15px" }}>
          <strong>This is not a test.</strong> This is not a school exam. This is a special chance to{" "}
          <strong>learn about yourself</strong> and practice your English.
        </p>
        <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#CBD5E1" }}>
          Be honest. Take your time. Every mistake is just a star that helps you find your way to Day 40!
        </p>
      </motion.div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        <div style={featureBox}>
          <span style={{ fontSize: "24px" }}>📋</span>
          <h3 style={featureTitle}>10 Questions</h3>
          <p style={featureText}>Small steps to help you grow every day.</p>
        </div>
        <div style={featureBox}>
          <span style={{ fontSize: "24px" }}>🔄</span>
          <h3 style={featureTitle}>2 Tries</h3>
          <p style={featureText}>If you miss one, do not worry! Try again.</p>
        </div>
        <div style={featureBox}>
          <span style={{ fontSize: "24px" }}>💡</span>
          <h3 style={featureTitle}>Helpful Tips</h3>
          <p style={featureText}>Read the hints to find the right path.</p>
        </div>
        <div style={featureBox}>
          <span style={{ fontSize: "24px" }}>🤖</span>
          <h3 style={featureTitle}>AI Feedback</h3>
          <p style={featureText}>Hear from your Instructor at the end.</p>
        </div>
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStartMission}
        style={launchButtonStyle}
      >
        BEGIN TODAY&apos;S MISSION
      </motion.button>
    </div>
  );
}

const featureBox = {
  background: "rgba(255, 106, 26, 0.08)",
  border: "1px solid rgba(255, 106, 26, 0.28)",
  borderRadius: "15px",
  padding: "20px",
  textAlign: "center",
};

const featureTitle = { color: "#FF6A1A", fontSize: "16px", margin: "10px 0" };
const featureText = { fontSize: "13px", color: "#94A3B8", lineHeight: "1.4" };

const launchButtonStyle = {
  marginTop: "50px",
  backgroundColor: "#FF6A1A",
  color: "#1A1B1C",
  padding: "18px 40px",
  borderRadius: "50px",
  border: "none",
  fontWeight: "bold",
  fontSize: "18px",
  cursor: "pointer",
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("student_id");

  const [student, setStudent] = useState(null);
  const [completedDays, setCompletedDays] = useState([]);
  const [activeTab, setActiveTab] = useState("mission");
  const [loading, setLoading] = useState(true);

  const stayOnDashboard = searchParams.get("stay") === "1";

  useEffect(() => {
    if (searchParams.get("tab") === "log") setActiveTab("log");
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      if (!studentId) {
        setLoading(false);
        return;
      }

      // 1. Fetch Student Profile
      const { data: sRows } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .limit(1);
      setStudent(Array.isArray(sRows) && sRows.length > 0 ? sRows[0] : null);

      // 2. Fetch Mission History & Calculate Accuracy
      const { data: rData } = await supabase
        .from("responses")
        .select("day_number, is_correct, correct")
        .eq("student_id", studentId);

      if (rData) {
        const grouped = rData.reduce((acc, curr) => {
          if (!acc[curr.day_number]) {
            acc[curr.day_number] = { day: curr.day_number, total: 0, correct: 0 };
          }
          acc[curr.day_number].total += 1;
          const ok = curr.is_correct ?? curr.correct;
          if (ok) acc[curr.day_number].correct += 1;
          return acc;
        }, {});
        setCompletedDays(Object.values(grouped).sort((a, b) => a.day - b.day));
      }
      setLoading(false);
    }
    fetchData();
  }, [studentId]);

  // Next mission day: at least the day after your highest completed mission, and at least
  // students.current_day (set by program / admin for class calendar). If a learner missed
  // day 2 but current_day is 3, they get day 3 — skipped gaps are not forced in order.
  const sequentialNext =
    completedDays.length > 0
      ? Math.max(...completedDays.map((d) => d.day)) + 1
      : 1;
  const calendarDay = Number(student?.current_day) || 1;
  const nextQuizDay =
    student || completedDays.length > 0
      ? Math.min(40, Math.max(1, sequentialNext, calendarDay))
      : 1;

  useEffect(() => {
    if (loading || !studentId || stayOnDashboard) return;
    router.replace(
      `/quiz?day=${nextQuizDay}&student_id=${encodeURIComponent(studentId)}`
    );
  }, [loading, studentId, stayOnDashboard, nextQuizDay, router]);

  const handleLogOff = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* no-op if no auth session */
    }
    router.push("/login");
  };

  const nextDay = nextQuizDay;

  const displayName =
    student?.preferred_name?.trim() ||
    (student?.student_name?.trim()
      ? student.student_name.trim().split(/\s+/)[0]
      : "") ||
    "Navigator";

  const startMission = () => {
    if (!studentId) return;
    router.push(
      `/quiz?day=${nextDay}&student_id=${encodeURIComponent(studentId)}`
    );
  };

  const goDashboardHome = () => {
    if (studentId) {
      router.push(`/dashboard?student_id=${encodeURIComponent(studentId)}&stay=1`);
    }
  };

  if (loading) return <div style={loadingStyle}>Syncing with Mission Control...</div>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", color: "#1F2937", padding: "30px", display: "flex", flexDirection: "column" }}>
      {/* Header Section */}
      <header style={{ maxWidth: "900px", margin: "0 auto 40px", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <div>
          <h1 style={{ fontSize: "28px", color: "#FF6A1A", fontWeight: "800", marginBottom: "5px" }}>AD ASTRA ACADEMY</h1>
          <p style={{ color: "#94A3B8", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Navigator: {displayName}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={{ display: "flex", gap: "10px", background: "#F1F5F9", padding: "6px", borderRadius: "14px", border: "1px solid #CBD5E1" }}>
            <button 
              type="button"
              onClick={() => {
                setActiveTab("mission");
                if (studentId) {
                  router.replace(`/dashboard?student_id=${encodeURIComponent(studentId)}&stay=1`);
                }
              }} 
              style={activeTab === "mission" ? activeTabBtn : inactiveTabBtn}
            >Active Mission</button>
            <button 
              type="button"
              onClick={() => {
                setActiveTab("log");
                if (studentId) {
                  router.replace(`/dashboard?student_id=${encodeURIComponent(studentId)}&stay=1&tab=log`);
                }
              }} 
              style={activeTab === "log" ? activeTabBtn : inactiveTabBtn}
            >Mission Log</button>
          </div>
          <button 
            onClick={handleLogOff}
            style={logOffBtnStyle}
          >
            LOG OFF
          </button>
        </div>
      </header>

      <main style={{ maxWidth: "900px", margin: "0 auto", flex: 1, width: "100%" }}>
        <AnimatePresence mode="wait">
          {activeTab === "mission" ? (
            <motion.div key="mission" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div style={heroCardStyle}>
                <DashboardLaunch
                  studentName={displayName}
                  onStartMission={startMission}
                  onLogoClick={studentId ? goDashboardHome : undefined}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div key="log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 style={{ marginBottom: "25px", fontSize: "20px", color: "#FF6A1A" }}>Flight Archive</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "15px" }}>
                {Array.from({ length: 40 }, (_, i) => {
                  const dayNum = i + 1;
                  const missionData = completedDays.find(d => d.day === dayNum);
                  const isCompleted = !!missionData;
                  const isActive = dayNum === nextDay;
                  const isLocked = dayNum > nextDay;
                  const isSkipped = !isCompleted && dayNum < nextDay;
                  const canOpenMissionLog = dayNum < nextDay && !!studentId;

                  return (
                    <div 
                      key={dayNum} 
                      onClick={() => {
                        if (canOpenMissionLog) {
                          router.push(`/review?day=${dayNum}&student_id=${encodeURIComponent(studentId)}`);
                        }
                      }}
                      role={canOpenMissionLog ? "button" : undefined}
                      tabIndex={canOpenMissionLog ? 0 : -1}
                      onKeyDown={(e) => {
                        if (!canOpenMissionLog) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/review?day=${dayNum}&student_id=${encodeURIComponent(studentId)}`);
                        }
                      }}
                      style={{
                        ...logCardStyle,
                        opacity: isLocked || isSkipped ? 0.45 : 1,
                        filter: isLocked ? "grayscale(100%)" : isSkipped ? "grayscale(55%)" : "none",
                        border: isCompleted ? "1px solid #10b981" : isActive ? "1px solid #FF6A1A" : isSkipped ? "1px solid #4B5563" : "1px solid #333",
                        cursor: canOpenMissionLog ? "pointer" : "default"
                      }}
                    >
                      <span style={{ color: isLocked || isSkipped ? "#6B7280" : "#FF6A1A", fontWeight: "bold", fontSize: "11px" }}>DAY {dayNum}</span>
                      <div style={{ margin: "12px 0", fontSize: "20px" }}>
                        {isCompleted ? "✅" : isLocked ? "🔒" : isSkipped ? "—" : "🚀"}
                      </div>
                      
                      {isCompleted ? (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "10px", color: "#10b981", fontWeight: "bold", marginBottom: "8px" }}>
                            {Math.round((missionData.correct / missionData.total) * 100)}% ACC
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/review?day=${dayNum}&student_id=${encodeURIComponent(studentId)}`);
                            }}
                            style={{...secondaryBtnStyle, padding: "5px", fontSize: "10px"}}
                          >
                            Review
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: "10px", color: isLocked ? "#4B5563" : isSkipped ? "#6B7280" : "#94A3B8", fontWeight: isSkipped ? 600 : undefined }}>
                          {isLocked ? "LOCKED" : isSkipped ? "VIEW LOG" : "READY"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer style={BRANDING.FOOTER_STYLE}>{BRANDING.FOOTER_LINE}</footer>
    </div>
  );
}

// Styles
const heroCardStyle = { background: "#F8FAFC", padding: "24px", borderRadius: "32px", border: "1px solid #E2E8F0", textAlign: "center", boxShadow: "0 12px 26px rgba(15,23,42,0.08)" };
const logCardStyle = { background: "#F8FAFC", padding: "15px", borderRadius: "20px", border: "1px solid #E2E8F0", transition: "0.2s", display: "flex", flexDirection: "column", alignItems: "center" };
const secondaryBtnStyle = { width: "100%", padding: "12px", background: "none", border: "1px solid #94A3B8", borderRadius: "12px", color: "#334155", cursor: "pointer", fontSize: "13px", fontWeight: "600" };
const logOffBtnStyle = { background: "none", border: "1px solid #4B5563", color: "#94A3B8", padding: "8px 16px", borderRadius: "12px", cursor: "pointer", fontSize: "12px", fontWeight: "600", transition: "0.2s" };
const activeTabBtn = { padding: "10px 20px", background: "#FF6A1A", color: "#1A1B1C", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };
const inactiveTabBtn = { padding: "10px 20px", background: "none", color: "#94A3B8", border: "none", cursor: "pointer", fontSize: "14px" };
const loadingStyle = { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#FFFFFF", color: "#FF6A1A", fontWeight: "bold" };

export default function Dashboard() {
  return <Suspense fallback={null}><DashboardContent /></Suspense>;
}