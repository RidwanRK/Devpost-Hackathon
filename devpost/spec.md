---
doc: spec
status: approved
---

# StudyFlow AI — Technical Spec

## How This Works, In Plain Language
StudyFlow AI is three pieces that talk to each other, plus one outside AI service.

- **The website (Next.js / React).** What the student sees and clicks: the setup steps, the dashboard, the replan review. It never talks to the database or the AI directly. It only asks the backend for things.
- **The backend (Node.js + Express).** The "brain room". It receives every request from the website, reads and writes the database, and is the **only** place that talks to the AI. Your AI key lives here, never in the browser.
- **The database (MongoDB Atlas).** One saved study plan for the whole app: subjects, topics, availability, the sessions, and the student's progress. There are no accounts, so there is exactly one plan, the "demo plan".
- **The AI (Google Gemini, free tier).** Gets asked to make the *judgment calls*: what to study first, what to shorten, what to leave out, and why. It answers in **structured JSON** (a fixed shape of data, not free text).

The most important idea: **the AI proposes, the backend checks.** The AI is good at judgment and explanation but can make mistakes, so every AI answer goes through a validator that enforces the hard rules (no day over its hours, nothing after the exam, nothing in the past, and so on). If the proposal breaks a rule, the student never sees it. This is the heart of the "integrating AI" lesson, and the part most worth understanding.

