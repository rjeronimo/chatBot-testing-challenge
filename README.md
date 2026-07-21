# Local LLM Chatbot Challenge App (Ollama)

Minimal chatbot web app running fully local through Ollama.

The repository is intentionally small so it can be used as the base application
for a testing challenge focused on deterministic and non-deterministic behavior
without depending on cloud LLM quotas.

## Purpose

This repository provides a clean app baseline for testers.

It is not a testing framework. The candidate is expected to build the testing
strategy and tooling on top of this app in a fork or in a derived repository.

## Architecture

The application has two runtime parts:

- React frontend served by Vite.
- Express backend that calls a local Ollama model.

During local development:

- Frontend runs on `http://localhost:5173`.
- Backend runs on `http://localhost:3001`.
- Frontend requests to `/api/*` are proxied to backend.

### Request flow

1. User types a message in the frontend.
2. Frontend sends `POST /api/chat` with `{ "message": "..." }`.
3. Backend validates the payload.
4. Backend calls Ollama `POST /api/generate` (local).
5. Backend returns `{ "reply": "...", "latencyMs": number }`.
6. Frontend renders the assistant response.

## Tech stack

| Layer | Technology |
| ---- | ---- |
| Frontend | React 18, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| LLM integration | Ollama local HTTP API |
| Runtime config | dotenv |

## Project structure

```text
.
├── src/
│   ├── backend/
│   │   ├── app.ts
│   │   ├── config.ts
│   │   ├── ollama.ts
│   │   ├── server.ts
│   │   ├── timeout.ts
│   │   └── validation.ts
│   └── frontend/
│       ├── api.ts
│       ├── App.tsx
│       ├── index.html
│       ├── main.tsx
│       └── styles.css
├── tests/
│   ├── unit/
│   ├── api/
│   └── e2e/
├── .env.example
├── .github/workflows/playwright.yml
├── .npmrc
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.build.json
└── vite.config.ts
```

## Backend

The backend entry point is `src/backend/server.ts`. It creates the Express app
from `src/backend/app.ts` and starts listening on the configured port.

### Backend responsibilities

- Parse JSON requests.
- Enable CORS for the frontend.
- Validate incoming chat messages.
- Enforce timeout budget for local model calls.
- Translate Ollama failures into API-friendly HTTP responses.

### Endpoints

#### `GET /api/openapi.json`

Returns the OpenAPI specification in JSON format for the backend services.

#### `GET /api/docs`

Serves Swagger UI for interactive backend API documentation and testing.

#### `GET /api/health`

Health endpoint to verify backend status.

Example response:

```json
{
  "status": "ok",
  "model": "qwen2.5:3b-instruct"
}
```

#### `POST /api/chat`

Accepts user message and returns model response.

Request body:

```json
{
  "message": "Explain what an LLM is in simple terms"
}
```

Successful response:

```json
{
  "reply": "An LLM is a model trained to understand and generate language...",
  "latencyMs": 842
}
```

Possible error responses:

- `400` when `message` is missing, empty, not a string, or too long.
- `429` when upstream model/provider rate limit is reached.
- `503` when local model service is unavailable (for example Ollama not running).
- `502` for upstream failures that do not map to a specific status.
- `504` when the model exceeds timeout budget.

### API docs (Swagger UI)

When backend is running, API documentation is available at:

- `http://localhost:3001/api/docs` (interactive Swagger UI)
- `http://localhost:3001/api/openapi.json` (raw OpenAPI spec)

Use Swagger UI to test backend services:

1. Open `http://localhost:3001/api/docs`.
2. Expand `GET /api/health` and click **Try it out** then **Execute**.
3. Expand `POST /api/chat`, click **Try it out**, set request body:

```json
{
  "message": "Say hello in one short sentence."
}
```

4. Click **Execute** and review status code + response body.

### Backend modules

- `src/backend/app.ts`: Express app and route handling.
- `src/backend/server.ts`: backend bootstrap.
- `src/backend/config.ts`: environment variable loading and defaults.
- `src/backend/ollama.ts`: Ollama HTTP client and response parsing.
- `src/backend/validation.ts`: input validation rules.
- `src/backend/timeout.ts`: generic timeout wrapper.

## Frontend

The frontend is intentionally minimal.

### Frontend responsibilities

- Render chat interface.
- Keep message history in memory.
- Send requests to backend.
- Display loading and error states.

### Frontend modules

- `src/frontend/App.tsx`: main chat UI and state management.
- `src/frontend/api.ts`: wrapper around `/api/chat`.
- `src/frontend/main.tsx`: React bootstrap.
- `src/frontend/index.html`: Vite HTML entry.
- `src/frontend/styles.css`: base styles.

## Configuration

The app reads runtime settings from environment variables.

| Variable | Required | Description |
| ---- | ---- | ---- |
| `OLLAMA_BASE_URL` | No | Ollama base URL. Default: `http://localhost:11434`. |
| `OLLAMA_MODEL` | No | Local model tag to use. Default: `qwen2.5:3b-instruct`. |
| `PORT` | No | Backend port. Default: `3001`. |
| `REQUEST_TIMEOUT_MS` | No | Timeout budget per model request. Default: `20000`. |

