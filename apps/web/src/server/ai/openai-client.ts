import "server-only";

import OpenAI from "openai";

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5-mini";
}

export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for real provider calls.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

