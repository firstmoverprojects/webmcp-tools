/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { SUPPORTED_OPERATORS, matchesArgument } from "../matcher.js";
import { isFunctionCall, isOrderedGroup, isUnorderedGroup } from "../utils.js";
import type { Eval, ExpectedCallNode, FunctionCall } from "../types/evals.js";

const examplesDir = fileURLToPath(new URL("../../examples", import.meta.url));

function listJsonFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listJsonFiles(path);
    return entry.endsWith(".json") ? [path] : [];
  });
}

function collectConstraintErrors(value: unknown, path: string, errors: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectConstraintErrors(item, `${path}[${i}]`, errors));
    return;
  }
  if (value === null || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("$")) {
      if (!(SUPPORTED_OPERATORS as readonly string[]).includes(key)) {
        errors.push(`${path}: unknown operator ${key}`);
        continue;
      }
      try {
        matchesArgument({ [key]: child }, "");
      } catch (e) {
        errors.push(`${path}.${key}: ${(e as Error).message}`);
      }
    }
    collectConstraintErrors(child, `${path}.${key}`, errors);
  }
}

function collectCalls(nodes: ExpectedCallNode[], out: FunctionCall[]): void {
  for (const node of nodes) {
    if (isOrderedGroup(node)) collectCalls(node.ordered, out);
    else if (isUnorderedGroup(node)) collectCalls(node.unordered, out);
    else if (isFunctionCall(node)) out.push(node);
    else throw new Error(`Unrecognized expectedCall node: ${JSON.stringify(node)}`);
  }
}

const files = listJsonFiles(examplesDir);
const schemaFiles = files.filter((f) => f.endsWith("schema.json"));
const evalFiles = files.filter((f) => !f.endsWith("schema.json"));

describe("bundled examples", () => {
  it("are present", () => {
    assert.ok(schemaFiles.length > 0, "expected at least one schema.json");
    assert.ok(evalFiles.length > 0, "expected at least one evals file");
  });

  for (const file of schemaFiles) {
    it(`${relative(examplesDir, file)} is a valid tool schema file`, () => {
      const schema = JSON.parse(readFileSync(file, "utf-8"));
      assert.ok(
        Array.isArray(schema.tools) && schema.tools.length > 0,
        "tools must be a non-empty array",
      );
      for (const tool of schema.tools) {
        assert.strictEqual(typeof tool.name, "string", "tool.name must be a string");
        assert.strictEqual(
          typeof tool.description,
          "string",
          `${tool.name}: description must be a string`,
        );
        if (tool.inputSchema != null) {
          assert.strictEqual(
            typeof tool.inputSchema,
            "object",
            `${tool.name}: inputSchema must be an object`,
          );
        }
      }
    });
  }

  for (const file of evalFiles) {
    it(`${relative(examplesDir, file)} is a valid evals file`, () => {
      const tests: Eval[] = JSON.parse(readFileSync(file, "utf-8"));
      assert.ok(Array.isArray(tests) && tests.length > 0, "evals file must be a non-empty array");

      const errors: string[] = [];
      tests.forEach((test, i) => {
        const label = test.name || `#${i}`;
        assert.ok(
          Array.isArray(test.messages) && test.messages.length > 0,
          `${label}: messages must be non-empty`,
        );
        for (const message of test.messages) {
          assert.ok(
            ["message", "functioncall", "functionresponse"].includes(message.type),
            `${label}: unknown message type ${JSON.stringify(message.type)}`,
          );
        }
        assert.ok(
          test.expectedCall === null || Array.isArray(test.expectedCall),
          `${label}: expectedCall must be an array or null`,
        );

        const calls: FunctionCall[] = [];
        collectCalls(test.expectedCall || [], calls);
        for (const call of calls) {
          assert.strictEqual(
            typeof call.functionName,
            "string",
            `${label}: functionName must be a string`,
          );
          collectConstraintErrors(
            call.arguments,
            `${label}.${call.functionName}.arguments`,
            errors,
          );
          collectConstraintErrors(call.result, `${label}.${call.functionName}.result`, errors);
        }
      });
      assert.deepStrictEqual(errors, []);
    });
  }
});
