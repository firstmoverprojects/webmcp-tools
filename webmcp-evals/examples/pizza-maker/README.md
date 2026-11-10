# WebMCP zaMaker! Evals

This directory contains eval cases for the [WebMCP zaMaker!](../../../demos/pizza-maker/) demo.

- `schema.json`: the demo's tool definitions, for running the evals without a browser (`local`).
- `evals.json`: cases with tool calls in a fixed order.
- `evals-unordered.json`: the same kind of cases using `{"unordered": [...]}` groups, for calls whose order doesn't matter.

Run from `webmcp-evals/` after `npm run build`:

```bash
# Deterministic, no API key
node dist/bin/webmcp-evals.js --chrome-channel chrome smoke \
  -u https://googlechromelabs.github.io/webmcp-tools/demos/pizza-maker/ \
  -e examples/pizza-maker/evals.json

# LLM against the static schema (needs an API key)
node dist/bin/webmcp-evals.js -m google:gemini-3.8-flash local \
  -t examples/pizza-maker/schema.json -e examples/pizza-maker/evals.json

# LLM against the live page (needs an API key)
node dist/bin/webmcp-evals.js --chrome-channel chrome -m google:gemini-3.8-flash browser \
  -u https://googlechromelabs.github.io/webmcp-tools/demos/pizza-maker/ \
  -e examples/pizza-maker/evals-unordered.json
```
