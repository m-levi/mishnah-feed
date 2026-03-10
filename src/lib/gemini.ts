import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Text generation model — Gemini 3 Flash Preview with thinking
export const GEMINI_TEXT_MODEL = "gemini-3-flash-preview";

// Image generation model
export const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
