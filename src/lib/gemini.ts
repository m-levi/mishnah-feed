import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return _ai;
}

// Keep the `ai` export for backward compatibility, but as a lazy getter
export const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    return (getAI() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Text generation model — Gemini 3 Flash Preview with thinking
export const GEMINI_TEXT_MODEL = "gemini-3-flash-preview";

// Image generation model
export const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
