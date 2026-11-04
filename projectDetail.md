# DecisionnX: Project Details

## 1. Project Overview
**DecisionnX** is a generalized, multi-agent idea evaluation platform. It allows users to input any business, technical, or creative idea (along with optional context, success criteria, constraints, or files) and have it rigorously evaluated by a dynamically assembled panel of AI expert personas. 

The system goes beyond a single LLM response by using a specialized multi-agent architecture. It classifies the idea, selects the most relevant built-in experts, dynamically invents custom bespoke experts if needed, runs their evaluations in parallel for blazing speed, and then synthesizes their feedback into a unified boardroom-style verdict. It specifically highlights areas of consensus and disagreement.

## 2. System Architecture & Tech Stack

The project is structured as a decoupled frontend/backend application, communicating via a REST API with support for real-time NDJSON streaming.

### Frontend
- **Framework**: Next.js 16.3.0 (React 19)
- **Styling**: Tailwind CSS v4, DaisyUI v5.7
- **Animations & Interactivity**: Framer Motion v13 (focusing on tactile, physical micro-animations)
- **Visualizations**: Hand-built SVG charts (no chart library)
- **Markdown Parsing**: React Markdown v10.1
- **Role**: Provides the user interface for submitting ideas, selecting the number of personas, and visualizing the multi-agent feedback in real-time, including expert score breakdowns, SWOT analysis, and action plans. Includes local history management and export capabilities (PDF via the print-ready report page, HTML, CSV).

### Backend
- **Framework**: FastAPI (Python)
- **Server**: Uvicorn (ASGI)
- **LLM Integration**: 
  - Supports multiple providers: **Groq**, **NVIDIA**, and **OpenRouter**, managed through a dynamic client (`llm_client.py`) that handles API key rotation, timeouts, and rate limits.
  - The experts, the Panel Architect and document condensation run on Groq. Only the final synthesis falls back Groq → NVIDIA → OpenRouter, so a Groq key is required.
- **Environment Management**: `python-dotenv` for managing API keys. Keys can be loaded from text files (`groqapi`, `nvidiaapi`, `openrouterapi`).
- **File Parsing**: Uses `pdfplumber` and `openpyxl` (plus built-in parsers for DOCX, CSV and text), in an isolated, memory-capped worker, to extract context from uploaded files.

## 3. The Multi-Agent Pipeline

The core logic resides in `backend/agents/`. When an idea is submitted to the `/api/evaluate` or `/api/evaluate/stream` endpoint, the orchestrator triggers the following pipeline:

### Step 1: Domain Classification
The system first analyzes the idea to detect its primary domains (e.g., "tech", "finance", "health", "ecommerce") using keyword heuristics (`backend/agents/personas.py`).

### Step 2: Dynamic Persona Assembly
Based on the detected domains, the system dynamically selects the most relevant expert personas from a roster of 12 available experts. 
- **The Critic** ("Devil's Advocate") is *always* included to ensure rigor and find flaws.
- **The Panel Architect**: If the built-in roster cannot cover the requested panel size, or the idea matches no known domain, an LLM-driven "Panel Architect" dynamically designs bespoke personas tailored specifically to the idea.

**The 12 Built-in Personas:**
1. **🦈 The Investor**: Focuses on TAM, unit economics, scalability, and exit potential.
2. **🔧 The Engineer**: Evaluates technical feasibility, architecture, and tech debt.
3. **👤 The User**: Assesses actual utility, pain points, and UX friction.
4. **💰 The Economist**: Analyzes cost structure, burn rate, and financial risks.
5. **📊 The Strategist**: Looks at GTM, competitive moats, and positioning.
6. **⚖️ The Regulator**: Identifies legal, compliance, and IP risks.
7. **🎨 The Designer**: Evaluates UX, accessibility, and cognitive load.
8. **🔬 The Researcher**: Checks scientific validity, prior art, and evidence.
9. **🌍 The Impact Analyst**: Looks at social value, ethics, and sustainability.
10. **📢 The Marketer**: Focuses on distribution, acquisition, and virality.
11. **🏗️ The Operator**: Assesses logistics, supply chain, and real-world execution.
12. **🔥 The Critic**: Actively looks for hidden risks, wrong assumptions, and reasons it will fail.

### Step 3: Parallel Execution & Agent Features
The selected personas evaluate the idea simultaneously. Thanks to `asyncio.gather` and fast inference endpoints, running 5 or 30 agents happens quickly. 
- **Strict JSON Output**: Every persona outputs a standardized JSON response containing their verdict, score (1-10), strengths, concerns, recommendation, and optional charts.
- **Independent Execution**: Agents execute independently, ensuring un-biased multi-faceted critiques.
- **Bespoke Generation**: For domains lacking built-in personas, custom agent prompts are generated on the fly.

### Step 4: Synthesis
The `synthesizer.py` agent takes all the individual persona outputs and acts as the "Board Chairman". It produces a unified JSON verdict containing an overall score, executive summary, consensus points, disagreements, SWOT analysis, action plans, and data charts.
The synthesizer uses a fallback chain (Groq -> NVIDIA -> OpenRouter). If all API calls fail, it gracefully degrades to a deterministic local synthesis function to ensure the user always gets a response.