Why this shape and not something bigger: one plan, no logins, one database document, one AI call per plan or replan, with at most one additional repair attempt if validation fails. Each extra piece (accounts, real-time sync, streaming responses, separate AI services) would add work without helping prove that the plan adapts.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey` and `prd.md > Canonical Demo Scenario`. The POC critical path is: **Setup → Generate Plan → Miss/Partially Complete → Replan → Review → Accept.**

1. **Setup.** The student fills the onboarding steps in the website. When they click **Generate My Study Plan**, the website sends their subjects, topics and availability to the backend, which saves them in the database.
2. **Generate.** The backend works out, for each day until the exam, how many minutes are available, and asks Gemini to place the topics into those days, weakest and most urgent first. Gemini answers in JSON. The validator checks it. If it passes, the backend saves the sessions and the website shows the dashboard.
3. **Work the plan.** Clicking Completed / Skipped / Partially Completed (plus time spent and confidence) sends a small update to the backend, which saves it.
4. **Fall behind.** Nothing happens in the system; a day simply passes. The website shows any past, unmarked session as **Unconfirmed** (worked out from the date, not stored).
5. **Replan.** The student clicks Replan. If there are Unconfirmed sessions, the website shows the confirmation step *first*. Then it calls the backend, which: works out the remaining work per topic and the minutes available per remaining day, sends all of that to Gemini, validates the JSON answer (one automatic repair attempt if it breaks a rule), and builds the list of **affected sessions** by comparing old against new. The proposal is saved as "pending" in the database and sent to the website.
6. **Review.** The website shows only the affected sessions (original → revised), the Not scheduled list with reasons, the explanation, and the numbers (time needed vs. time available, which the *backend* calculates, not the AI).
7. **Accept / Keep original.** Accept tells the backend to swap the pending sessions into the active plan. Keep original discards the pending proposal. Either way the database is updated and the dashboard refreshes.

## Stack
The learner chose the MERN family with Next.js as the frontend, MongoDB Atlas, and the Gemini free tier. Details marked *(verify)* are from memory and must be checked early in the build (see Decisions and Open Issues).

| Piece | Choice | Why / tradeoff accepted |
|---|---|---|
| Frontend | **Next.js** (App Router, React, plain JavaScript), used as a React app that calls the Express API | Learner's choice. Tradeoff: two servers to run (Next.js and Express). Next.js's own API routes are *not* used, so the backend stays a real Express service. Docs: https://nextjs.org/docs, https://react.dev |
| Backend | **Node.js + Express** (ES modules) | Learner's choice; real backend API practice. Docs: https://expressjs.com |
| Database | **MongoDB Atlas** free (M0) cluster, via **Mongoose** | Learner's choice, for real persistence and data-modeling practice. Docs: https://www.mongodb.com/docs/atlas/ , https://mongoosejs.com/docs/ |
| AI | **Google Gemini API, targeting a currently available free-tier model**, called from the backend with the official JS SDK `@google/genai` *(verify package name and model)* | Learner needs it free. Tradeoff: free-tier availability, models, and rate limits can change. The provider is isolated in one module so it can be swapped if necessary. Docs: https://ai.google.dev/gemini-api/docs |
| Validation | **Zod** for checking the AI's JSON shape; plain functions for the scheduling rules | Docs: https://zod.dev |
| Dev tools | `dotenv`, `cors`, `concurrently` (start both servers with one command) | Standard helpers |
| Tests | Node's built-in test runner (`node --test`) for the validator and scheduling helpers | No test framework to install |
| Language | Plain **JavaScript** everywhere *(my default, not yet a learner decision; say so if you want TypeScript)* | Less setup friction for a 2–4 hour build |
| Styling | Plain CSS with CSS variables (no UI framework) | Matches the exact palette from the PRD and avoids generic look |

**Unverified, check first in the build:** current Next.js version and App Router defaults; the exact Gemini model name (default guess `gemini-2.5-flash`, kept in an environment variable so it is one line to change); the `@google/genai` call shape for JSON-schema output; the free tier's rate limits; and that a free Atlas M0 cluster can be created.

## Where It Runs and How Someone Tries It
**Local first. Deployment is optional and never blocks the POC.**

Requirements: Node.js (current LTS), a free MongoDB Atlas cluster (connection string), a free Gemini API key. Never paste keys into chat; they go only in `server/.env`.

Setup (documented in `README.md`):
1. `npm install` at the root (installs both apps via workspaces or a root script).
2. Copy `server/.env.example` to `server/.env` and fill in `MONGODB_URI`, `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`).
3. `npm run dev` starts **Express on http://localhost:4000** and **Next.js on http://localhost:3000**.
4. Open **http://localhost:3000**.

For the required demo video: run locally, open the app, use **Start Over**, then follow `prd.md > Canonical Demo Scenario` (using the Demo Clock to move to Day 2). Screen-record that.

Submission requires a **short demo video** and a **public GitHub repository** with an **open-source license** (a `LICENSE` file; MIT is the simple default, confirm in `6-ship`). Deployment is optional and never a substitute for the video. If the POC is stable, a possible split is the Next.js app on one free host and Express on another, with Atlas unchanged *(unverified; decide in `6-ship`, check free-tier terms then)*. Deploying needs `CLIENT_ORIGIN` and `NEXT_PUBLIC_API_URL` set to the live URLs, and keys stored in the host's environment settings, never in the repo.

## Look and Feel
Carried forward from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`. Do not re-interview.
- **Palette (CSS variables):** warm off-white background (`--bg: #faf7f2`), deep navy text (`--ink: #14233f`), restrained teal for progress and completed (`--teal: #1f8a78`), muted amber and a soft red only for Unconfirmed and Not scheduled chips. Same palette as the PRD page.
- **Typography:** one clean modern sans (Inter via `next/font`, or the system UI font as the fallback), clear heading sizes, generous line height.
- **Density and energy:** spacious, calm, plenty of whitespace; Linear-style clarity: thin borders, little shadow, small status chips, no card for every item.
- **Tone of copy:** plain, supportive, honest. Use the PRD's exact messages ("You're on track!…", "We couldn't generate your revised plan…").
- **Avoid:** gradients, glows, floating AI icons, unnecessary cards, a futuristic look.
- Plain CSS can honor all of this exactly; there is no framework to fight.

## Components

### Frontend: App shell and view switching
One page. Asks the backend for the plan on load; shows **Onboarding** if there is none, otherwise the **Dashboard**. Holds the current plan in memory only (the database is the source of truth).
PRD ref: `prd.md > States and Boundaries` (First use, After Start Over, What persists).

### Frontend: OnboardingFlow
Step-by-step: welcome → subjects → exam date and topics (name, estimated time, difficulty 1–5, confidence 1–5) → availability (weekday and weekend defaults, per-day overrides) → **Generate My Study Plan**. Validates ranges (1–5) before sending.
PRD ref: `prd.md > Setup and availability`, `prd.md > Screens and Layout`.

### Frontend: Dashboard
Today's sessions as the main focus, each with subject, topic, duration, priority, status; a simple overview from today to the last exam; upcoming exams; completed vs. unfinished progress; the **Replan My Schedule** button; links to Settings / Edit and Start Over; and the **Not scheduled** list when present.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Plan generation`, `prd.md > Session tracking`.

