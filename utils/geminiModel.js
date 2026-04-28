import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

/** Google AI Studio model id (`GEMINI_MODEL` overrides). Fallbacks run if this id errors or is unavailable. */
export const GEMINI_TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/** Looser thresholds for mission debriefs (medical / learning wording can false-trigger defaults). */
export const DEBRIEF_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
        const text = (response.text() || "").trim();
        if (text) return text;
        lastErr = new Error("empty_model_response");
      } catch (err) {
        lastErr = err;
        if (isRetryableDemandError(err) && attempt < 2) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        if (isRetryableDemandError(err)) break;
        if (isModelUnavailableError(err)) break;
        throw err;
      }
    }
  }

  throw lastErr || new Error("generateTextWithFallback: no response");
}
