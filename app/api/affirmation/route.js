import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getGeminiApiKey, generateTextWithFallback } from "../../../utils/geminiModel";

const genAI = () => new GoogleGenerativeAI(getGeminiApiKey());

export async function POST(req) {
  try {
    const { studentName, score, day, peerAvg } = await req.json();

    const prompt = `
      You are a supportive educational mentor for the Ad Astra OFSS Program. 
      Write a 2-sentence positive affirmation for a student named ${studentName}.
      Context: They just finished Day ${day} of a 40-day program.
      Their score: ${score}/10. 
      The class average: ${peerAvg}/10.
      
      Rules:
      1. Be extremely encouraging and use positive reinforcement.
      2. Mention their score relative to the class average briefly but focus on their personal growth.
      3. Use a tone that is professional yet warm (suitable for medical education/learning).
      4. Do not use generic 'Good job'—be specific about their 'momentum' or 'dedication'.
    `;

    const text = await generateTextWithFallback(genAI(), prompt);

    return NextResponse.json({ affirmation: text });
  } catch (error) {
    return NextResponse.json({ affirmation: "You're doing a wonderful job! Keep up the great work as you move toward mastery." });
  }
}