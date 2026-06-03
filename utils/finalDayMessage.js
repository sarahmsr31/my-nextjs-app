/** Final mission day — cohort thank-you and contact. */
export const FINAL_MISSION_DAY = 40;

export const FINAL_DAY_THANK_YOU = {
  title: "Thank you from the Ad Astra team",
  paragraphs: [
    "You finished Day 40 — and with it, all 40 missions. We are so proud of you.",
    "Thank you for showing up, being honest, and growing a little every day. Every question you answered helped you practice recall, learn from feedback, and try again — that is how learning sticks.",
    "This is not goodbye. It is proof of what you can do when you keep going.",
    "If you or your family would like to learn more about Ad Astra Leadership, future programs, or bringing this approach to your school, we would love to hear from you.",
  ],
  contactEmail: "sarahmsr@gmail.com",
  contactPrompt: "Learn more",
  contactButton: "Email the Ad Astra team",
  mailSubject: "Ad Astra Leadership — learn more",
};

export function isFinalMissionDay(day) {
  const n = Number(day);
  return Number.isFinite(n) && n === FINAL_MISSION_DAY;
}