## 4. The UI and Export Capabilities

The platform provides a rich, real-time visualization of the evaluation and powerful tools for saving and sharing:

- **The Brief Form**: Users can submit their idea alongside context, success criteria, and constraints. Files can be attached for additional grounding.
- **Real-Time Progress State**: Displays an NDJSON streaming experience. Shows a live progress bar ("Awaiting") while the panel is being assembled, and updates as each expert finishes.
- **Expert Cards**: Individual cards for each persona detailing their specific verdict, score out of 10, "In favour" points (strengths), "Against" points (concerns), and recommendations. Bespoke experts created by the Panel Architect are tagged.
- **Synthesis View (The Boardroom Verdict)**: 
  - **Overall Score & Verdict**: Shows Go, Caution, or No-Go using distinct styling.
  - **Executive Summary & Consensus**: Highlights what the panel universally agreed upon.
  - **Where They Split**: A dedicated disagreements section showcasing conflicting views between experts and providing a reconciled resolution.
  - **By the Numbers**: Renders charts (via Recharts) representing quantitative data, such as score spread among experts.
  - **SWOT Quadrants**: Categorizes feedback into Strengths, Weaknesses, Opportunities, and Threats.
  - **Action Plans**: Breaks down actionable next steps into Immediate (7 days) and Follow-through (30 days) horizons.
  - **The Chair's Recommendation**: A final, actionable paragraph summarizing the boardroom's conclusion.
- **History and Notes**: 
  - **Local History Sidebar**: Evaluations are saved locally in the browser (`localStorage`). Users can access past evaluations using a sidebar toggle or the `Cmd/Ctrl + K` keyboard shortcut.
  - **Reviewer Notes**: Users can add personal notes to any evaluation, which are also persisted locally.
- **Report Generation**: Users can download the entire evaluation, including all expert opinions and the synthesis, as a PDF (printed from the report page), a standalone `HTML` document or a flat `CSV` file for data manipulation.

## 5. Local Development

The project includes convenient scripts to run the stack locally (`start_dev.bat` for Windows and `start_dev.sh` for Unix/Linux).

- **Behavior**: 
  1. Cleans up any existing processes on ports 3000 and 8001.
  2. Installs or checks dependencies.
  3. Starts the FastAPI backend on `http://localhost:8001`.
  4. Starts the Next.js frontend development server on `http://localhost:3000`.

## 6. Target Audience

DecisionnX is for anyone who has to decide whether an idea is worth time or money and can't easily get a room full of experts to review it.

| Segment | Their problem | What DecisionnX gives them |
| --- | --- | --- |
| **Early-stage founders and indie hackers** (primary) | They build before validating, and mentors or consultants are slow and expensive. | A multi-angle review in minutes, the riskiest assumptions, and a 7-day plan of cheap experiments to test them. |
| **Students, hackathon and capstone teams** (primary) | They have to pick a project and defend it to judges or faculty with little industry exposure. | Feedback from investor, engineer, user and regulator perspectives, plus a report to bring to reviews. |
| **Product managers and innovation teams** | Feature and product bets get judged by whoever is loudest in the meeting. | A structured pre-mortem with a score, SWOT and the points where perspectives disagree. |
| **Incubators, accelerators and startup competitions** | Too many applications to review in depth. | A consistent first-pass evaluation for each idea, so mentors can spend their time on the strongest ones. |
| **Researchers** | Research concepts need early challenge on feasibility and novelty. | Domain-specific custom experts designed by the Panel Architect. |
| **Small business owners and freelancers** | They decide on new products, services or locations without an advisory board. | An affordable stand-in for a board review before committing money. |

**Beachhead:** founders and students. They have the most ideas to test, the least access to experts, and they share results with teammates, which helps the product spread.

## 7. Prototype Status

DecisionnX is a **working prototype**, not a mock-up. Everything below runs today:

- Idea form with context, up to 8 attached files (PDF, DOCX, XLSX, CSV, TXT) and a panel of 1–30 experts
- Domain classification, 12 built-in experts and custom experts designed by the Panel Architect
- Parallel expert evaluation streamed live to the browser over NDJSON
- Boardroom synthesis: score, Go / Caution / No-Go verdict, consensus, disagreements, SWOT, 7- and 30-day action plans, charts
- Condensation of long documents so experts see a digest instead of a cut-off excerpt
- Local history with notes, and PDF / HTML / CSV export
- A built-in demo evaluation that works without an API key
- Timeouts, key rotation, a fallback chain for synthesis and 97 backend test functions (LLM calls stubbed)

**Demo flow (about 3 minutes):**
1. Open the app and show the built-in demo evaluation, so the audience sees the finished output first.
2. Type a new idea, for example "A subscription platform that provides AI tutors for engineering students".
3. Choose 5 experts and press evaluate. The panel appears, then each expert card arrives as it finishes.
4. Walk through the boardroom verdict: the score, one disagreement and the 7-day plan.
5. Open the report page and export it as PDF.

