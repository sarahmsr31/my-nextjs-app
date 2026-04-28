import Link from "next/link";
import { BRANDING } from "../utils/branding";

export const metadata = {
  title: "Ad Astra Learning — Home",
  description:
    "Ad Astra pairs daily missions with question-based learning so students build English and self-awareness through reflection, not drills.",
};

const c = BRANDING.COLORS;

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(165deg, ${c.CHARCOAL} 0%, #0f1112 45%, #12141a 100%)`,
        color: "#E2E8F0",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #2D2F31",
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
          <span style={{ fontWeight: 800, letterSpacing: "0.04em", color: c.GOLD, fontSize: "15px" }}>
            {BRANDING.COMPANY_NAME.toUpperCase()}
          </span>
        </Link>
        <nav style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              color: "#94A3B8",
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
              padding: "10px 22px",
              borderRadius: "999px",
              background: c.GOLD,
              color: c.CHARCOAL,
              fontWeight: 700,
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Student login
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 48px" }}>
        <section style={{ textAlign: "center", marginBottom: "56px" }}>
          <p style={{ color: "#94A3B8", fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>
            English · Growth · Reflection
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, color: "#F8FAFC", lineHeight: 1.15, margin: "0 0 20px" }}>
            Learn through questions,{" "}
            <span style={{ color: c.GOLD }}>not just answers</span>
          </h1>
          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.15rem)",
              color: "#CBD5E1",
              maxWidth: "640px",
              margin: "0 auto 28px",
              lineHeight: 1.65,
            }}
          >
            Ad Astra is a structured mission experience: short daily flights of thoughtful items, instant feedback, and an
            instructor-style debrief—so every learner sees how they think, not only what they scored.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              borderRadius: "14px",
              border: `1px solid ${c.GOLD}`,
              color: c.GOLD_HIGHLIGHT,
              fontWeight: 700,
              textDecoration: "none",
              fontSize: "15px",
            }}
          >
            Enter with your access code
          </Link>
        </section>

        <section
          aria-labelledby="about-heading"
          style={{
            background: "#242526",
            border: "1px solid #333",
            borderRadius: "24px",
            padding: "28px 28px 32px",
            marginBottom: "28px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
          }}
        >
          <h2 id="about-heading" style={{ fontSize: "1.35rem", color: c.GOLD, margin: "0 0 16px", fontWeight: 800 }}>
            About Ad Astra
          </h2>
          <p style={{ margin: "0 0 14px", lineHeight: 1.7, color: "#D1D5DB", fontSize: "16px" }}>
            <strong style={{ color: "#F1F5F9" }}>Ad Astra</strong> (“to the stars”) is built for young people who are
            learning English as part of becoming confident communicators. We combine a clear 40-day arc, mission language,
            and supportive AI debriefs so practice feels like progress—not pressure.
          </p>
          <p style={{ margin: 0, lineHeight: 1.7, color: "#94A3B8", fontSize: "15px" }}>
            Parents and schools get readable summaries of strengths and focus areas, while students stay in the pilot
            seat: honest effort, two tries when they need them, and encouragement to notice their own growth.
          </p>
        </section>

        <section
          aria-labelledby="qbl-heading"
          style={{
            background: "#242526",
            border: "1px solid #333",
            borderRadius: "24px",
            padding: "28px 28px 32px",
            marginBottom: "36px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
          }}
        >
          <h2 id="qbl-heading" style={{ fontSize: "1.35rem", color: c.GOLD, margin: "0 0 8px", fontWeight: 800 }}>
            Question-based learning
          </h2>
          <p style={{ margin: "0 0 24px", color: "#94A3B8", fontSize: "14px" }}>
            A research-backed stance: people learn deeply when they wrestle with meaningful questions—not only when they
            consume explanations.
          </p>

          <div style={{ display: "grid", gap: "22px" }}>
            <div style={{ borderLeft: `3px solid ${c.GOLD}`, paddingLeft: "18px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem", color: "#F1F5F9" }}>What it is</h3>
              <p style={{ margin: 0, lineHeight: 1.65, color: "#CBD5E1", fontSize: "15px" }}>
                Instead of long lectures first, question-based learning starts from{" "}
                <strong style={{ color: "#E2E8F0" }}>curiosity and problems</strong>: prompts that expose what you
                already know, where you hesitate, and which ideas connect. Answers matter—but the thinking{" "}
                <em>before</em> and <em>after</em> the click is where durable learning lives.
              </p>
            </div>

            <div style={{ borderLeft: "3px solid #475569", paddingLeft: "18px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem", color: "#F1F5F9" }}>Why it works here</h3>
              <p style={{ margin: 0, lineHeight: 1.65, color: "#CBD5E1", fontSize: "15px" }}>
                Short daily missions keep cognitive load friendly. Each item is a question moment: predict, choose,
                revise, then read concise feedback. That loop mirrors how experts learn in the wild—hypothesis, test,
                adjust—at a pace fit for school-aged learners.
              </p>
            </div>

            <div style={{ borderLeft: "3px solid #334155", paddingLeft: "18px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem", color: "#F1F5F9" }}>How Ad Astra uses it</h3>
              <ul style={{ margin: 0, paddingLeft: "1.15rem", lineHeight: 1.75, color: "#CBD5E1", fontSize: "15px" }}>
                <li>Mission briefings frame the day as a purpose, not a test.</li>
                <li>Items probe understanding across topics, with hints when learners need a nudge.</li>
                <li>End-of-mission debriefs turn performance into language about strengths and next steps.</li>
              </ul>
            </div>
          </div>
        </section>

        <section
          style={{
            textAlign: "center",
            padding: "28px 20px",
            borderRadius: "20px",
            background: "rgba(200, 161, 101, 0.08)",
            border: "1px solid rgba(200, 161, 101, 0.25)",
          }}
        >
          <p style={{ margin: "0 0 16px", color: "#E2E8F0", fontSize: "17px", fontWeight: 600 }}>
            Ready for today&apos;s mission?
          </p>
          <Link href="/login" style={{ color: c.GOLD_HIGHLIGHT, fontWeight: 700, fontSize: "15px" }}>
            Go to login →
          </Link>
        </section>
      </main>

      <footer style={BRANDING.FOOTER_STYLE}>{BRANDING.FOOTER_LINE}</footer>
    </div>
  );
}
