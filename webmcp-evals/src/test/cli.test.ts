/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const bin = fileURLToPath(new URL("../bin/webmcp-evals.js", import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8"));

function run(...args: string[]) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf-8",
    env: { ...process.env, FORCE_COLOR: "0" },
    timeout: 20_000,
  });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

describe("webmcp-evals CLI", () => {
  it("prints help listing every command", () => {
    const { code, out } = run("--help");
    assert.strictEqual(code, 0);
    for (const command of ["local", "browser", "smoke", "analyze"]) {
      assert.match(out, new RegExp(`\\b${command}\\b`));
    }
  });

  it("prints the package version", () => {
    const { code, out } = run("--version");
    assert.strictEqual(code, 0);
    assert.strictEqual(out.trim(), pkg.version);
  });

  it("rejects an unknown backend", () => {
    const { code, out } = run("-b", "openai", "local", "-t", "x.json", "-e", "y.json");
    assert.notStrictEqual(code, 0);
    assert.match(out, /Allowed choices are vercel, gemini, ollama/);
  });

  it("rejects a non-numeric --runs value", () => {
    const { code, out } = run("-r", "abc", "local", "-t", "x.json", "-e", "y.json");
    assert.notStrictEqual(code, 0);
    assert.match(out, /Expected a positive integer/);
  });

  it("fails fast when browser is used with a local-only backend", () => {
    const { code, out } = run(
      "-b",
      "gemini",
      "browser",
      "-u",
      "http://127.0.0.1:9",
      "-e",
      "x.json",
    );
    assert.strictEqual(code, 1);
    assert.match(out, /only supports the "local" command/);
  });

  it("exits non-zero when local evals error", () => {
    const dir = mkdtempSync(join(tmpdir(), "webmcp-evals-cli-"));
    const toolsPath = join(dir, "schema.json");
    const evalsPath = join(dir, "evals.json");
    writeFileSync(
      toolsPath,
      JSON.stringify({
        tools: [{ name: "ping", description: "Ping", inputSchema: { type: "object" } }],
      }),
    );
    writeFileSync(
      evalsPath,
      JSON.stringify([
        {
          name: "ping",
          messages: [{ role: "user", type: "message", content: "ping" }],
          expectedCall: [{ functionName: "ping" }],
        },
      ]),
    );
    const result = spawnSync(
      process.execPath,
      [bin, "--reporter", "json", "-o", dir, "local", "-t", toolsPath, "-e", evalsPath],
      {
        encoding: "utf-8",
        cwd: dir,
        timeout: 20_000,
        env: {
          PATH: process.env.PATH,
          FORCE_COLOR: "0",
          GOOGLE_GENERATIVE_AI_BASE_URL: "http://127.0.0.1:9",
        },
      },
    );
    assert.strictEqual(result.status, 1, `${result.stdout}${result.stderr}`);
  });

  it("reports a smoke eval file that has no runnable steps without launching Chrome", () => {
    const dir = mkdtempSync(join(tmpdir(), "webmcp-evals-cli-"));
    const evalsPath = join(dir, "evals.json");
    writeFileSync(
      evalsPath,
      JSON.stringify([
        {
          name: "no steps",
          messages: [{ role: "user", type: "message", content: "hi" }],
          expectedCall: [],
        },
      ]),
    );
    const { code, out } = run("smoke", "-u", "http://127.0.0.1:9", "-e", evalsPath);
    assert.strictEqual(code, 1);
    assert.match(out, /must contain at least one required tool call/);
  });
});
