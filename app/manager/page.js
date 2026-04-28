"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BRANDING } from "../../utils/branding";

function ManagerContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    let live = true;
    async function load() {
      if (!token) {
        setError("Missing token. Use /manager?token=YOUR_MANAGER_PROGRESS_TOKEN");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const res = await fetch(`/api/manager-progress?token=${encodeURIComponent(token)}`);
      const json = await res.json().catch(() => ({}));
      if (!live) return;

      if (!res.ok) {
        setError(json?.error || "Failed to load manager leaderboard.");
        setLeaderboard([]);
      } else {
        setLeaderboard(Array.isArray(json?.leaderboard) ? json.leaderboard : []);
      }
      setLoading(false);
    }
    load();
    return () => {
      live = false;
    };
  }, [token]);

  const grouped = useMemo(() => {
    const byDay = new Map();
    for (const row of leaderboard) {
      const day = Number(row.days_completed) || 0;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(row);
    }
    return [...byDay.entries()].sort((a, b) => a[0] - b[0]);
  }, [leaderboard]);

  return (
    <div style={containerStyle}>
      <main style={{ maxWidth: "1050px", margin: "0 auto", width: "100%" }}>
        <h1 style={titleStyle}>Manager Leaderboard</h1>
        <p style={subtitleStyle}>Daily Learner Progress</p>

        {loading ? <p style={mutedStyle}>Loading leaderboard...</p> : null}
        {error ? <p style={errorStyle}>{error}</p> : null}
        {!loading && !error && grouped.length === 0 ? (
          <p style={mutedStyle}>No leaderboard rows yet.</p>
        ) : null}

        {!loading && !error
          ? grouped.map(([day, rows]) => (
              <section key={day} style={cardStyle}>
                <h2 style={dayTitleStyle}>Day {day}</h2>
                <p style={dayMetaStyle}>Students attempted: {rows.length}</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Rank</th>
                        <th style={thStyle}>Student</th>
                        <th style={thStyle}>Class</th>
                        <th style={thStyle}>Access Code</th>
                        <th style={thStyle}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={`${day}-${r.access_code}-${i}`}>
                          <td style={tdStyle}>{r.rank ?? "-"}</td>
                          <td style={tdStyle}>{r.student_name || "-"}</td>
                          <td style={tdStyle}>{r.class || "-"}</td>
                          <td style={tdStyle}>{r.access_code || "-"}</td>
                          <td style={tdStyle}>{Math.round(Number(r.total_score) || 0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          : null}
      </main>
      <footer style={BRANDING.FOOTER_STYLE}>{BRANDING.FOOTER_LINE}</footer>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  background: "#FFFFFF",
  color: "#1F2937",
  padding: "28px 18px",
  display: "flex",
  flexDirection: "column",
};
const titleStyle = { margin: "0 0 8px", color: "#FF6A1A", fontSize: "30px", fontWeight: 800 };
const subtitleStyle = { margin: "0 0 18px", color: "#64748B", fontSize: "14px", letterSpacing: "0.04em" };
const cardStyle = { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "14px", marginBottom: "14px" };
const dayTitleStyle = { margin: "2px 0 12px", color: "#FF6A1A", fontSize: "20px" };
const dayMetaStyle = { margin: "-6px 0 12px", color: "#64748B", fontSize: "12px" };
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: "650px" };
const thStyle = { textAlign: "left", borderBottom: "1px solid #CBD5E1", color: "#64748B", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", padding: "10px 8px" };
const tdStyle = { borderBottom: "1px solid #E2E8F0", color: "#1F2937", fontSize: "14px", padding: "11px 8px" };
const mutedStyle = { color: "#64748B" };
const errorStyle = { color: "#fca5a5", background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.35)", borderRadius: "12px", padding: "10px 12px" };

export default function ManagerPage() {
  return (
    <Suspense fallback={<div style={containerStyle}><p style={mutedStyle}>Loading manager view...</p></div>}>
      <ManagerContent />
    </Suspense>
  );
}

