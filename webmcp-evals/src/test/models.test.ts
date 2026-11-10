/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from "node:assert";
import { describe, it } from "node:test";
import { ollamaOpenAIBaseURL } from "../evaluator/models.js";

describe("ollamaOpenAIBaseURL", () => {
  it("defaults to the local Ollama OpenAI-compatible endpoint", () => {
    assert.strictEqual(ollamaOpenAIBaseURL(), "http://127.0.0.1:11434/v1");
  });

  it("appends /v1 to a bare OLLAMA_HOST", () => {
    assert.strictEqual(ollamaOpenAIBaseURL("http://localhost:11434"), "http://localhost:11434/v1");
    assert.strictEqual(ollamaOpenAIBaseURL("http://localhost:11434/"), "http://localhost:11434/v1");
  });

  it("keeps an OLLAMA_HOST that already points at /v1", () => {
    assert.strictEqual(ollamaOpenAIBaseURL("http://gpu-box:11434/v1"), "http://gpu-box:11434/v1");
    assert.strictEqual(ollamaOpenAIBaseURL("http://gpu-box:11434/v1/"), "http://gpu-box:11434/v1");
  });
});
