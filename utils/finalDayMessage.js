/** Final mission day — cohort thank-you and contact. */
export const FINAL_MISSION_DAY = 40;

export const FINAL_DAY_THANK_YOU = {
  title: "Thank you from the Ad Astra team",
  paragraphs: [
    "You finished all 40 missions — we are so proud of you! Thank you for showing up, being honest, and growing a little every day.",
    "This is not the end of learning; it is proof of what you can do when you practice, get feedback, and try again.",
    "If you or your family would like to learn more about Ad Astra Leadership or future programs, we would love to hear from you.",
  ],
  contactEmail: "sarahmsr@gmail.com",
  contactPrompt: "Learn more",
};

export function isFinalMissionDay(day) {
  const n = Number(day);
  return Number.isFinite(n) && n === FINAL_MISSION_DAY;
}