### Frontend: SessionCard
Shows one session and its actions: Completed / Skipped / Partially Completed, actual minutes, and a confidence (1–5) update when completing or partially completing. Shows "Unconfirmed" for past planned sessions (derived from the date).
PRD ref: `prd.md > Session tracking`, `prd.md > Unconfirmed sessions`.

### Frontend: SettingsPanel
Edit availability, subjects, exam dates, and topics (add a topic, change an exam date, change difficulty/confidence). Saving marks the plan as "edited since last generated" so the next replan knows a change happened.
PRD ref: `prd.md > Setup and availability` (editing after setup).

### Frontend: ReplanConfirmDialog
Appears when Replan is clicked and Unconfirmed sessions exist. Lists them; lets the student mark each; offers **Replan with these updates**, **Replan anyway (treat the rest as missed)**, and **Cancel**. Skipped entirely when there are none.
PRD ref: `prd.md > Unconfirmed sessions`.

### Frontend: ReplanReview
Loading state, then: affected sessions as original → revised, the Not scheduled list with reasons, the app-calculated numbers, the AI explanation, and **Accept revised plan** / **Keep original**. Also renders the on-track message and the failure message with **Retry**.
PRD ref: `prd.md > Replan My Schedule`, `prd.md > Not enough time (honest trade-offs)`, `prd.md > States and Boundaries`.

### Frontend: DemoClockControl
A small, clearly labeled **Demo clock** that shows the "app date" and has an **Advance one day** button, so the canonical scenario (Day 1 missed, replan on Day 2) can be recorded in a single sitting. The backend uses this app date everywhere it would use "today".
PRD ref: `prd.md > Canonical Demo Scenario`. *This control is new and not in the PRD; see Decisions and Open Issues.*

### Frontend: StartOver
A confirmed button that deletes the plan and returns to onboarding. Also resets the demo clock.
PRD ref: `prd.md > Start Over (Reset Demo)`.

### Frontend: API client (`lib/api.js`)
One small module that wraps `fetch` calls to the Express API and turns errors into the PRD's friendly messages. All backend calls go through here.

### Backend: Routes (`routes/`)
Thin Express handlers that read the request, call a service, and return JSON. They do not hold business rules. Endpoint list under External Services and Dependencies.

### Backend: PlanStore (`models/StudyPlan.js`)
The Mongoose model and small helpers to load, save and clear the one plan document.
PRD ref: `prd.md > States and Boundaries` (What persists).

### Backend: Scheduling helpers (`services/scheduling.js`)
Pure functions with no database or AI: today's app date; minutes available per date (from per-weekday availability, from today to each subject's exam date); remaining minutes per topic (estimated minus credited time from completed/partial sessions); which sessions are Unconfirmed; summary numbers (time needed vs. time available).
PRD ref: `prd.md > Plan generation`, `prd.md > Session tracking`, `prd.md > Not enough time`.

### Backend: AI planner (`services/aiPlanner.js`)
Builds the prompt and the JSON schema, calls Gemini once, parses the result, and returns the proposal. One function with two modes, `generate` and `replan`, so initial plans and replans use the same code path. It never decides whether a proposal is acceptable; that is the validator's job. If the validator rejects a proposal, it is called **once more** with the list of broken rules appended to the prompt (the "repair attempt"); a second failure is reported as a failed replan.
PRD ref: `prd.md > Plan generation`, `prd.md > Replan My Schedule` (Who decides what).

### Backend: Validator (`services/validator.js`)
Pure, unit-tested functions that check an AI proposal against the hard rules, returning a list of broken rules (empty = valid):
1. The JSON has the expected shape (Zod).
2. No day's scheduled minutes exceed that day's available minutes.
3. No session is dated after its subject's exam date, or before today.
4. No topic is scheduled for more minutes than its remaining work.
5. Every topic with remaining work is either scheduled (fully or shortened) or listed in `notScheduled` with a reason.
6. The summary numbers the AI echoed (`neededMinutes`, `availableMinutes`) equal the ones the backend calculated.
7. Every `topicId` refers to a real topic.
PRD ref: `prd.md > Replan My Schedule` (the enforced rules).

