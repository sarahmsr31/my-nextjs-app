import { FINAL_DAY_THANK_YOU } from "../../utils/finalDayMessage";

/** Day 40 closing note — shown after mission debrief / on mission log. */
export default function FinalDayThankYou({ compact = false }) {
  const { title, paragraphs, contactEmail, contactPrompt, contactButton, mailSubject } =
    FINAL_DAY_THANK_YOU;
  const subject = mailSubject || "Ad Astra Leadership — learn more";
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`;

  return (
    <div
      style={{
        marginTop: compact ? "16px" : "24px",
        padding: compact ? "16px 18px" : "22px 24px",
        borderRadius: "16px",
        border: "1px solid rgba(255, 106, 26, 0.4)",
        background: "linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 55%, #FEF3C7 100%)",
        textAlign: "left",
        boxShadow: "0 8px 24px rgba(255, 106, 26, 0.12)",
      }}
    >
      <p
        style={{
          margin: "0 0 12px",
          fontSize: compact ? "15px" : "17px",
          fontWeight: 800,
          color: "#C2410C",
          letterSpacing: "0.02em",
        }}
      >
        ✨ {title}
      </p>
      {paragraphs.map((text, i) => (
        <p
          key={i}
          style={{
            margin: "0 0 10px",
            fontSize: compact ? "14px" : "15px",
            lineHeight: 1.7,
            color: "#334155",
          }}
        >
          {text}
        </p>
      ))}
      <div
        style={{
          marginTop: "16px",
          paddingTop: "14px",
          borderTop: "1px solid rgba(255, 106, 26, 0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          alignItems: compact ? "stretch" : "flex-start",
        }}
      >
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#64748B" }}>
          {contactPrompt}
        </p>
        <a
          href={mailto}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px 20px",
            borderRadius: "12px",
            background: "#FF6A1A",
            color: "#FFFFFF",
            fontSize: "14px",
            fontWeight: 800,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(255, 106, 26, 0.35)",
          }}
        >
          {contactButton}
        </a>
        <a
          href={mailto}
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#1B4596",
            textDecoration: "underline",
          }}
        >
          {contactEmail}
        </a>
      </div>
    </div>
  );
}
