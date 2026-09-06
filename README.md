# Interview Preparation Kit Generator

An intelligent, multi-step pipeline that transforms a job description and a company URL into a comprehensive, editable, and scheduled interview preparation kit. 

## Project Overview

This application automates the tedious process of preparing for an interview. It dynamically crawls company hiring pages and Reddit/Blind discussions, extracts core requirements from the job description, and generates a structured kit including role breakdowns, categorized question banks, flashcards, and a day-by-day study schedule. 

### Tech Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, React DnD for drag-and-drop.
- **Backend**: Node.js, Express (API routes).
- **Database**: MongoDB (via Mongoose).
- **Monorepo**: PNPM workspaces separating logic into `api`, `web`, `cli`, and core packages (`generation`, `pipeline`, `retrieval`, `shared`, etc.).
- **LLM**: Google Gemini API (`gemini-2.5-pro` and `gemini-1.5-flash`).
- **Research**: Custom Web Crawler + Tavily Search API.


---

## Setup & Execution

### Environment Variables
Create a `.env` file in the root directory (refer to `.env.example` if available):
```env
# MongoDB Connection
MONGO_URI=mongodb:your_mongo_uri

# LLM & Search
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key

# Authentication Auth Secret
JWT_SECRET=your_jwt_secret
```

### Local Setup (UI)
```bash
npm install -g pnpm
pnpm install
pnpm run dev
```
- Frontend runs at `http://localhost:3000`
- Backend API runs at `http://localhost:3001`

### Batch CLI Entry Point
The exact command to run the pipeline over a set of job descriptions without the UI:
```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

---

## LLM Configuration

- **Provider**: Google Vertex AI / Google Studio (Gemini)
- **Model**: `gemini-2.5-pro` for deep reasoning tasks (extraction, generation), and `gemini-1.5-flash` where latency and speed are preferred. Gemini was chosen for its massive context window and strong free-tier rate limits, preventing pipeline crashes during heavy batch operations.

---

## Architecture

The project utilizes a clear separation of concerns via a monorepo structure:
- `apps/web`: Next.js frontend handling the builder, practice modes, and UI.
- `apps/api`: Express server managing authentication, persistence, and SSE streaming.
- `apps/cli`: The headless batch entry point.
- `packages/pipeline`: The orchestrator that coordinates the research, generation, and coverage steps.
- `packages/retrieval`: The web crawler and fetch policy enforcement.
- `packages/extraction` & `packages/generation`: The LLM prompting interfaces.
- `packages/shared`: Zod schemas strictly enforcing the data contract across all environments.

---

## Retrieval & Sources

### Approach
The crawler does not rely on a fixed list of paths. It implements a **Dynamic Link Ranker**.
1. It fetches the provided company URL.
2. It extracts all same-origin links and scores them based on heuristics (e.g., `+10` for `/careers`, `/engineering`, `+5` for `/blog`, `-10` for `/login`).
3. It uses a priority queue to fetch the highest-ranked pages up to a safe `maxPages` limit.

### Sources Used
- **Company Site**: Dynamically discovered hiring/about pages (respecting `robots.txt`).
- **Public Discussion**: `site:reddit.com`, `site:teamblind.com`, and `site:glassdoor.com` via the Tavily API to find authentic interview experiences.

---

## Research / Generation Pipeline

The pipeline explicitly avoids single-shot generation to prevent hallucinations.
1. **Research (Parallel)**: The crawler finds company pages while Tavily finds public discussions.
2. **Extraction**: The LLM extracts only the actual requirements present in the JD, outputting strict JSON.
3. **Generation**: Generates categorized questions based on the extracted requirements and the researched context.
4. **Coverage Check (Deterministic)**: A pure code function compares generated questions against the must-have requirements. If gaps are found, a second LLM pass is triggered strictly to fill those gaps.
5. **Flashcards**: Summarizes questions into practice flashcards.
6. **Scheduling (Deterministic)**: A pure code function distributes the material mathematically across the requested days.

---

## State Model & Pinned Edits

Preserving user edits during regeneration was the hardest state problem to solve. 
- **Generated State**: By default, items have a `_source: 'generated'` flag.
- **Edited / Pinned State**: If a user edits a question inline, the frontend immediately tags that item with `_pinned: true`.
- **Merge Logic**: When the user requests regeneration, the backend fetches entirely new questions from the LLM. It then iterates over the existing array; if a question is `_pinned: true`, it is kept in place. If it is unpinned, it is overwritten by the fresh generation. 

---

## Scheduling

Scheduling is **not** handled by the LLM. It is arithmetic allocation handled by `packages/scheduling`.
- It maps the integer number of requested days.
- It guarantees every `must` priority requirement is scheduled.
- It distributes `difficulty: 3` (hardest) questions to the earliest days so candidates aren't cramming complex concepts the night before.
- It limits daily volume based on reasonable minute allocations.

---

## Creative Features

I implemented two custom features to genuinely help candidates with interview anxiety:

1. **Interview Readiness Score**: 
   - *Problem*: Candidates don't know when they are "ready."
   - *Solution*: A dynamic score that updates based on the confidence ratings (`1-5`) they log while using Practice Mode. It calculates coverage, schedule completion, and confidence averages to output a Readiness percentage and identify specific weak spots.
2. **Printable One-Pager Export**:
   - *Problem*: Staring at a screen minutes before an interview causes stress. Candidates want a physical cheat sheet.
   - *Solution*: A dedicated CSS-optimized print layout that turns the kit into a distraction-free, offline document detailing top hard questions, weak spots, and the company brief.

---

## Design Decisions & Trade-offs

1. **Security & Untrusted Data (SSRF Protection)**
   - *Decision*: Every URL fetched by the crawler passes through `validate-url.ts`, which explicitly blocks private IPs (`10.x`, `192.168.x`, `localhost`).
   - *Reasoning*: Because the app fetches URLs provided by users, we must prevent Server-Side Request Forgery attacks. We also enforce `Content-Type` checks to ensure we only process text/html, avoiding malicious binary downloads.
   - *Prompt Injection*: Fetched content is enclosed strictly as passive data inside the prompts.

2. **Long-Running Generation via Server-Sent Events (SSE)**
   - *Decision*: The generation pipeline takes 30-90 seconds. A standard HTTP request would time out. I used SSE (`text/event-stream`) so the frontend can display real-time step-by-step progress.

3. **Trade-off: Shallow Crawling**
   - *Limitation*: To protect API limits and latency, the crawler only fetches up to 3 pages per company. A deeply nested employee blog might be missed in favor of the primary `/careers` page.