### Backend: Replan workflow (`services/replan.js`)
Orchestrates the replan: the cheap "already on track" check (nothing missed, partial, unconfirmed or edited since the last plan, so no AI call); gather inputs; call the AI planner; validate with one repair attempt; compute the **affected sessions** by comparing old and new per topic; save the pending proposal; and later accept or discard it. If the AI's proposal produces no differences, it returns "on track".
PRD ref: `prd.md > Replan My Schedule`, `prd.md > Unconfirmed sessions`, `prd.md > States and Boundaries` (Replan not needed, Replan failed).

## Data Model
One MongoDB collection, `studyplans`, with **one document** (a fixed key, since there is no login). All time values are in **minutes**; dates are `YYYY-MM-DD` strings. The document is embedded rather than split into many collections: simpler, atomic to save, and enough for one plan *(my recommendation; the alternative is separate collections for subjects, topics and sessions, which is closer to a "real" relational feel but adds queries and joins for no demo benefit)*.

```
StudyPlan {
  key: "demo"                                  // fixed, one document only
  demoDayOffset: Number                        // demo clock: days added to the real date
  availability: { mon, tue, wed, thu, fri, sat, sun }   // minutes per weekday
  subjects: [ { id, name, examDate,
                topics: [ { id, name, estimatedMinutes, difficulty (1-5), confidence (1-5) } ] } ]
  sessions: [ { id, topicId, date, plannedMinutes, priority ("high"|"medium"|"low"),
                status ("planned"|"completed"|"skipped"|"partial"),
                actualMinutes (nullable), confidenceAfter (nullable 1-5) } ]
  notScheduled: [ { topicId, minutes, reason } ]
  explanation: String                          // the last accepted/generated AI explanation
  editedSinceLastPlan: Boolean
  pendingReplan: null | { sessions, notScheduled, affected, summary, explanation, createdAt }
}
```

For each piece of data (where it lives, how it updates, what happens when you leave and come back):
- **Subjects, topics, availability:** in the document; updated by setup and Settings / Edit; still there when you return.
- **Sessions and progress:** in the document; updated when the student marks a session; still there on return.
- **"Unconfirmed":** *not stored*. It is worked out each time: a session whose date is before the app date and whose status is still "planned".
- **Credited work:** completed sessions credit their actual minutes (or planned minutes if none entered); partial sessions credit actual minutes; skipped and Unconfirmed credit nothing. Remaining work for a topic is its estimate minus the credited minutes.
- **Pending replan:** in the document so a page refresh doesn't lose the review; discarded by Keep original, Start Over, or a new replan; promoted by Accept.
- **Accept** replaces all sessions that are still "planned" and dated today or later with the proposal's sessions, and keeps all history. Past Unconfirmed sessions stay Unconfirmed.
- **Start Over** deletes the document.

**Actual-time rules:** `actualMinutes` must be between 0 and `plannedMinutes`. A completed session with no actual time entered credits its `plannedMinutes`. A partially completed session requires `actualMinutes` and credits exactly that amount toward the topic's remaining work. This keeps remaining-work calculations predictable and prevents progress from exceeding the planned session time. The backend enforces these rules.

## File Structure
```
studyflow-ai/                      # this project folder
├── client/                        # Next.js app (App Router, plain JS)
│   ├── app/
│   │   ├── layout.js              # fonts, global CSS import
│   │   ├── page.js                # App shell: Onboarding vs Dashboard
│   │   └── globals.css            # palette variables + base styles
│   ├── components/
│   │   ├── OnboardingFlow.js
│   │   ├── Dashboard.js
│   │   ├── SessionCard.js
│   │   ├── SettingsPanel.js
│   │   ├── ReplanConfirmDialog.js
│   │   ├── ReplanReview.js
│   │   ├── DemoClockControl.js
│   │   └── StartOver.js
│   ├── lib/api.js                 # fetch wrapper for the Express API
│   ├── .env.local.example         # NEXT_PUBLIC_API_URL
│   └── package.json
├── server/                        # Express API
│   ├── src/
│   │   ├── index.js               # start server, connect to Atlas
│   │   ├── app.js                 # Express app, CORS, routes
│   │   ├── routes/plan.js         # all /api endpoints
│   │   ├── models/StudyPlan.js    # Mongoose model
│   │   └── services/
│   │       ├── scheduling.js      # dates, availability, remaining work (pure)
│   │       ├── validator.js       # hard-rule checks (pure)
│   │       ├── aiPlanner.js       # prompt + Gemini call + JSON schema
│   │       └── replan.js          # replan workflow, affected-session diff
│   ├── scripts/ai-smoke.js        # one-off: prove the Gemini call returns valid JSON
│   ├── test/                      # node --test: validator, scheduling, canonical scenario
│   │   ├── validator.test.js
│   │   ├── scheduling.test.js
│   │   └── fixtures/canonical.js  # the PRD demo scenario as data (test only)
│   ├── .env.example               # MONGODB_URI, GEMINI_API_KEY, GEMINI_MODEL, PORT, CLIENT_ORIGIN
│   └── package.json
├── devpost/                       # Devpost learning workspace
├── package.json                   # root scripts: install, dev (runs both), test
├── .gitignore
├── LICENSE                        # open-source license (MIT default, confirm in 6-ship)
└── README.md                      # setup and how to run/demo
```