## Prerequisites

Before running the app, make sure you have:

- Node.js 20 or newer.
- npm available in your environment.
- Ollama installed locally.

## Install Ollama (macOS, Linux, Windows)

### macOS

1. Install from https://ollama.com/download.
2. Launch Ollama.
3. Verify:

```bash
ollama --version
```

### Linux

1. Install from https://ollama.com/download/linux.
2. Start service (if needed):

```bash
sudo systemctl start ollama
```

3. Verify service/API:

```bash
curl -s http://localhost:11434/api/tags
```

### Windows

1. Install from https://ollama.com/download/windows.
2. Open Ollama app (or start service from installed shortcut).
3. Verify in PowerShell:

```powershell
ollama --version
```

## Choose and pull a local model

After installing Ollama, pull one model before starting the app.

Recommended small models for lower-resource laptops:

- `qwen2.5:3b-instruct` (default in this repo)
- `phi3:mini`
- `gemma2:2b`

Example:

```bash
ollama pull qwen2.5:3b-instruct
```

You can check downloaded models with:

```bash
ollama list
```

## Environment setup

Create your local environment file:

```bash
cp .env.example .env
```

Default `.env` values are already local-only and free to run:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b-instruct
PORT=3001
REQUEST_TIMEOUT_MS=20000
```

If you pulled a different model, update `OLLAMA_MODEL` accordingly.

`.env` is ignored by Git and must not be committed.

## Install dependencies

```bash
npm install
```

The repository includes `.npmrc` pointing to the public npm registry.

## Run the app

### Start frontend and backend together

```bash
npm run dev
```

This starts:

- backend on `http://localhost:3001`
- frontend on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

### Manual verification after startup

1. Confirm Ollama is running and model exists:

```bash
ollama list
```

2. Open `http://localhost:5173`.
3. Type a simple prompt (example: `Say hello in one short sentence.`).
4. Click **Send**.
5. Confirm a bot response appears in the UI.

If no response appears:

- Verify Ollama is running.
- Verify `OLLAMA_MODEL` exists in `ollama list`.
- Check backend logs for `503`, `502`, or `504`.

### Start only the backend

```bash
npm run dev:server
```

### Start only the frontend

```bash
npm run dev:web
```

## Build and run in production mode

Create frontend bundle:

```bash
npm run build
```

Start backend runtime:

```bash
npm run start
```

## Low-resource machine recommendations

If the computer is slow or has limited RAM:

- Prefer 2B to 3B models (`gemma2:2b`, `qwen2.5:3b-instruct`, `phi3:mini`).
- Keep prompts short.
- Increase `REQUEST_TIMEOUT_MS` if timeouts are frequent.
- Avoid running other heavy processes in parallel.

This setup is still valid for the challenge because the focus is testing strategy,
not peak model quality.

## Operational notes

- LLM responses are non-deterministic by nature.
- Local models may vary in quality depending on model size and hardware.
- `503` usually indicates Ollama service is not reachable.
- `504` indicates the model exceeded timeout budget.
- `429` may appear depending on provider/model behavior or middleware constraints.

These behaviors are part of the app reality and are relevant for API, UI, and
non-deterministic testing scenarios.

## Testing solution

This fork adds a Playwright-based test framework around the chatbot app. The
design goal is to keep **contract and UI behavior deterministic** (no live
model required), and to isolate **live Ollama checks** behind an explicit flag
so CI stays stable.

### What was implemented

| Layer | Location | Purpose |
| ---- | ---- | ---- |
| Unit | `tests/unit/` | Pure logic for `validateMessage` and `withTimeout` |
| API (deterministic) | `tests/api/` | HTTP contracts and error mapping via injected `generate` |
| E2E (deterministic) | `tests/e2e/` | Chat UI flow with `page.route` API mocks |
| LLM (non-deterministic) | same API/E2E files, gated | Soft relevance / non-empty reply against live Ollama |

### Deterministic vs non-deterministic

**Deterministic (default CI / `npm test`):**

- Status codes, JSON shapes, validation errors
- Upstream failure mapping (`503`, `429`, `504`, `502`) using `createApp({ generate })`
  instead of mocking `/api/chat` itself — this asserts the real Express behavior
- UI send/history/error rendering with mocked `/api/chat`

**Non-deterministic (opt-in):**

- Enabled with `RUN_LLM_TESTS=1`
- Asserts non-empty replies and soft relevance (regex / keyword family), not
  exact strings like `"Hola"` only
- Expect flakiness variance by model and hardware; do not gate merges on these

### Why inject `generate` for API faults?

Mocking `POST /api/chat` only proves the mock works. The backend already accepts
an injectable generator (`AppOptions.generate`). Tests use Supertest against
`createApp({ generate })` and throw upstream-style errors from the injected
function, which verifies status mapping in `src/backend/app.ts`.

### How to run tests

Prerequisites: Node.js 20+, `npm install`, then once:

```bash
npx playwright install chromium
```

#### Test environment variables

