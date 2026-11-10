# WebMCP Evals (`webmcp-evals`)

> [!WARNING]
> `webmcp-evals` is experimental tooling for evaluating WebMCP schema definitions, tool calling, and agentic workflows. WebMCP itself is a [Draft Community Group Report](https://webmachinelearning.github.io/webmcp/), not a W3C Standard, and its API is still changing.

A TypeScript evaluation framework and CLI for testing how well Large Language Models (LLMs) call WebMCP tools, either from static tool schemas or live on a web page driven by Puppeteer.

## Features

- **`local`**: runs an eval suite against a static JSON tool schema. Needs an LLM, no browser.
- **`browser`**: opens the page in Chrome, discovers the tools it registers with WebMCP, and lets an LLM call them for real. Needs an LLM and a Chrome build with WebMCP.
- **`smoke`**: executes the expected calls from an eval suite directly against a live page. No LLM or API key; suitable for CI.
- **`analyze`**: asks an LLM to explain failures in a saved JSON report.
- **Model backends**: Vercel AI SDK (`vercel`, default; Google, OpenAI, Anthropic and Ollama models), `@google/genai` (`gemini`) and the Ollama client (`ollama`).
- **Reporters**: `console`, `json` and `html`, written to `.evals/`.
- **Constraint-based matching**: regex patterns, numeric ranges, type checks, and ordered, unordered and optional call groups.

## Requirements

- Node.js 22 or newer (CI runs 22 and 24).
- For `browser` and `smoke`: Chrome 151 or newer with WebMCP available. Puppeteer's WebMCP support [requires Chrome 151+](https://pptr.dev/guides/webmcp); the CLI launches Chrome with `--enable-features=WebMCP`. Pick the installed channel with `--chrome-channel` (the default is `chrome-canary`).
- For `local`, `browser` and `analyze`: an API key for a hosted model, or a running [Ollama](https://ollama.com/) server.

## Install

This fork is not published to npm. `npx webmcp-evals` downloads the upstream [`webmcp-evals`](https://www.npmjs.com/package/webmcp-evals) package from [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools), which is newer than this source tree. To run the code in this repository, build it:

```bash
cd webmcp-evals
npm ci
npm run build
node dist/bin/webmcp-evals.js --help
```

The examples below use `node dist/bin/webmcp-evals.js`. Substitute `npx webmcp-evals` if you want the upstream release instead.

## Configure API keys

The CLI loads a `.env` file from the current directory. Only the keys for the providers you use are needed:

```bash
# Google models (any one of these names works)
GOOGLE_AI=your_gemini_api_key
# GEMINI_API_KEY=...
# GOOGLE_GENERATIVE_AI_API_KEY=...

OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Ollama server address (default http://127.0.0.1:11434)
# OLLAMA_HOST=http://localhost:11434

# Optional: override provider endpoints (corporate gateways or
# self-hosted, OpenAI-compatible services).
# OPENAI_BASE_URL=https://your-proxy.example.com/v1
# ANTHROPIC_BASE_URL=https://your-proxy.example.com/anthropic
# GOOGLE_GENERATIVE_AI_BASE_URL=https://your-proxy.example.com/google
```

## Choosing a model

With the default `vercel` backend, the provider is chosen by a prefix on `--model`:

| `--model` value                | Provider                             |
| ------------------------------ | ------------------------------------ |
| `gemini-3.8-flash` (no prefix) | Google                               |
| `google:gemini-3.8-flash`      | Google                               |
| `openai:<model>`               | OpenAI, or `OPENAI_BASE_URL` if set  |
| `anthropic:<model>`            | Anthropic                            |
| `ollama:qwen2.5:14b`           | Ollama via its OpenAI-compatible API |

The default model is `gemini-3.5-flash`. As of 10 November 2026 Google lists it as [deprecated](https://ai.google.dev/gemini-api/docs/deprecations): it is no longer offered in AI Studio and API requests are routed to `gemini-3.6-flash`. Pass `-m` explicitly to pin a model; the examples here use `gemini-3.8-flash`, the newest Flash model on that page.

The `gemini` and `ollama` backends (`-b gemini`, `-b ollama`) only support the `local` command and evaluate a single model turn. For `browser`, or for multi-step trajectories, use the default backend with a prefixed model.

## Usage

Global options go before the command name:

| Option             | Shorthand | Default            | Description                                                             |
| ------------------ | --------- | ------------------ | ----------------------------------------------------------------------- |
| `--backend`        | `-b`      | `vercel`           | Model backend (`vercel`, `gemini`, `ollama`)                            |
| `--model`          | `-m`      | `gemini-3.5-flash` | Model identifier (see above)                                            |
| `--runs`           | `-r`      | `1`                | Runs per test case (positive integer)                                   |
| `--max-steps`      | —         | —                  | Maximum agent steps (positive integer)                                  |
| `--reporter`       | —         | `console html`     | One or more of `console`, `json`, `html`                                |
| `--output-dir`     | `-o`      | `.evals`           | Output directory for reports                                            |
| `--analyzer-model` | —         | `gemini-3.5-flash` | Model used for report analysis                                          |
| `--open-analysis`  | —         | `false`            | Open the analysis report when it is written                             |
| `--chrome-channel` | —         | `chrome-canary`    | Chrome channel (`chrome`, `chrome-beta`, `chrome-canary`, `chrome-dev`) |

`--reporter` accepts several values, so it would consume a command name that follows it. Put another option after it, for example `--reporter console json -m google:gemini-3.8-flash local ...`.

### Exit codes

`local`, `browser` and `smoke` exit with status `1` when any case fails or errors, and `0` when every case passes, so they can gate CI.

### `smoke`: deterministic checks, no LLM

Runs each case's required `expectedCall` entries, in authored order, on a fresh page. Optional calls are skipped. Matcher constraints (`$pattern`, `$contains`, `$type`, `$lte` and so on) are turned into concrete sample arguments, so the same suite works for LLM evals and smoke tests.

Against the hosted pizza demo:

```bash
node dist/bin/webmcp-evals.js --chrome-channel chrome smoke \
  -u https://googlechromelabs.github.io/webmcp-tools/demos/pizza-maker/ \
  -e examples/pizza-maker/evals.json
```

Against a demo served from this repository:

```bash
# from the repository root, in another terminal
python3 -m http.server 3000 --directory demos

# from webmcp-evals/
node dist/bin/webmcp-evals.js --chrome-channel chrome smoke \
  -u http://localhost:3000/doors/ \
  -e examples/doors/evals.json -v
```

| Option                     | Required | Default | Description                             |
| -------------------------- | -------- | ------- | --------------------------------------- |
| `-u, --url <url>`          | Yes      | —       | Target page URL                         |
| `-e, --evals <path>`       | Yes      | —       | Eval suite JSON                         |
| `--timeout <milliseconds>` | No       | `30000` | Timeout per navigation or tool step     |
| `-v, --verbose`            | No       | `false` | Print step-by-step navigation and calls |

### `local`: evals against a static schema

```bash
node dist/bin/webmcp-evals.js -m google:gemini-3.8-flash local \
  -t examples/pizza-maker/schema.json \
  -e examples/pizza-maker/evals.json
```

The examples that ship a `schema.json` are `address-form`, `commerce/retail`, `commerce/shopping`, `events`, `healthcare`, `pizza-maker`, `real-estate` and `travel`. Tool results come from each expected call's `mockOutput` (default `{}`).

| Option               | Required | Default | Description                                  |
| -------------------- | -------- | ------- | -------------------------------------------- |
| `-t, --tools <path>` | Yes      | —       | Tool schema JSON                             |
| `-e, --evals <path>` | Yes      | —       | Eval suite JSON                              |
| `--analyze`          | No       | `false` | Run LLM report analysis when the run is done |

### `browser`: evals against a live page

```bash
node dist/bin/webmcp-evals.js --chrome-channel chrome -m google:gemini-3.8-flash browser \
  -u https://googlechromelabs.github.io/webmcp-tools/demos/pizza-maker/ \
  -e examples/pizza-maker/evals.json --open
```

| Option               | Required | Default | Description                                  |
| -------------------- | -------- | ------- | -------------------------------------------- |
| `-u, --url <url>`    | Yes      | —       | Target page URL                              |
| `-e, --evals <path>` | Yes      | —       | Eval suite JSON                              |
| `--open`             | No       | `false` | Open the HTML report when it is written      |
| `--analyze`          | No       | `false` | Run LLM report analysis when the run is done |

### `analyze`: explain failures

```bash
node dist/bin/webmcp-evals.js analyze .evals/report-1784621327799.json --open
```

| Argument/Option       | Required | Default            | Description                                       |
| --------------------- | -------- | ------------------ | ------------------------------------------------- |
| `<report-path>`       | Yes      | —                  | JSON or HTML report (e.g. `.evals/report-*.json`) |
| `-m, --model <model>` | No       | `gemini-3.5-flash` | Model used for the analysis                       |
| `--open`              | No       | `false`            | Open the analysis report in the browser           |

## Eval suite format (`evals.json`)

An eval suite is a JSON array of cases. Each case has a conversation (`messages`) and the tool calls the model is expected to make (`expectedCall`). This case is taken from `examples/pizza-maker/evals.json`:

```json
[
  {
    "messages": [
      {
        "role": "user",
        "type": "message",
        "content": "Make me a large pepperoni pizza."
      }
    ],
    "expectedCall": [
      { "functionName": "set_pizza_size", "arguments": { "size": "Large" } },
      { "functionName": "add_topping", "arguments": { "topping": "🍕" } }
    ]
  }
]
```

| Field                         | Description                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                        | Optional label shown in reports.                                                                                                                                                |
| `messages[]`                  | `{role: "user" \| "model", type: "message", content}`, `{role: "model", type: "functioncall", name, arguments}`, or `{role: "user", type: "functionresponse", name, response}`. |
| `expectedCall`                | Array of expected calls and groups, matched in order. `null` means the model should not call any tool.                                                                          |
| `expectedCall[].functionName` | Tool name.                                                                                                                                                                      |
| `expectedCall[].arguments`    | Expected arguments, using literals or the operators below. Omit it (or use `null`) to accept any arguments.                                                                     |
| `expectedCall[].result`       | Optional expected tool result, matched with the same operators as `arguments`.                                                                                                  |
| `expectedCall[].mockOutput`   | Optional result returned to the model in `local` runs. Defaults to `{}`.                                                                                                        |
| `expectedCall[].optional`     | `true` if the call may be skipped without failing the case.                                                                                                                     |
| `{"ordered": [...]}`          | Group whose calls must appear in this order.                                                                                                                                    |
| `{"unordered": [...]}`        | Group whose calls may appear in any order (see `examples/pizza-maker/evals-unordered.json`).                                                                                    |

### Argument matching operators

| Operator      | Description                                                | Example                         |
| ------------- | ---------------------------------------------------------- | ------------------------------- |
| `$eq`         | Exact (deep) equality                                      | `{"$eq": {"unit": "C"}}`        |
| `$pattern`    | Regular expression match                                   | `{"$pattern": "^2026-\\d{2}$"}` |
| `$contains`   | Substring match                                            | `{"$contains": "York"}`         |
| `$gt`, `$gte` | Greater than (or equal)                                    | `{"$gte": 1}`                   |
| `$lt`, `$lte` | Less than (or equal)                                       | `{"$lte": 120}`                 |
| `$type`       | `string`, `number`, `boolean`, `object`, `array` or `null` | `{"$type": "string"}`           |
| `$any`        | Field must be present, any value                           | `{"$any": true}`                |

Operators can be combined in one object (`{"$gte": 1, "$lte": 5}`). An unknown operator such as `$regex` is an error rather than a silent mismatch.

## Development and testing

```bash
npm ci
npm test        # formats with oxfmt, compiles, then runs node --test on dist/test/*.test.js
npm run lint    # oxlint
```

`npm run build` and `npm test` rewrite source formatting with `oxfmt --write`; CI compiles with `npx tsc` directly. A single test file can be run after building, for example `node --test dist/test/matcher.test.js`.

### Batch scripts

`run_smoke.sh` and `run_evals.sh` run every bundled example against the hosted demos on `googlechromelabs.github.io`, which are deployed from upstream rather than from this fork:

```bash
CHROME_CHANNEL=chrome ./run_smoke.sh pizza -v
CHROME_CHANNEL=chrome ./run_smoke.sh all
./run_evals.sh all          # needs an API key
```

Set `BASE_URL=http://localhost:3000` to point the per-demo paths at a local server instead, or `URL=...` to run one target against an explicit page.

## License

Apache-2.0. See [LICENSE](LICENSE).