## External Services and Dependencies
All doc links below; limits and cost marked *(verify)* are from memory.

**Backend API (Express, base `http://localhost:4000/api`)**
| Method + path | Purpose | PRD ref |
|---|---|---|
| `GET /plan` | The plan (or `null`), with the app date and derived Unconfirmed list | `prd.md > States and Boundaries` |
| `PUT /setup` | Save subjects, topics, availability (create or replace) | `prd.md > Setup and availability` |
| `POST /plan/generate` | Ask the AI for the first plan, validate, save sessions | `prd.md > Plan generation` |
| `PATCH /sessions/:id` | Set status, actual minutes, confidence | `prd.md > Session tracking` |
| `PATCH /settings` | Edit availability, subjects, exam dates, topics | `prd.md > Setup and availability` |
| `POST /replan` | Body: `{ treatUnconfirmedAsMissed: boolean }`. Returns `{ status: "on_track" }`, `{ status: "proposal", ... }`, or an error | `prd.md > Replan My Schedule` |
| `POST /replan/accept` | Make the pending proposal the active plan | `prd.md > Replan My Schedule` |
| `POST /replan/discard` | Keep original; drop the pending proposal | `prd.md > Replan My Schedule` |
| `DELETE /plan` | Start Over | `prd.md > Start Over (Reset Demo)` |
| `POST /demo/advance-day` | Demo clock +1 day | `prd.md > Canonical Demo Scenario` |

**MongoDB Atlas.** Free M0 cluster, one database user, network access allowed from your IP (or temporarily anywhere for local dev). Connection string in `MONGODB_URI`. Docs: https://www.mongodb.com/docs/atlas/ . Cost: free tier *(verify)*.

**Google Gemini API.** Called only from `aiPlanner.js` with `@google/genai` *(verify)*. One request per plan or replan (plus at most one repair attempt). The request asks for JSON that matches a schema: `responseMimeType: "application/json"` plus a response schema *(verify exact field names)*. Docs: https://ai.google.dev/gemini-api/docs , structured output https://ai.google.dev/gemini-api/docs/structured-output , rate limits https://ai.google.dev/gemini-api/docs/rate-limits , pricing https://ai.google.dev/gemini-api/docs/pricing . Key in `GEMINI_API_KEY`. Cost: free tier with rate limits *(verify; also check whether free-tier prompts may be used to improve Google's products, and avoid putting anything private in them)*.

**AI request and response shape (the contract).** The backend sends: the app date; each topic's id, name, subject, exam date, difficulty, confidence and remaining minutes; the list of dates with available minutes for each; what happened (missed, partial, unconfirmed-treated-as-missed) for context; and the current future sessions. The AI must return:
```
{
  "sessions":     [ { "topicId", "date", "minutes", "priority" } ],
  "notScheduled": [ { "topicId", "minutes", "reason" } ],
  "changes":      [ { "topicId", "kind": "moved|shortened|prioritized|unchanged", "reason" } ],
  "summary":      { "neededMinutes", "availableMinutes" },
  "explanation":  "plain-language paragraph"
}
```
The schema is kept flat and simple because model JSON-schema support can be limited *(verify)*. The backend does all calendar arithmetic and passes per-date capacities in, so the AI does not have to count days.

**Other packages:** `express` https://expressjs.com , `mongoose` https://mongoosejs.com/docs/ , `zod` https://zod.dev , `cors`, `dotenv`, `concurrently` (npm pages), `next` and `react` (links above).

