# Le Petit Bistro Evals

This directory contains eval cases for the [Le Petit Bistro](../../../demos/french-bistro/) demo. There is no `schema.json`: the demo registers its tool declaratively from a `<form>`, so these evals run against the page itself (`browser` or `smoke`), and the tool schema is discovered from the page.

The demo has several modes, selected with query-string flags, and each mode has its own eval file. The commands below run from `webmcp-evals/` after `npm run build`. Add `--chrome-channel chrome` (or the channel you have installed) before the command name. `browser` needs an API key (see the [main README](../../README.md#configure-api-keys)); `smoke` does not.

| Mode                                                                | Query string                               | Eval file                                            |
| ------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Declarative form, waits for the user to submit                      | _(none)_                                   | `evals.json`                                         |
| Declarative form, autosubmits and shows an in-page modal            | `?toolautosubmit`                          | `evals-toolautosubmit.json`                          |
| Declarative form, autosubmits to `result.html` (Schema.org JSON-LD) | `?toolautosubmit&crossdocument`            | `evals-toolautosubmit-crossdocument.json`            |
| Imperative `registerTool()`, autosubmits to `result.html`           | `?toolautosubmit&crossdocument&imperative` | `evals-toolautosubmit-crossdocument-imperative.json` |

For example, the imperative mode:

```bash
node dist/bin/webmcp-evals.js --chrome-channel chrome smoke \
  -u "https://googlechromelabs.github.io/webmcp-tools/demos/french-bistro/?toolautosubmit&crossdocument&imperative" \
  -e examples/french-bistro/evals-toolautosubmit-crossdocument-imperative.json

node dist/bin/webmcp-evals.js --chrome-channel chrome -m google:gemini-3.8-flash browser \
  -u "https://googlechromelabs.github.io/webmcp-tools/demos/french-bistro/?toolautosubmit&crossdocument&imperative" \
  -e examples/french-bistro/evals-toolautosubmit-crossdocument-imperative.json
```

`./run_smoke.sh bistro` runs all four modes.
