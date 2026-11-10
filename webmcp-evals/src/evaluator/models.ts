/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { Config, WebmcpConfig } from "../types/config.js";
import { makeSignaturePreservingFetch } from "./googleThoughtSignatures.js";

/**
 * OLLAMA_HOST conventionally holds the bare server address (as used by the
 * Ollama CLI and the `ollama` backend), while the OpenAI-compatible API lives
 * under `/v1`.
 */
export function ollamaOpenAIBaseURL(host = "http://127.0.0.1:11434"): string {
  const trimmed = host.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export function getModel(config: Config | WebmcpConfig) {
  const modelId = config.model || "google:gemini-3-flash-preview";

  if (config.provider === "openai" || modelId.startsWith("openai:")) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) console.warn("Warning: OPENAI_API_KEY is missing for OpenAI provider.");
    // Use the Chat Completions API rather than the Responses API. The Responses
    // API is OpenAI-specific; every other "OpenAI-compatible" endpoint (Ollama,
    // vLLM, LiteLLM, corporate gateways, etc.) only implements chat completions.
    // Chat completions works against OpenAI itself as well, so this is a safe
    // default that keeps `baseURL` overrides usable.
    //
    // When the compat proxy fronts Vertex-backed Gemini (detected by the
    // model id), inject a fetch wrapper that preserves `thought_signature`
    // fields across multi-turn tool-calling — without it, Vertex 400s on
    // turn 2. Auto-enable to keep single-line usage working; force on/off
    // via OPENAI_PRESERVE_GOOGLE_THOUGHT_SIGNATURES=1|0 if the heuristic
    // gets it wrong.
    const gemini = /(?:^|[:/])(google|gemini)/.test(modelId);
    const envFlag = process.env.OPENAI_PRESERVE_GOOGLE_THOUGHT_SIGNATURES;
    const preserveSignatures = envFlag === "1" || (envFlag !== "0" && gemini);

    return createOpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL,
      ...(preserveSignatures ? { fetch: makeSignaturePreservingFetch() } : {}),
    }).chat(modelId.replace("openai:", ""));
  }

  if (config.provider === "anthropic" || modelId.startsWith("anthropic:")) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) console.warn("Warning: ANTHROPIC_API_KEY is missing for Anthropic provider.");
    return createAnthropic({ apiKey, baseURL: process.env.ANTHROPIC_BASE_URL })(
      modelId.replace("anthropic:", ""),
    );
  }

  if (config.provider === "ollama" || modelId.startsWith("ollama:")) {
    const ollama = createOpenAI({
      baseURL: ollamaOpenAIBaseURL(process.env.OLLAMA_HOST || undefined),
      apiKey: "ollama", // Required by standard but ignored by Ollama locally
    });
    // Ollama's OpenAI compatibility surface implements /v1/chat/completions,
    // not /v1/responses.
    return ollama.chat(modelId.replace("ollama:", ""));
  }

  // Default to Google
  const apiKey =
    process.env.GOOGLE_AI || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) console.warn("Warning: Missing Google/Gemini API key");
  const google = createGoogleGenerativeAI({
    apiKey,
    baseURL: process.env.GOOGLE_GENERATIVE_AI_BASE_URL,
  });
  return google(modelId.replace("google:", ""));
}