## Important Failure Modes
- **Gemini is slow, rate-limited, or down** → the original plan stays unchanged; the student sees "We couldn't generate your revised plan. Your current schedule is safe—please try again." with **Retry**. Server uses a request timeout. No progress is lost. *(PRD: Replan failed.)*
- **The AI returns invalid or rule-breaking JSON** → one automatic repair attempt with the broken rules listed; if it still fails, the same failure message and Retry. The bad proposal is never shown or saved. *(PRD: proposal broke a rule.)*
- **The backend or Atlas can't be reached** → the website shows a plain "Can't reach the server. Check that it is running." message and keeps what is on screen; nothing is half-saved because each change is a single save to one document.
- **Replan clicked when nothing changed** → the app answers "You're on track!" without calling the AI, and also if the AI's proposal turns out identical to the current plan.

## What Was Simplified and Why
- **One embedded document, no accounts** instead of separate collections and logins: one anonymous demo plan is enough to prove adaptation. Accounts would add sign-up, sessions and per-user data.
- **Next.js used only as a React frontend; Express does all backend work** instead of Next.js API routes: keeps a real, separate backend as the learner wants, at the cost of running two servers.
- **One AI code path for generate and replan** instead of a separate hand-written scheduler: less code, same validator, and the first plan exercises the same integration the replan depends on. Cost: even the first plan needs the AI and the free-tier limits apply.
- **No streaming, no queues, no background jobs:** the AI call is one request with a loading state.
- **Backend computes the numbers and the affected-session diff** instead of trusting the AI: removes a whole class of wrong-number bugs.
- **Demo clock** instead of waiting a real day: the "Unconfirmed → replan" flow can be recorded in one sitting. This is simulated time and is labeled as such in the UI. The real behavior (comparing session dates to the app date) is unchanged.
- **Plain CSS, plain JavaScript, no UI kit, no TypeScript:** fewer moving parts for a short build.
- **Test-only fixture for the canonical scenario:** automated tests use a *canned* AI response so the validator and diff can be checked without spending the free-tier quota. It is never used in the running app, and the live demo always calls the real AI.

## Decisions and Open Issues
**Learner decisions:**
- **MERN with Next.js frontend, Express backend, MongoDB Atlas (no auth, one anonymous plan)** — for real full-stack practice; accepted tradeoff: two servers plus an Atlas account.
- **Gemini free tier for AI** — must be free; accepted tradeoff: rate limits and free-tier terms that may change. Provider is isolated in one module so it can be swapped.
- **AI proposes; the backend validates; AI returns structured JSON** — learner's design: the application enforces hard constraints, validates output, prevents invalid schedules, and persists only accepted plans.
- **Local first, deployment optional; public repo, open-source license, short demo video** — deployment never blocks the POC.
- **Learning focus: everything about AI integration** (see below).

**Implementation details derived from those decisions (not separate learner choices):** one embedded document; minutes as the unit; Mongoose and Zod; plain JavaScript and CSS; the endpoint list; the repair-attempt retry; credited-work rules.

**Agreed by the learner at approval ("looks good") — my additions:**
1. **Demo clock.** A small labeled control that advances the app date by one day. Without it the canonical scenario (miss Day 1, replan on Day 2) can't be shown in one sitting. It is not in the PRD; if you'd rather not have it, the alternative is a seed script that inserts the scenario already at Day 2, labeled as sample data.
2. **JavaScript, not TypeScript**, and **one embedded document**, as described above.
3. **Auto repair attempt** (one retry with the broken rules listed) before showing the failure message.

**The one learner uncertainty: "everything about AI integration."** That is too large for a build step, so the agreed small investigation is a **smoke script** (`server/scripts/ai-smoke.js`) run in the first build slice. It sends the canonical scenario to Gemini with the JSON schema, prints the raw answer, runs it through the validator, and also runs a deliberately broken answer through the validator to see it get rejected. Evidence it worked: a valid answer passes, a broken one is rejected with the specific rule named, and the learner can say in their own words why the AI's answer is never trusted directly. The same slice verifies the *(verify)* items above. `5-build`'s learning wrap-up will use this.

**Still unresolved / carried to build:**
- The *(verify)* items under Stack and External Services.
- Choice of license (MIT default) and any optional hosting: decide in `6-ship`.
- Handling session time: a completed session may omit actual time and then credits its planned minutes; a partially completed session must include actual minutes between 0 and its planned duration. These rules are enforced by the backend.
- Open questions carried from `prd.md > Open Questions`: none remaining.
