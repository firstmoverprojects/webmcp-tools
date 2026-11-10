# WebMCP tools

Developer utilities and demos for [WebMCP](https://webmachinelearning.github.io/webmcp/), the proposed
web API that lets a page expose JavaScript functions to AI agents as structured "tools" through
`document.modelContext`.

The main piece of code here is [`webmcp-evals`](webmcp-evals/), a CLI that checks whether WebMCP
tools on a page work and whether LLMs call them correctly. The rest of the repository is a set of
demo sites that expose WebMCP tools, a polyfill for browsers without WebMCP, and pointers to related
tools.

> [!IMPORTANT]
> This repository is a fork of
> [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools). As of
> 10 November 2026 it is 124 commits behind upstream, which has since added features such as
> simulated conversations and extension-based evals. The `webmcp-evals` package on npm
> (currently 0.1.0) is published from upstream, so `npx webmcp-evals` runs upstream's code, not the
> code in this repository (0.0.4). To run the code in this repository, build it from source as shown
> below.

## WebMCP status

Verified on 10 November 2026 against the official sources linked below.

- **Specification.** [WebMCP](https://webmachinelearning.github.io/webmcp/) is a _Draft Community
  Group Report_ (dated 10 November 2026) of the W3C
  [Web Machine Learning Community Group](https://www.w3.org/community/webmachinelearning/). The
  document states that it is not a W3C Standard and is not on the W3C Standards Track. Development
  happens in [webmachinelearning/webmcp](https://github.com/webmachinelearning/webmcp), and
  conformance tests are tracked on [wpt.fyi](https://wpt.fyi/results/webmcp).
- **What the spec defines.** An imperative API on `document.modelContext` (a `ModelContext`
  `EventTarget`, secure contexts only):
  - `registerTool(tool, { signal, exposedTo })` takes `name`, `description`, `execute`, and
    optionally `title`, `inputSchema`, `outputSchema` and `annotations` (`readOnlyHint`,
    `untrustedContentHint`, `consequentialHint`, `debugging`). To unregister a tool, abort the
    `signal`; the spec has no `unregisterTool()` or `provideContext()`, and nothing on `navigator`.
  - `getTools({ fromOrigins })` lists registered tools.
  - `executeTool(tool, inputObject, { signal })` runs a tool. `inputObject` is a JavaScript object,
    not a JSON string.
  - `toolchange`, `toolactivated` and `toolcancel` events.
  - Access is gated by the `tools` permissions-policy feature (default allowlist `'self'`), so
    cross-origin iframes need `allow="tools"`.
- **Declarative API.** The `<form toolname tooldescription toolautosubmit>` attributes used by several
  demos are **not** part of the specification. They are explored separately in the
  [declarative API explainer](https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md).
  Chrome documents and implements them ([Chrome WebMCP docs](https://developer.chrome.com/docs/ai/webmcp)).
- **Browser support**, per the spec repository's
  [implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md):
  - Chrome: [origin trial](https://developer.chrome.com/blog/ai-webmcp-origin-trial) from Chrome 149.
    For local development, enable `chrome://flags/#enable-webmcp-testing`
    ([Chrome Status entry](https://chromestatus.com/feature/5117755740913664)).
  - Edge: origin trial in Edge 150.
  - Brave: experimental support in Leo AI chat. ChatGPT Desktop: supported.
  - Firefox and Safari: no implementation; standards positions are open
    ([Mozilla](https://github.com/mozilla/standards-positions/issues/1412),
    [WebKit](https://github.com/WebKit/standards-positions/issues/670)).
- **Automation.** Puppeteer's [WebMCP API](https://pptr.dev/guides/webmcp) (`page.webmcp`), which
  `webmcp-evals` uses, needs Chrome 151 or later launched with `--enable-features=WebMCP`. The CLI
  passes that flag for you.

## What's in this repository

| Path | What it is |
| --- | --- |
| [`webmcp-evals/`](webmcp-evals/) | TypeScript CLI: deterministic smoke tests of a page's WebMCP tools (no LLM needed), and LLM tool-calling evals against static schemas or live pages. |
| [`demos/`](demos/) | Demo sites that expose WebMCP tools (list below). |
| [`demos/shared/webmcp-polyfill.js`](demos/shared/webmcp-polyfill.js) | Polyfill for `document.modelContext`, declarative form tools and the `:tool-form-active` / `:tool-submit-active` CSS pseudo-classes, for browsers without WebMCP. |
| [`demos/shared/webmcp-batch.js`](demos/shared/webmcp-batch.js) | Registers an `execute_batch` tool that runs a sequence of tool calls with `$ref:` references between steps. Used by the Page Agent demo. |
| [`model-context-tool-inspector/`](https://github.com/beaufortfrancois/model-context-tool-inspector) | Git submodule: a Chrome extension that lists a page's WebMCP tools and lets you call them. |
| [`webmcp-studio/`](webmcp-studio/) | Prompts for having a coding agent add WebMCP tools to a site. |
| [`AWESOME_WEBMCP.md`](AWESOME_WEBMCP.md) | Community list of WebMCP demos, libraries and tools. |

## Quick start

Requirements: Node.js 22 or later, and Google Chrome 151 or later (current Stable works). The smoke
test below needs no API key.

```bash
git clone --recurse-submodules https://github.com/firstmoverprojects/webmcp-tools.git
cd webmcp-tools/webmcp-evals
npm ci
npm run build

# Call every expected tool in the pizza-maker evals directly on the hosted demo.
node dist/bin/webmcp-evals.js --chrome-channel chrome smoke \
  -u https://googlechromelabs.github.io/webmcp-tools/demos/pizza-maker/ \
  -e examples/pizza-maker/evals.json
```

The last line of output should be `Passed steps: 9/9 across 9 case(s).` The command exits with
code 1 if any step fails, so it can gate CI.

To test against your local copy of the demos instead, serve the `demos/` directory and point `-u`
at it:

```bash
# In one terminal, from the repository root:
python3 -m http.server 3000 --directory demos

# In another, from webmcp-evals/:
node dist/bin/webmcp-evals.js --chrome-channel chrome smoke \
  -u http://localhost:3000/doors/ -e examples/doors/evals.json
```

LLM-based evals (`local` and `browser`) need a model provider key; see the
[`webmcp-evals` README](webmcp-evals/README.md).

## Demos

Hosted versions of the demos are on upstream's GitHub Pages at
`https://googlechromelabs.github.io/webmcp-tools/demos/<name>/`. The static demos (no
`package.json`) run from any static file server, as in the quick start above. The others are Vite
or Angular apps; build them all with `./build-demos.sh`, or run one with `npm ci && npm run dev`
(Angular: `npm start`) inside its directory. To use the native API rather than the polyfill, open
them in Chrome with `chrome://flags/#enable-webmcp-testing` enabled. The Page Agent and Sport Shop
demos ask for your own Gemini API key in the browser.

- [**WebMCP explainer**](demos/explainer/): side-by-side comparison of an agent scraping a page
  versus calling tools the page declares with WebMCP.
- [**Travel (imperative)**](demos/react-flightsearch/): React flight search that exposes searching,
  filtering and reading results as tools.
- [**Le Petit Bistro (declarative)**](demos/french-bistro/): restaurant booking form exposed as a
  declarative tool, with an in-page agent.
- [**WebMCP zaMaker! (imperative)**](demos/pizza-maker/): build a pizza (size, style, toppings,
  layers) through tools.
- [**Mystery Doors (declarative and imperative)**](demos/doors/): small multi-page demo using both
  approaches.
- [**WebMCP Maze (imperative)**](demos/webmcp-maze/): a maze game played only by prompting an agent.
- [**CineFlow (imperative)**](demos/ticket-booking/): movie ticket flow: location, genre search,
  showtimes, checkout.
- [**Order Tracking (declarative)**](demos/order-tracking/): order history lookup and returns.
- [**L'Atelier Hotel Chain (imperative and declarative)**](demos/hotel-chain/): React hotel search
  and booking.
- [**WebMCP Sports (imperative and declarative)**](demos/sport-shop-angular/): Angular storefront
  with an in-page Gemini agent.
- [**The Morning Ritual (imperative)**](demos/coffee-shop/): coffee shop with reordering and product
  spec tools.
- [**UrbanEstates (imperative)**](demos/real-estate-map/): real-estate map with filter and map-view
  tools.
- [**Luxe Leather (declarative)**](demos/leather-bag/): Angular store with product search, policy
  and cart tools.
- [**WebMCP Smart Home (imperative)**](demos/smart-home/): dashboard an agent can reconfigure.
- [**Analytics Dashboard (imperative)**](demos/analytics-dashboard/): React charts driven by a query
  tool.
- [**WebMCP Page Agent (imperative)**](demos/page-agent/): a Gemini-powered agent that drives any
  WebMCP-enabled page, batching calls through `execute_batch`.

## Development

```bash
# Shared demo helpers (from the repository root)
node --test demos/shared/*.test.js

cd webmcp-evals
npm ci
npm test                          # format, compile and run the unit tests; no network or API keys
npm run lint && npx oxfmt --check # lint and format check, as CI runs them
```

GitHub Actions runs on every push and pull request to `main`:

- **Tests**: `webmcp-evals` type-check, unit tests on Node 22 and 24, and an `npm pack` dry run,
  plus the `demos/shared` tests.
- **Lint and Format**: `oxlint` and `oxfmt --check` for `webmcp-evals`.
- **Smoke Tests**: serves six demos locally and runs `webmcp-evals smoke` against each in Chrome
  Stable, including all four Le Petit Bistro modes.

The **Deploy Demos to Pages** and **npm Release** workflows only run on
`GoogleChromeLabs/webmcp-tools`: Pages is not enabled on this fork, and releases publish through
Google's registry proxy. To host the demos from a fork, enable GitHub Pages (source: GitHub
Actions) and remove the `if:` line from `.github/workflows/deploy.yml`.

## License

[Apache License 2.0](LICENSE). [`CONTRIBUTING.md`](CONTRIBUTING.md) describes upstream's process,
which requires the Google CLA.

## Disclaimer

This is not an officially supported Google product. This project is not
eligible for the [Google Open Source Software Vulnerability Rewards
Program](https://bughunters.google.com/open-source-security).
