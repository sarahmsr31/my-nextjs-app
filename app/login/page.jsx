"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabase/client";
import { BRANDING } from "../../utils/branding";

const bg = "#141516";
const card = "#1F2021";
const gold = "#C8A165";
const labelColor = "#F3F4F6";
const muted = "#D1D5DB";
const inputBg = "#141516";
const border = "#3F4143";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("login"); // "login", "confirm", or "onboarding"
  const [studentData, setStudentData] = useState(null);
  
  const [form, setForm] = useState({
    access_code: "",
    preferred_name: "",
  });

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: dbError } = await supabase
        .from("students")
        .select("id, student_name, preferred_name, is_setup_complete, current_day")
        .eq("access_code", form.access_code.trim().toUpperCase())
        .single();

      if (dbError || !data) {
        setError("Invalid access code. Please check your credentials.");
        setLoading(false);
        return;
      }

      setStudentData(data);

      // Determine next step
      if (!data.is_setup_complete) {
        setStep("onboarding");
      } else {
        setStep("confirm");
      }
    } catch (err) {
      setError("System error. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOnboarding(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("students")
        .update({
          preferred_name: form.preferred_name.trim(),
          is_setup_complete: true,
        })
        .eq("id", studentData.id);

      if (updateError) throw updateError;

      launchMission(studentData.id, studentData.current_day);
    } catch (err) {
      setError("Failed to save nickname.");
      setLoading(false);
    }
  }

  const launchMission = (id, day) => {
    router.push(`/quiz?student_id=${id}&day=${day || 1}`);
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
            {step === "login" ? "Mission Login" : step === "onboarding" ? "Navigator Setup" : "Identify Confirmed"}
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

          {step === "onboarding" && (
            <motion.form key="onboarding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleOnboarding} style={formStyle}>
              <p style={{ color: muted, textAlign: "center", marginBottom: "10px" }}>Welcome, Navigator! What should we call you?</p>
              <input
                type="text"
                required
                placeholder="e.g. Commander Sarah"
                value={form.preferred_name}
                onChange={(e) => setForm({ ...form, preferred_name: e.target.value })}
                style={inputStyle}
              />
              <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
                {loading ? "Saving..." : "Start Mission"}
              </button>
            </motion.form>
          )}

          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center" }}>
              <div style={identityBox}>
                <span style={{ fontSize: "22px", color: gold, fontWeight: "bold" }}>{studentData.preferred_name}</span>
                <p style={{ color: muted, fontSize: "12px", marginTop: "4px" }}>Day {studentData.current_day} Ready for Launch</p>
              </div>
              <button onClick={() => launchMission(studentData.id, studentData.current_day)} style={primaryButtonStyle(false)}>
                Confirm & Launch
              </button>
              <button onClick={() => setStep("login")} style={{ background: "none", border: "none", color: "#4B5563", marginTop: "15px", cursor: "pointer", fontSize: "13px" }}>
                Not you? Switch account
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      </div>
      <footer style={BRANDING.FOOTER_STYLE}>{BRANDING.FOOTER_LINE}</footer>
    </div>
  );
}

// --- Styles ---
const containerStyle = { minHeight: "100vh", backgroundColor: bg, display: "flex", flexDirection: "column", padding: "24px", fontFamily: "system-ui, sans-serif" };
const homeLinkBarStyle = { width: "100%", maxWidth: "440px", margin: "0 auto 8px", padding: "0 4px" };
const homeLinkStyle = { color: "#94A3B8", fontSize: "13px", fontWeight: 600, textDecoration: "none" };
const loginMainStyle = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" };
const cardStyle = { background: card, borderRadius: "24px", border: `1px solid ${border}`, maxWidth: "400px", width: "100%", padding: "40px 36px", boxShadow: "0 24px 48px rgba(0,0,0,0.45)" };
const logoStyle = { display: "block", margin: "0 auto 20px", maxWidth: "160px", width: "100%", height: "auto", objectFit: "contain" };
const formStyle = { display: "flex", flexDirection: "column", gap: "20px" };
const inputGroupStyle = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = { color: labelColor, fontSize: "14px", fontWeight: 600 };
const errorStyle = { color: "#FCA5A5", fontSize: "14px", textAlign: "center" };
const inputStyle = { width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${border}`, background: inputBg, color: "#FFFFFF", fontSize: "16px", outline: "none" };
const primaryButtonStyle = (disabled) => ({ width: "100%", padding: "16px", borderRadius: "14px", border: "none", background: disabled ? "#5c4d36" : gold, color: "#1A1B1C", fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", textTransform: "uppercase" });
const identityBox = { background: "#141516", padding: "20px", borderRadius: "16px", border: `1px solid ${border}`, marginBottom: "20px" };