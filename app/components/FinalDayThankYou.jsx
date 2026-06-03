import { FINAL_DAY_THANK_YOU } from "../../utils/finalDayMessage";

/** Day 40 closing note — shown after mission debrief / on mission log. */
export default function FinalDayThankYou({ compact = false }) {
  const { title, paragraphs, contactEmail, contactPrompt } = FINAL_DAY_THANK_YOU;

  return (
    <div
      style={{
        marginTop: compact ? "16px" : "20px",
        padding: compact ? "16px 18px" : "20px 22px",
        borderRadius: "16px",
        border: "1px solid rgba(255, 106, 26, 0.35)",
        background: "linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)",
        textAlign: "left",
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontSize: compact ? "14px" : "15px",
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
            margin: i === paragraphs.length - 1 ? "0 0 14px" : "0 0 10px",
            fontSize: compact ? "14px" : "15px",
            lineHeight: 1.65,
            color: "#334155",
          }}
        >
          {text}
        </p>
      ))}
      <a
        href={`mailto:${contactEmail}?subject=${encodeURIComponent("Ad Astra Leadership — learn more")}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontSize: compact ? "14px" : "15px",
          fontWeight: 700,
          color: "#1B4596",
          textDecoration: "none",
        }}
      >
        {contactPrompt}: {contactEmail}
      </a>
    </div>
  );
}
