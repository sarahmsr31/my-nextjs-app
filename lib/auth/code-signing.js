import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const OFSS_AUTH_COOKIE = "ofss_auth_pending";

export function generateEightDigitCode() {
  return String(randomInt(0, 100_000_000)).padStart(8, "0");
}

function getSecret() {
  const secret = process.env.CODE_SIGNING_SECRET;
  if (!secret) {
    throw new Error("CODE_SIGNING_SECRET is not set in environment variables.");
  }
  return secret;
}

/**
 * @param {{ parent_email: string; code: string; exp: number; mode: 'new' | 'returning'; registration?: object }} payload
 */
export function encodePendingAuth(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function decodePendingAuth(token) {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = createHmac("sha256", getSecret()).update(body).digest("hex");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function codesMatch(stored, provided) {
  const a = Buffer.from(String(stored), "utf8");
  const b = Buffer.from(String(provided), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
