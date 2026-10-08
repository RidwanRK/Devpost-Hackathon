---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [ ] **1. The AI's plan is proven, and a bad plan is rejected**
  Becomes usable: A runnable proof, from the terminal, that the canonical scenario (Database Systems, 6 hours needed, 3 days of 2 hours) goes to Gemini, comes back as valid JSON, passes the validator, and that a deliberately broken answer is rejected with the specific rule named.
  Why now: The AI call is the biggest unknown and the whole learning goal. If Gemini's free tier, model name, or structured-output shape doesn't behave as the spec assumed, we find out before building anything on top of it. Project bootstrap lives here (root and `server/` packages, env handling) instead of being its own step.
  PRD ref: `prd.md > Plan generation`, `prd.md > Replan My Schedule` (Who decides what, the enforced rules), `prd.md > Canonical Demo Scenario`
  Spec ref: `spec.md > Stack` (the *verify* items), `spec.md > File Structure`, `spec.md > Components` (Scheduling helpers, AI planner, Validator), `spec.md > External Services and Dependencies` (AI request and response shape), `spec.md > Decisions and Open Issues` (the smoke script)
  Build: Create the root `package.json` (npm workspaces) and `server/` package with `.env.example`; add `services/scheduling.js` (app date, available minutes per date from today up to the day before each exam, remaining minutes per topic, Unconfirmed, summary numbers), `services/validator.js` (Zod shape plus the seven hard rules, returning a list of broken rules), `services/aiPlanner.js` (prompt, JSON schema, one Gemini call, `generate` and `replan` modes), the canonical fixture `test/fixtures/canonical.js`, and `scripts/ai-smoke.js`. Verify and fix the *(verify)* items (package name, model name, schema field names).
  Verify (mechanical): `node --test` passes for the validator and scheduling helpers (including a case per broken rule); `node server/scripts/ai-smoke.js` calls Gemini with the canonical scenario, prints the raw JSON, reports it valid, then reports a hand-broken answer as rejected with the named rule.
  Learner check: Put your Gemini key in `server/.env`, run the smoke script, and tell me in your own words why the first answer was accepted and the broken one rejected, and why the AI's answer is never trusted directly.
  Commit: `Add scheduling helpers, validator and Gemini smoke script`

