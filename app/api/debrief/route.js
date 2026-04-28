import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  getGeminiApiKey,
  generateTextWithFallback,
  DEBRIEF_SAFETY_SETTINGS,
} from "../../../utils/geminiModel";

const JSON_DEBRIEF_CONFIG = {
  responseMimeType: "application/json",
};

function parseStructuredDebrief(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim());
      } catch {
        /* fall through */
      }
    }
  }
  return null;
}

function normalizePayload(parsed, fallbackFeedback, mode) {
  if (!parsed || typeof parsed !== "object") {
    return {
      feedback: fallbackFeedback,
      strengths: [],
      focus_areas: [],
    };
  }
  const feedback =
    typeof parsed.feedback === "string" && parsed.feedback.trim()
      ? parsed.feedback.trim()
      : fallbackFeedback;
  let strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
  let focus_areas = Array.isArray(parsed.focus_areas) ? parsed.focus_areas : [];
  strengths = strengths.filter((s) => typeof s === "string").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  focus_areas = focus_areas
    .filter((s) => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (mode === "recap") {
    return { feedback, strengths: [], focus_areas: [] };
  }
  return { feedback, strengths, focus_areas };
}

export async function POST(req) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        feedback:
          "Mission Control debrief is not configured yet (add GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY to .env.local). Your mission results are still saved.",
        strengths: [],
        focus_areas: [],
        error: "Missing GEMINI_API_KEY / GOOGLE_GEMINI_API_KEY",
      },
      { status: 200 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const { studentName, responses, day, mode } = await req.json();

    let prompt = "";

    if (mode === "recap") {
      prompt = `
You are the Ad Astra Academy Flight Instructor.
${studentName} is starting Day ${day}. Yesterday (Day ${Number(day) - 1}), they completed their mission.

Previous mission data: ${JSON.stringify(responses)}

Return ONLY a valid JSON object with exactly this shape (no markdown, no code fences):
{
  "feedback": "A 2-sentence Welcome Back briefing. Start with \\"Welcome back, Navigator ${studentName}.\\" Mention a topic they excelled at yesterday. Max 50 words. 4th-grade English. Very positive.",
  "strengths": [],
  "focus_areas": []
}
`;
    } else {
      prompt = `
You are the Ad Astra Academy Flight Instructor.
Analyze this mission data for ${studentName} on Day ${day}: ${JSON.stringify(responses)}

Return ONLY a valid JSON object (no markdown, no code fences) with exactly these keys:
1. "feedback": A 2-sentence encouraging summary for the student (pilot tone, positive).
2. "strengths": An array of exactly 2 short strings — topics they mastered (where correct is true).
3. "focus_areas": An array of exactly 2 short strings — topics to practice tomorrow (where correct is false).

Use 4th-grade English. Keep it positive. Arrays must each have 2 strings.
`;
    }

    let text;
    try {
      text = await generateTextWithFallback(genAI, prompt, {
        safetySettings: DEBRIEF_SAFETY_SETTINGS,
        generationConfig: JSON_DEBRIEF_CONFIG,
      });
    } catch {
      text = await generateTextWithFallback(genAI, prompt, {
        safetySettings: DEBRIEF_SAFETY_SETTINGS,
      });
    }

    if (!text) {
      return NextResponse.json({
        feedback:
          "Mission complete. Review any topics you missed and carry that momentum into your next flight.",
        strengths: [],
        focus_areas: [],
        error: "empty_model_response",
      });
    }

    const parsed = parseStructuredDebrief(text);
    const fallback = mode === "recap" ? text : text.slice(0, 500);
    const payload = normalizePayload(parsed, fallback, mode);

    if (!payload.feedback) {
      payload.feedback =
        "Great work on this mission. Keep building on what went well and revisit one tricky topic tomorrow.";
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/debrief]", error?.message || error);
    return NextResponse.json(
      {
        feedback:
          "We couldn't reach Mission Control for a personalized debrief right now. Your score is saved—excellent work finishing this mission.",
        strengths: [],
        focus_areas: [],
        error: error?.message || "unknown_error",
      },
      { status: 200 }
    );
  }
}
