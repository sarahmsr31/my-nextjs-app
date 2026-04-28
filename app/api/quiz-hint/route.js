import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey, generateTextWithFallback } from "../../../utils/geminiModel";

const genAI = () => new GoogleGenerativeAI(getGeminiApiKey());

export async function POST(req) {
  try {
    const { question, studentAnswer, chancesLeft } = await req.json();

    const prompt = chancesLeft === 1 
      ? `The student answered "${studentAnswer}" to the question: "${question}". They have one chance left. Provide a very short, supportive hint (max 20 words) that guides them toward the right answer without giving it away.`
      : `The student answered "${studentAnswer}" to the question: "${question}". They are out of chances. Briefly explain why the correct answer was right in a friendly, educational tone (max 25 words).`;

    const hint = await generateTextWithFallback(genAI(), prompt);
    return new Response(JSON.stringify({ hint }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ hint: "Don't give up! Look closely at the question again." }), { status: 500 });
  }
}