**Not built yet:** user accounts, a hosted multi-user deployment, payments, cloud history and team workspaces. These are needed for the business model below and are on the roadmap.

## 8. Financial Aspect

### 8.1 Cost of one evaluation

DecisionnX pays for LLM tokens, not for servers doing heavy work. The calls per evaluation come straight from the code:

| Stage | Calls | Model (Groq) | Output limit |
| --- | --- | --- | --- |
| Document condensation (only for long files) | up to 8 per file | `llama-3.1-8b-instant` | up to 2,048 tokens |
| Panel Architect (only when custom experts are needed) | 1 | `llama-3.3-70b-versatile` | 260 + 130 per custom expert |
| Experts | 1 per expert | `llama-3.1-8b-instant` | 950 tokens |
| Boardroom synthesis | 1 | `llama-3.3-70b-versatile` | 1,800 tokens |

Using Groq's list prices at the time of writing (8B: $0.05 per million input tokens and $0.08 per million output; 70B: $0.59 in and $0.79 out — check [groq.com/pricing](https://groq.com/pricing), these change):

| Scenario | Approx. tokens | Approx. cost |
| --- | --- | --- |
| **Typical:** 5 experts, no files | ~7k in / ~4k out | **~$0.003** |
| Typical + custom experts | ~9k in / ~5k out | ~$0.005 |
| **Worst case:** 30 experts, 8 long files, full context | ~280k in / ~165k out | **~$0.04** |

These are estimates from prompt sizes and output limits, not measured bills. Retries after bad JSON or truncated output can add to them. In practice, **1,000 typical evaluations cost about $3–5 in LLM fees**. During development, the free tiers of Groq, NVIDIA and OpenRouter cover the cost entirely.

Other running costs for a hosted version: one small server for the FastAPI backend, static hosting for the Next.js frontend, a domain, and later a database for accounts and cloud history.

### 8.2 Business model (proposed)

None of this is implemented yet. It's a proposed plan that the cost structure supports.

| Tier | Price (proposed) | Includes |
| --- | --- | --- |
| **Open source / self-hosted** | Free | The full app under the MIT license; users bring their own API keys |
| **Hosted Free** | Free | A few evaluations a month, panels up to 5 experts; acts as the funnel |
| **Pro** | ~$9 / month | ~100 evaluations a month, panels up to 30, file uploads, cloud history |
| **Pay per report** | ~$1 per deep evaluation | For occasional users who don't want a subscription |
| **Team / Institution** | Per seat or yearly licence | Shared workspaces, custom expert panels, bulk evaluation for incubators, universities and competitions |

**Unit economics:** even if a Pro user ran 100 worst-case evaluations a month, LLM fees would be about $4 against $9 of revenue. At typical usage they're under $0.50, so the gross margin is above 90%. The real costs are hosting, payment fees and getting users.

### 8.3 Market size

Fill this in with sourced figures before presenting. Don't use made-up numbers.

- **TAM:** worldwide spending on idea validation, startup advisory and decision-support tools.
- **SAM:** early-stage founders, student innovators and product teams who already use AI tools.
- **SOM:** a realistic first-year share, for example X university incubators and Y founder communities reached through launches and partnerships.

## 9. Competitive Landscape

| Alternative | Weakness | DecisionnX's answer |
| --- | --- | --- |
| Asking a single chatbot | One perspective, agreeable by default, no structure | A panel of independent experts plus a Critic, with disagreements shown openly |
| Role-playing experts in one chat by hand | Slow, depends on prompting skill, roles bleed into each other | Isolated expert prompts that run in parallel, chosen automatically for the idea's domain |
| Mentors and consultants | Expensive, slow to book, limited availability | Minutes instead of weeks, at a fraction of a cent per run; best used before meeting a mentor, not instead of one |
| Generic idea-scoring templates | Static checklists that ignore the idea's domain | Experts and custom personas fitted to each idea, with a concrete action plan |

## 10. Presentation Outline

A suggested 12-slide deck, with the section that has the material for each slide:

1. **Title:** DecisionnX, an AI boardroom for your ideas (section 1)
2. **Problem:** one AI answer is one perspective, and real expert reviews are slow and expensive (README "Why DecisionnX?")
3. **Solution:** a panel of experts, then a boardroom verdict (section 1, README "How It Works")
4. **How it works:** the 5-step pipeline diagram (section 3)
5. **Prototype:** screenshots in `images/` and the live demo (section 7)
6. **Output:** score, verdict, SWOT, disagreements, action plans (section 3, step 4)
7. **Technology:** stack and architecture (section 2)
8. **Target audience:** segments and beachhead (section 6)
9. **Competition** (section 9)
10. **Financials:** cost per evaluation and unit economics (section 8.1)
11. **Business model and roadmap** (section 8.2, README "Roadmap")
12. **Team and ask:** Shushant, Aditya and Lakshit
