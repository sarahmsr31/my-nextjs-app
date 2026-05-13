import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

/** Google AI Studio model id (`GEMINI_MODEL` overrides). Fallbacks run if this id errors or is unavailable. */
export const GEMINI_TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/** Looser thresholds for mission debriefs (medical / learning wording can false-trigger defaults). */
export const DEBRIEF_SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
  HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
].map((category) => ({
  category,
  threshold: HarmBlockThreshold.BLOCK_NONE,
}));

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || "";
}

/** Tried in order when primary hits 503 / rate limits, or the model id is unavailable. */
export function getGeminiModelFallbackChain() {
  const primary = GEMINI_TEXT_MODEL;
  const chain = [primary, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];
  return [...new Set(chain.filter(Boolean))];
}

function isRetryableDemandError(err) {
  const msg = String(err?.message || err || "");
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("high demand") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("overloaded")
  );
}

/** e.g. deprecated / wrong model name — try next model in chain instead of failing the request. */
function isModelUnavailableError(err) {
  const msg = String(err?.message || err || "");
  return (
    msg.includes("404") ||
    /not found|no longer available|has been shut down|deprecated|unsupported model/i.test(msg)
  );
}

/** Wrong key or key restricted to browser referrers (breaks Vercel server calls). */
export function isGeminiAuthOrConfigError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  if (
    msg.includes("api key not valid") ||
    msg.includes("invalid api key") ||
    msg.includes("api_key_invalid")
  ) {
    return true;
  }
  if (msg.includes("[401")) return true;
  if (
    msg.includes("[403") &&
    (msg.includes("api key") || msg.includes("referrer") || msg.includes("referer"))
  ) {
    return true;
  }
  return false;
}

function isServerTransientError(err) {
  const msg = String(err?.message || err || "");
  return (
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("504") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("DEADLINE_EXCEEDED") ||
    /INTERNAL|internal server error/i.test(msg) ||
    msg.includes("fetch failed") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT")
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Prefer SDK `text()`, but fall back to candidate parts (JSON MIME type, partial
 * blocks, or SDK quirks sometimes leave `text()` empty or throwing on Vercel).
 */
export function extractTextFromGeminiResponse(response) {
  if (!response) return "";
  try {
    const t = response.text();
    if (t && String(t).trim()) return String(t).trim();
  } catch {
    /* fall through to parts */
  }
  const candidates = response?.candidates;
  if (!Array.isArray(candidates)) return "";
  for (const c of candidates) {
    const parts = c?.content?.parts;
    if (!Array.isArray(parts)) continue;
    const joined = parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
    if (joined) return joined;
  }
  return "";
}

/** generateContent with short retries per model, then next model in chain. */
export async function generateTextWithFallback(genAI, prompt, options = {}) {
  const { safetySettings, generationConfig } = options;
  const models = getGeminiModelFallbackChain();
  let lastErr;

  for (const modelId of models) {
    const model = genAI.getGenerativeModel({
      model: modelId,
      ...(safetySettings?.length ? { safetySettings } : {}),
      ...(generationConfig ? { generationConfig } : {}),
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = extractTextFromGeminiResponse(response);
        if (text) return text;
        lastErr = new Error("empty_model_response");
      } catch (err) {
        lastErr = err;
        if (isGeminiAuthOrConfigError(err)) {
          throw err;
        }
        if (isRetryableDemandError(err) && attempt < 2) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        if (isRetryableDemandError(err)) break;
        if (isModelUnavailableError(err)) break;
        if (isServerTransientError(err) && attempt < 2) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        if (isServerTransientError(err)) break;
        // Unknown error: retry this model, then try the next model in the chain (do not throw immediately).
        if (attempt < 2) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        break;
      }
    }
  }

  throw lastErr || new Error("generateTextWithFallback: no response");
}