Deterministic suites (`npm test`, `test-unit`, `test-api`, `test-e2e`, `test-ui`)
do **not** require any special test flags. Optional app settings still come from
`.env` when Playwright starts (or reuses) the backend:

```bash
cp .env.example .env
```

Example `.env` (same as app runtime):

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b-instruct
PORT=3001
REQUEST_TIMEOUT_MS=20000
```

| Variable | Required for | Example | Notes |
| ---- | ---- | ---- | ---- |
| _(none)_ | `npm test` / deterministic suites | — | Defaults work; `.env` optional |
| `RUN_LLM_TESTS` | Live LLM suites only | `1` | Set automatically by `npm run test-llm` |
| `OLLAMA_BASE_URL` | Live LLM + real backend | `http://localhost:11434` | From `.env` / shell |
| `OLLAMA_MODEL` | Live LLM + real backend | `qwen2.5:3b-instruct` | Must exist in `ollama list` |
| `PORT` | App / E2E webServer | `3001` | Must match Playwright `baseURL` |
| `REQUEST_TIMEOUT_MS` | Slow local models | `20000` or higher | Raise if live chats time out |
| `CI` | GitHub Actions (automatic) | `true` | Do not set locally unless mimicking CI |

Examples:

```bash
# Deterministic — no test env vars needed
npm test

# Live LLM — preferred (script sets RUN_LLM_TESTS=1 for you)
npm run test-llm

# Live LLM — manual equivalent (macOS / Linux)
RUN_LLM_TESTS=1 npx playwright test --project=api-tests --project=e2e-tests --grep non-deterministic

# Live LLM — manual equivalent (Windows PowerShell)
$env:RUN_LLM_TESTS = "1"
npx playwright test --project=api-tests --project=e2e-tests --grep non-deterministic

# Optional: point live tests at a different local model
OLLAMA_MODEL=phi3:mini npm run dev
# then in another terminal:
npm run test-llm
```

**Recommended local workflow**

1. Start the app (optional but convenient — Playwright will reuse it):

```bash
npm run dev
```

2. In another terminal, run suites:

```bash
npm run test-unit
npm run test-api
npm run test-e2e
# or all deterministic layers:
npm test
```

If the app is not already running, Playwright’s `webServer` config starts
backend + Vite automatically and shuts them down when tests finish.

Interactive UI (all projects: unit, api, e2e):

```bash
npm run test-ui
```

In the Playwright UI sidebar, make sure **unit-tests**, **api-tests**, and
**e2e-tests** are all selected (project filter).

Live LLM suites (Ollama running, model pulled, `.env` configured):

```bash
npm run test-llm
```

Notes:

- Deterministic API tests use Supertest against `createApp({ generate })`.
  They do not need Ollama.
- E2E deterministic tests mock `/api/chat` in the browser and need the Vite UI.
- CI (`.github/workflows/playwright.yml`) runs only the deterministic projects.
- See [docs/process-env.md](docs/process-env.md) for `CI` / `RUN_LLM_TESTS`.

### Project layout (tests)

```text
tests/
├── unit/
│   ├── validation.spec.ts
│   └── timeout.spec.ts
├── api/
│   ├── chat-deterministic.spec.ts
│   ├── chat-non-deterministic.spec.ts
│   ├── interfaces.ts
│   └── llmHelpers.ts
└── e2e/
    ├── chat-deterministic.spec.ts
    ├── chat-non-deterministic.spec.ts
    └── helpers.ts
```

## Challenge instructions

This repository is the base app for a testing challenge.

### Goal

Build a testing framework around this chatbot application. The solution should
cover both deterministic and non-deterministic LLM behavior.

### Expected approach

Prefer a layered suite:

1. Unit-test pure helpers without HTTP or a model.
2. API-test Express contracts with an injected generator for deterministic faults.
3. E2E-test the chat UI with network mocks for stable UX assertions.
4. Keep live-model checks optional, soft, and clearly labeled.

### Suggested testing scope

Suggested areas:

- unit tests for isolated logic and utility behavior
- API tests for backend contracts and error handling
- UI or end-to-end tests for chat flow
- non-deterministic tests for quality, relevance, consistency, and hallucination risk

### Use of AI tools

The challenge encourages AI-assisted tooling to:

- design framework structure
- generate test cases
- generate test data and prompt sets
- propose assertions and evaluation strategies
- improve documentation and maintenance

### Deliverables

- Playwright projects for unit, API, and E2E coverage
- Clear scripts in `package.json` (`test`, `test-unit`, `test-api`, `test-e2e`, `test-llm`)
- CI workflow that runs deterministic tests only
- This README section describing strategy, runbooks, and LLM handling

### README expectations

- rewrite this README to include testing solution, or
- extend it with a dedicated testing section.

Documentation should explain what was implemented, why, how to run it, and how
non-deterministic behavior was handled.

## Review checklist

When reviewing solution, verify:

- app still runs locally
- framework is easy to install and execute
- strategy matches LLM chatbot characteristics
- deterministic vs non-deterministic checks are clearly separated
- README is clear and reproducible
- shared repository can be executed by another reviewer
