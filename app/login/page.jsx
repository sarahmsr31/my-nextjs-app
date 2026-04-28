"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabase/client";
import { BRANDING } from "../../utils/branding";
import { getProgramMissionContext } from "../../utils/programCalendar";

const bg = "#FFFFFF";
const card = "#F8FAFC";
const gold = "#FF6A1A";
const labelColor = "#334155";
const muted = "#64748B";
const inputBg = "#FFFFFF";
const border = "#CBD5E1";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("login"); // "login" or "confirm"
  const [studentData, setStudentData] = useState(null);
  
  const [form, setForm] = useState({
    access_code: "",
  });

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: dbError } = await supabase
        .from("students")
        .select("id, student_name, current_day")
        .eq("access_code", form.access_code.trim().toUpperCase())
        .single();

      if (dbError || !data) {
        setError("Invalid access code. Please check your credentials.");
        setLoading(false);
        return;
      }

      setStudentData(data);
      setStep("confirm");
    } catch (err) {
      setError("System error. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  const launchMission = (id) => {
    // Route through dashboard so saved progress decides the next mission day.
    router.push(`/dashboard?student_id=${encodeURIComponent(id)}`);
  };

  const goToDashboardFromLogo = () => {
    if (studentData?.id) {
      router.push(`/dashboard?student_id=${encodeURIComponent(studentData.id)}&stay=1`);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={homeLinkBarStyle}>
        <Link href="/" style={homeLinkStyle}>
          ← Home
        </Link>
      </div>
      <div style={loginMainStyle}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <button
            type="button"
            onClick={goToDashboardFromLogo}
            aria-label="Go to dashboard"
            title={studentData?.id ? "Mission dashboard" : "Sign in with your access code first"}
            style={{
              ...logoStyle,
              border: "none",
              background: "none",
              padding: 0,
              cursor: studentData?.id ? "pointer" : "default",
            }}
          >
            <img
              src={BRANDING.LOGO_URL}
              alt="Ad Astra Academy"
              style={{ width: "100%", height: "auto", objectFit: "contain", display: "block", pointerEvents: "none" }}
            />
          </button>
          <h1 style={{ color: gold, fontSize: "24px", fontWeight: 800, margin: "0 0 8px" }}>
            {step === "login" ? "Mission Login" : "Confirm Identity"}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {step === "login" && (
            <motion.form key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleLogin} style={formStyle}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Access Code</label>
                <input
                  type="text"
                  required
                  placeholder="8-digit code"
                  value={form.access_code}
                  onChange={(e) => setForm({ ...form, access_code: e.target.value })}
                  style={{ ...inputStyle, letterSpacing: "0.2em", textAlign: "center" }}
                />
              </div>
              {error && <p style={errorStyle}>{error}</p>}
              <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
                {loading ? "Verifying..." : "Initialize Launch"}
              </button>
            </motion.form>
          )}

          {step === "confirm" && (() => {
            const missionCtx = getProgramMissionContext(new Date());
            const dayCaption =
              missionCtx.useLegacyProgression || missionCtx.phase === "prelaunch"
                ? `Day ${Number(studentData?.current_day) || 1} — practice / testing`
                : `Class mission Day ${missionCtx.officialDay != null ? missionCtx.officialDay : "?"} — same mission as everyone (no makeup days)`;

            return (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center" }}>
              <p style={{ color: muted, marginBottom: "12px", lineHeight: 1.5 }}>
                Welcome <strong>{studentData?.student_name}</strong>! Please confirm your identity/name before we proceed.
              </p>
              <div style={identityBox}>
                <span style={{ fontSize: "22px", color: gold, fontWeight: "bold" }}>{studentData.student_name}</span>
                <p style={{ color: muted, fontSize: "12px", marginTop: "4px" }}>{dayCaption}</p>
              </div>
              <button onClick={() => launchMission(studentData.id)} style={primaryButtonStyle(false)}>
                Confirm & Continue
              </button>
              <button onClick={() => setStep("login")} style={{ background: "none", border: "none", color: "#4B5563", marginTop: "15px", cursor: "pointer", fontSize: "13px" }}>
                Not you? Switch account
              </button>
            </motion.div>
            );
          })()}
        </AnimatePresence>
      </motion.div>
      </div>
      <footer style={BRANDING.FOOTER_STYLE}>{BRANDING.FOOTER_LINE}</footer>
    </div>
  );
}

// --- Styles ---
const containerStyle = { minHeight: "100vh", backgroundColor: bg, display: "flex", flexDirection: "column", padding: "24px" };
const homeLinkBarStyle = { width: "100%", maxWidth: "440px", margin: "0 auto 8px", padding: "0 4px" };
const homeLinkStyle = { color: "#94A3B8", fontSize: "13px", fontWeight: 600, textDecoration: "none" };
const loginMainStyle = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" };
const cardStyle = { background: card, borderRadius: "24px", border: `1px solid ${border}`, maxWidth: "400px", width: "100%", padding: "40px 36px", boxShadow: "0 24px 48px rgba(0,0,0,0.45)" };
const logoStyle = { display: "block", margin: "0 auto 20px", maxWidth: "160px", width: "100%", height: "auto", objectFit: "contain" };
const formStyle = { display: "flex", flexDirection: "column", gap: "20px" };
const inputGroupStyle = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = { color: labelColor, fontSize: "14px", fontWeight: 600 };
const errorStyle = { color: "#FCA5A5", fontSize: "14px", textAlign: "center" };
const inputStyle = { width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${border}`, background: inputBg, color: "#1F2937", fontSize: "16px", outline: "none" };
const primaryButtonStyle = (disabled) => ({ width: "100%", padding: "16px", borderRadius: "14px", border: "none", background: disabled ? "#5c4d36" : gold, color: "#1A1B1C", fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", textTransform: "uppercase" });
const identityBox = { background: "#2B4166", padding: "20px", borderRadius: "16px", border: `1px solid ${border}`, marginBottom: "20px" };