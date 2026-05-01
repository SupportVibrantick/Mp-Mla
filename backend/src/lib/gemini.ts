import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import logger from "../utils/logger.js";

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to your .env file.",
      );
    }
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });
  }
  return model;
}

/**
 * Generate structured JSON from Gemini
 */
export async function generateJSON<T = any>(prompt: string): Promise<T> {
  try {
    const m = getModel();
    const result = await m.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (error: any) {
    logger.error(`Gemini JSON generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate text (for chat follow-ups)
 */
export async function generateText(prompt: string): Promise<string> {
  try {
    const m = getModel();
    // Override to text response for chat
    const chatModel = genAI!.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 4096,
      },
    });
    const result = await chatModel.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    logger.error(`Gemini text generation failed: ${error.message}`);
    throw error;
  }
}

export default { generateJSON, generateText };
