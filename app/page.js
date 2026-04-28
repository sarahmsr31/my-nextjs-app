import Link from "next/link";
import { BRANDING } from "../utils/branding";

export const metadata = {
  title: "Ad Astra Leadership — Home",
  description:
    "Ad Astra Leadership uses question-based learning, feedback, recall, and reapplication to help learners remember—and use—what they study.",
};

const c = BRANDING.COLORS;

const cardLight = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: "24px",
  padding: "28px 28px 32px",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
};

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(165deg, #FFFFFF 0%, #F8FAFC 55%, #EEF2FF 100%)",
        color: "#1F2937",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #E2E8F0",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1100px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "14px", textDecoration: "none", color: "inherit" }}
        >
          <img
            src={BRANDING.LOGO_URL}
            alt=""
            width={44}
            height={44}
            style={{ borderRadius: "50%", border: `1px solid ${c.GOLD}`, objectFit: "cover" }}
          />
          <span style={{ fontWeight: 800, letterSpacing: "0.04em", color: c.GOLD, fontSize: "14px" }}>
            AD ASTRA LEADERSHIP
          </span>
        </Link>
        <nav style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link
            href="/"
            style={{
              color: "#64748B",
              fontWeight: 600,
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Home
          </Link>
          <Link
            href="/login"
            style={{
              padding: "11px 22px",
              borderRadius: "999px",
              background: `linear-gradient(135deg, ${c.GOLD} 0%, #EA580C 100%)`,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "14px",
              textDecoration: "none",
              boxShadow: "0 8px 20px rgba(255, 106, 26, 0.35)",
            }}
          >
            Student login
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 56px" }}>
        <section style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ color: "#475569", fontSize: "13px", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "14px" }}>
            Remember · Recall · Replicate
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.85rem)", fontWeight: 800, color: "#0F172A", lineHeight: 1.15, margin: "0 0 18px" }}>
            A platform built for{" "}
            <span style={{ color: c.GOLD }}>how memory becomes skill</span>
          </h1>
          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.12rem)",
              color: "#334155",
              maxWidth: "680px",
              margin: "0 auto 26px",
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: "#1E293B" }}>Ad Astra Leadership</strong> is a learning accelerator: short daily missions,
            targeted feedback, and structured debriefs designed to strengthen retention—so ideas can be recalled accurately and
            reapplied in new contexts.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", alignItems: "center" }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px 26px",
                borderRadius: "999px",
                background: c.GOLD,
                color: "#FFFFFF",
                fontWeight: 700,
                textDecoration: "none",
                fontSize: "15px",
                boxShadow: "0 10px 24px rgba(255, 106, 26, 0.35)",
              }}
            >
              Student sign-in
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <span style={{ color: "#94A3B8", fontSize: "14px" }}>Use your access code</span>
          </div>
        </section>

        <section aria-labelledby="about-heading" style={{ ...cardLight, marginBottom: "22px" }}>
          <h2 id="about-heading" style={{ fontSize: "1.35rem", color: c.GOLD, margin: "0 0 14px", fontWeight: 800 }}>
            About Ad Astra Leadership
          </h2>
          <p style={{ margin: "0 0 12px", lineHeight: 1.75, color: "#334155", fontSize: "16px" }}>
            We focus on <strong style={{ color: "#0F172A" }}>question-based learning</strong>—prompts that surface what you
            know, where you hesitate, and how ideas connect—paired with timely feedback so learners can correct course while it
            still matters. The goal is durable recall and confident reapplication, not a one-time score.
          </p>
          <p style={{ margin: 0, lineHeight: 1.75, color: "#475569", fontSize: "15px" }}>
            This first pilot follows a structured <strong style={{ color: "#1E293B" }}>40‑day arc</strong> with middle school
            students. Looking ahead, we aim to extend the same approach to{" "}
            <strong style={{ color: "#1E293B" }}>medical trainees</strong>—where recall and replication carry high stakes—and
            other learner groups who need practice that translates into performance.
          </p>
        </section>

        <section aria-labelledby="qbl-heading" style={{ ...cardLight, marginBottom: "36px" }}>
          <h2 id="qbl-heading" style={{ fontSize: "1.35rem", color: c.GOLD, margin: "0 0 8px", fontWeight: 800 }}>
            Question-based learning
          </h2>
          <p style={{ margin: "0 0 22px", color: "#64748B", fontSize: "14px", lineHeight: 1.6 }}>
            Learning sticks when learners retrieve, judge, and apply—again and again—in meaningful contexts.
          </p>

          <div style={{ display: "grid", gap: "20px" }}>
            <div style={{ borderLeft: `3px solid ${c.GOLD}`, paddingLeft: "18px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem", color: "#0F172A" }}>Recall</h3>
              <p style={{ margin: 0, lineHeight: 1.7, color: "#475569", fontSize: "15px" }}>
                Questions cue active retrieval—not passive re-reading—so durable memory has a chance to form.
              </p>
            </div>

            <div style={{ borderLeft: "3px solid #94A3B8", paddingLeft: "18px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem", color: "#0F172A" }}>Feedback</h3>
              <p style={{ margin: 0, lineHeight: 1.7, color: "#475569", fontSize: "15px" }}>
                Immediate, specific feedback narrows the gap between a guess and a grounded understanding.
              </p>
            </div>

            <div style={{ borderLeft: "3px solid #CBD5E1", paddingLeft: "18px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem", color: "#0F172A" }}>Replication</h3>
              <p style={{ margin: 0, lineHeight: 1.7, color: "#475569", fontSize: "15px" }}>
                Missions emphasize reapplication: similar-but-new situations where learners show they can use what they remembered,
                not only recognize it once.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="team-heading" style={{ marginBottom: "32px" }}>
          <h2 id="team-heading" style={{ fontSize: "1.25rem", color: "#0F172A", margin: "0 0 18px", fontWeight: 800 }}>
            Team
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "22px",
            }}
          >
            <article style={{ ...cardLight, padding: "24px" }}>
              <div
                aria-label="Sarah Ramaiah photo placeholder"
                style={{
                  width: "112px",
                  height: "112px",
                  borderRadius: "20px",
                  background: "linear-gradient(145deg, #F1F5F9 0%, #E2E8F0 100%)",
                  border: "1px dashed #CBD5E1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94A3B8",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "16px",
                }}
              >
                Headshot
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "#0F172A" }}>Sarah Ramaiah</h3>
              <p style={{ margin: "0 0 14px", color: c.GOLD, fontWeight: 700, fontSize: "14px" }}>PhD, MS Ed</p>
              <p style={{ margin: 0, lineHeight: 1.65, color: "#475569", fontSize: "15px" }}>
                Brief biography will appear here—your role, expertise, and what you&apos;re building with Ad Astra Leadership.
              </p>
            </article>

            <article style={{ ...cardLight, padding: "24px" }}>
              <div
                aria-label="Allen Mannepalli photo placeholder"
                style={{
                  width: "112px",
                  height: "112px",
                  borderRadius: "20px",
                  background: "linear-gradient(145deg, #F1F5F9 0%, #E2E8F0 100%)",
                  border: "1px dashed #CBD5E1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94A3B8",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "16px",
                }}
              >
                Headshot
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "#0F172A" }}>Allen Mannepalli</h3>
              <p style={{ margin: "0 0 14px", color: c.GOLD, fontWeight: 700, fontSize: "14px" }}>MS</p>
              <p style={{ margin: 0, lineHeight: 1.65, color: "#475569", fontSize: "15px" }}>
                Brief biography will appear here—your role, focus, and what you contribute to Ad Astra Leadership&apos;s pilots and
                future programs.
              </p>
            </article>
          </div>
        </section>

        <section
          style={{
            padding: "32px 24px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 40%, #F8FAFC 100%)",
            border: "1px solid rgba(255, 106, 26, 0.22)",
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ maxWidth: "520px", margin: "0 auto", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", color: "#0F172A", fontSize: "18px", fontWeight: 800 }}>Launch today&apos;s mission</p>
            <p style={{ margin: "0 0 22px", color: "#64748B", fontSize: "15px", lineHeight: 1.6 }}>
              Sign in with your student access code to open the dashboard and today&apos;s session.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                width: "100%",
                maxWidth: "320px",
                padding: "16px 24px",
                borderRadius: "16px",
                background: "#0F172A",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "16px",
                textDecoration: "none",
              }}
            >
              Open student portal
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </section>
      </main>

      <footer style={BRANDING.FOOTER_STYLE}>{BRANDING.FOOTER_LINE}</footer>
    </div>
  );
}