- [ ] **2. Enter the demo scenario in the browser and get a saved plan**
  Becomes usable: Open the app, go through the step-by-step setup (subjects, exam date and topics, availability), click Generate My Study Plan, and land on a dashboard showing today's sessions and upcoming exams. Refresh the page and the plan is still there.
  Why now: The first full path through all three pieces (website, Express, Atlas, plus the AI). It makes the app real, gives the learner something to try and react to, and everything after this builds on a saved plan.
  PRD ref: `prd.md > The Core Journey` (steps 1-3), `prd.md > Setup and availability`, `prd.md > Plan generation`, `prd.md > Screens and Layout` (Onboarding flow, Dashboard), `prd.md > States and Boundaries` (First use, Normal use, What persists), `prd.md > Look and Feel`
  Spec ref: `spec.md > Components` (App shell, OnboardingFlow, Dashboard, API client, Routes, PlanStore), `spec.md > Data Model`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`
  Build: Express app and Atlas connection (`index.js`, `app.js`), `models/StudyPlan.js`, `routes/plan.js` with `GET /plan`, `PUT /setup`, `POST /plan/generate` (AI plan validated, one repair attempt, then saved); Next.js `client/` with `globals.css` palette, `layout.js`, `page.js` shell, `OnboardingFlow`, a first `Dashboard` (today's sessions, overview to the last exam, upcoming exams) and `lib/api.js`; root `npm run dev` runs both servers.
  Verify (mechanical): `npm run dev` starts both servers with no errors; `GET /api/plan` returns `null` first; submitting the canonical setup through the API (or the UI) returns a saved plan whose sessions pass the validator; restarting both servers and calling `GET /api/plan` returns the same plan from Atlas; the Next.js page builds and loads without console errors.
  Learner check: Run `npm run dev`, open http://localhost:3000, enter the canonical Database Systems scenario, generate the plan, refresh the page, and tell me whether it looks and feels the way you pictured it.
  Commit: `Add setup flow, plan generation and saved dashboard`

- [ ] **3. Mark sessions and watch missed ones become Unconfirmed**
  Becomes usable: On the dashboard each session can be marked Completed, Skipped or Partially Completed, with actual time and an updated confidence. A Demo clock button advances the app date by one day, and a past, unmarked session then shows as Unconfirmed.
  Why now: The replan needs real progress to react to, and the Demo clock is how the canonical "Day 1 missed, Day 2 replan" scene can exist in one sitting. It has to be in place before the kernel is built.
  PRD ref: `prd.md > Session tracking`, `prd.md > Unconfirmed sessions` (display), `prd.md > Canonical Demo Scenario` (What goes wrong)
  Spec ref: `spec.md > Components` (SessionCard, DemoClockControl, Scheduling helpers), `spec.md > Data Model` (Unconfirmed, Credited work, Actual-time rules), `spec.md > External Services and Dependencies` (`PATCH /sessions/:id`, `POST /demo/advance-day`)
  Build: `PATCH /sessions/:id` with the actual-time rules enforced (0 to planned, partial requires actual time), `POST /demo/advance-day`, app date used everywhere "today" is needed, `SessionCard` and `DemoClockControl`, Unconfirmed derived from date, completed vs. unfinished progress on the dashboard.
  Verify (mechanical): Backend tests cover the actual-time rules (reject partial without time, reject actual over planned, accept completed with no time and credit planned minutes) and the credited-work/remaining-minutes numbers; calling `advance-day` makes an unmarked Day 1 session appear in the derived Unconfirmed list; a status change survives a server restart.
  Learner check: Mark one session Partially Completed with some time and a new confidence, advance the demo clock a day, and confirm an unmarked session now says Unconfirmed and your marked ones kept their status after a refresh.
  Commit: `Add session tracking, demo clock and Unconfirmed state`

- [ ] **4. Replan the canonical scenario and accept the revised plan**
  Becomes usable: The unique kernel. Day 1 Transaction Scheduling is missed; Replan My Schedule shows the Unconfirmed confirmation step, then (after a loading state) only the affected sessions original → revised, the Not scheduled topic with its reason, the app-calculated 6 hours needed vs. 4 available, and the AI's explanation; Accept swaps the plan, Keep original discards it.
  Why now: This is the reason the product exists, and it is the most AI-dependent part. It comes straight after the pieces it needs, ahead of any polish or secondary features, so the kernel is proven early.
  PRD ref: `prd.md > Replan My Schedule`, `prd.md > Unconfirmed sessions`, `prd.md > Not enough time (honest trade-offs)`, `prd.md > Canonical Demo Scenario`
  Spec ref: `spec.md > Components` (Replan workflow, AI planner, Validator, ReplanConfirmDialog, ReplanReview), `spec.md > Data Model` (Pending replan, Accept), `spec.md > External Services and Dependencies` (`POST /replan`, `/replan/accept`, `/replan/discard`)
  Build: `services/replan.js` (gather inputs, call the AI planner, validate with one repair attempt, compute affected sessions old vs. new, save as pending, accept and discard), the three replan routes, `ReplanConfirmDialog` (mark each Unconfirmed, Replan with updates / Replan anyway / Cancel), `ReplanReview`, the Not scheduled list on the dashboard, and an offline test that runs the canonical fixture through the diff, validator and accept logic.
  Verify (mechanical): `node --test` passes the canonical scenario with the canned AI response (affected sessions are exactly Transaction Scheduling → Day 2, Normalization → Day 3, Database Architecture → Not scheduled; numbers 6 vs. 4; accept replaces only future planned sessions and keeps history); then the live run against Gemini through the API returns a validator-passing proposal.
  Learner check: Run the demo scenario for real: generate the plan, leave Day 1 unmarked, advance the clock, click Replan My Schedule, choose Replan anyway, read the review, and Accept. Tell me whether the plan clearly responded to what you actually did.
  Commit: `Add replan workflow, review screen and accept/keep`

- [ ] **5. Replan stays honest when things go wrong**
  Becomes usable: Replan tells you "You're on track!" without calling the AI when nothing changed; if Gemini is down, slow, or returns a rule-breaking plan twice, you see the friendly failure message with Retry and your original plan is untouched.
  Why now: These are the trust moments in the PRD. They are small once the replan workflow exists, and they can't be tested until it does.
  PRD ref: `prd.md > States and Boundaries` (Replan not needed, Replan failed), `prd.md > Replan My Schedule` (broken-rule proposals are never shown)
  Spec ref: `spec.md > Components` (Replan workflow, ReplanReview), `spec.md > Important Failure Modes`
  Build: The cheap on-track check (nothing missed, partial, Unconfirmed or edited), on-track if the AI's proposal differs in nothing, request timeout, repair attempt with failure fallback, the on-track and failure states with Retry in `ReplanReview`, and the "Can't reach the server" message in `lib/api.js`.
  Verify (mechanical): Tests show the on-track check makes no AI call; a stubbed AI returning a broken plan twice yields a failure with the active plan unchanged and nothing saved as pending; a stubbed failure on the first try and a valid second try succeeds via the repair path; stopping the Express server shows the friendly connection message in the UI.
  Learner check: Click Replan with a fully on-track plan and confirm you see "You're on track!". Then temporarily put a wrong Gemini key in `server/.env`, click Replan after missing a session, and confirm you see the failure message with Retry and your plan unchanged.
  Commit: `Add on-track, failure and retry handling to replan`

- [ ] **6. Edit your plan inputs and Start Over**
  Becomes usable: From Settings / Edit you can change availability, add a topic, change an exam date, and update difficulty or confidence, and the next replan uses those edits. Start Over clears everything (and resets the demo clock) after a confirmation.
  Why now: Both are PRD-required but they sit around the critical path, so they come after it is solid. Start Over is also what makes repeated demo recordings practical.
  PRD ref: `prd.md > Setup and availability` (editing after setup), `prd.md > Start Over (Reset Demo)`
  Spec ref: `spec.md > Components` (SettingsPanel, StartOver), `spec.md > Data Model` (`editedSinceLastPlan`), `spec.md > External Services and Dependencies` (`PATCH /settings`, `DELETE /plan`)
  Build: `PATCH /settings` setting `editedSinceLastPlan`, `SettingsPanel`, `DELETE /plan`, `StartOver` with a confirmation, and making an edited plan count as "changed" so Replan doesn't say on-track.
  Verify (mechanical): Tests/API calls show an exam-date or topic edit is saved, sets the edited flag, and that Replan then goes to the AI; `DELETE /plan` leaves `GET /plan` returning `null` and the clock back at zero.
  Learner check: Add a topic and change another topic's confidence in Settings, click Replan and confirm it doesn't say on-track; then use Start Over, confirm, and check that you're back at the welcome screen.
  Commit: `Add settings editing and Start Over`

- [ ] **7. Run the whole demo from a fresh start using the README**
  Becomes usable: Anyone (and the learner on a fresh clone) can follow the README, run the app, and reproduce the canonical demo scenario end to end with a calm, polished look matching the PRD.
  Why now: Last, because it is verification and polish across everything built, plus the setup notes `6-ship` will need for the demo video and public repository.
  PRD ref: `prd.md > Canonical Demo Scenario` (Acceptance test), `prd.md > Look and Feel`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`, `spec.md > File Structure` (`README.md`, `.env.example`, `.env.local.example`)
  Build: `README.md` (what it is, requirements, setup, how to run the demo scenario, the AI-proposes/backend-validates idea), final `.env.example` files, a visual pass against the Look and Feel (palette, spacing, chips, copy) without adding features. `LICENSE` is left for `6-ship`.
  Verify (mechanical): `npm test` passes; from a clean `npm install` and the README steps, both servers start; the full canonical scenario (Start Over → setup → generate → leave Day 1 unmarked → advance → replan anyway → accept) runs against the live AI and ends with the expected revised plan and Not scheduled entry; no secrets appear in tracked files.
  Learner check: Follow only the README on your own, run the canonical scenario start to finish, and tell me anything confusing, awkward, or off-look.
  Commit: `Add README and polish for the canonical demo`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (setup to saved dashboard in the browser)
- [ ] Core journey explored — after slice 4 (first time the unique kernel works end to end)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions

