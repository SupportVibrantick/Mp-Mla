import axios from "axios";
import logger from "../utils/logger.js";

function getApiKey(): string {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set. Add it to your .env file.");
  }
  return apiKey;
}

function getApiUrl(): string {
  const baseUrl = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
  return baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}/chat/completions`;
}

function getModel(): string {
  return process.env.DEEPSEEK_MODEL || "deepseek-chat";
}

/**
 * Generate structured JSON from DeepSeek
 */
export async function generateJSON<T = any>(prompt: string): Promise<T> {
  try {
    const apiKey = getApiKey();
    const url = getApiUrl();
    const model = getModel();

    logger.info(`Sending JSON completion request to DeepSeek: ${model}`);

    const response = await axios.post(
      url,
      {
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
        temperature: 0.2,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 60000, // 60 seconds timeout
      },
    );

    const text = response.data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Empty response from DeepSeek API");
    }

    // Parse the JSON response
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    logger.error(`DeepSeek JSON generation failed: ${errorMsg}`);
    throw new Error(`DeepSeek JSON generation failed: ${errorMsg}`);
  }
}

/**
 * Generate text (for chat follow-ups)
 */
export async function generateText(prompt: string): Promise<string> {
  try {
    const apiKey = getApiKey();
    const url = getApiUrl();
    const model = getModel();

    logger.info(`Sending text completion request to DeepSeek: ${model}`);

    const response = await axios.post(
      url,
      {
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 60000,
      },
    );

    const text = response.data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Empty response from DeepSeek API");
    }
    return text;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    logger.error(`DeepSeek text generation failed: ${errorMsg}`);
    throw new Error(`DeepSeek text generation failed: ${errorMsg}`);
  }
}

export default { generateJSON, generateText };
