---
doc: prd
status: approved
---

# StudyFlow AI — Product Requirements

An exam-study planner for university students whose plan adapts, honestly, when they fall behind.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`, `scope.md > The POC Boundary`.

## The Core Journey
1. **Arrive (first time).** The student opens StudyFlow AI and sees a welcoming onboarding screen explaining that the app will build a realistic study plan from their exams, topics and available time.
2. **Set up, step by step.** A guided flow (not one long form):
   1. Add **subjects** (e.g., Database Systems, Software Engineering).
   2. For each subject, add its **exam date** and its **topics**. Each topic has a name, estimated study time, difficulty (1–5) and confidence (1–5), e.g., "Transaction Scheduling", 2 hours, difficulty 5, confidence 1.
   3. Enter **daily study availability**: hours for weekdays and weekends, with the option to customize individual days (e.g., 2 hours on weekdays, 5 on Saturday).
   4. Click **Generate My Study Plan**.
3. **See the plan.** The dashboard shows today's study sessions, their status, and a simple overview of upcoming exams.
4. **Work the plan.** For each session, the student marks it **Completed**, **Skipped** or **Partially Completed**, and can record the **actual time spent** (and update their confidence in the topic).
5. **Fall behind.** A session's day passes unmarked, or they skip or only partly finish sessions.
6. **Replan.** The student clicks **Replan My Schedule**. If any sessions are still Unconfirmed, the app first asks the student what to do about them (see Unconfirmed sessions). After a loading state, the app shows **only the sessions that changed, original next to revised**, with the AI's explanation.
7. **Decide.** The student **accepts** the revised plan or **keeps the original**.
8. **Success.** The revised plan visibly differs in priorities, time allocations and remaining workload, and the AI explains why, so it is clear the plan responded to the student's actual progress.

## POC Critical Path
The shortest path that must work for the proof of concept to count:

**Setup → Generate Plan → Miss / Partially Complete a Session → Replan → Review Affected Sessions + Explanation → Accept Revised Plan**

Everything else in this document supports or surrounds this path. If time runs short, protect this path first.

## Screens and Layout

### Onboarding flow
A multi-step flow (welcome → subjects, exam dates and topics → availability → generate). It shows one step at a time so it never feels like a long form. Students can add multiple subjects and multiple topics per subject before moving on.

### Dashboard
The single main surface after setup. It contains:
- **Today's study sessions**, each showing subject, topic, planned duration, priority and status, plus actions for Completed / Skipped / Partially Completed and a field for actual time spent.
- **Upcoming exams** overview (simple: which exams, when).
- **Progress**, shown only through completed vs. unfinished sessions.
- A **Replan My Schedule** button.
- A **Settings / Edit** area to update study availability, subjects, exam dates and topics after setup.
- A **Start Over** (Reset Demo) option that clears all data and returns to the initial setup.
- A **Not scheduled** list of topics that could not fit, each with the reason (appears after a replan when time is insufficient).

**Today's sessions are the main focus** of the dashboard. A simpler **overview** shows the full period from today until the student's last exam, so they see the bigger picture without clutter.

### Replan review view
Shown after Replan. It does **not** duplicate the whole plan. It lists only the **affected sessions**: each changed session shown as original → revised (moved, shortened or prioritized), so the student sees exactly what changed. Sessions that didn't change are not repeated. It also shows the **Not scheduled** topics with reasons, the AI's explanation, and the **Accept revised plan** / **Keep original plan** choices. Accepting makes the full revised plan the active one.

## Look and Feel
Clean, modern, calm. A practical study tool students can trust and use every day, not a "futuristic AI" product.
- **Color:** warm off-white background, deep navy text, restrained teal or green accents used for progress and completed tasks.
- **Typography:** readable and contemporary, with clear headings.
- **Layout and density:** plenty of whitespace; clear, organized structure.
- **Inspiration:** Linear's clarity and organization, plus the approachable, supportive feel of a well-designed productivity app.
- **Avoid:** excessive gradients, glowing effects, floating AI icons, and unnecessary cards.

## Features and Behavior

### Setup and availability
Implements `scope.md > What "Working" Looks Like` (inputs) and `scope.md > The POC Boundary`.
- The student enters subjects, then per subject an exam date and topics; each topic has a name, estimated study time, a **difficulty rating from 1 to 5** (1 = easy, 5 = very hard) and a **confidence rating from 1 to 5** (1 = not confident, 5 = very confident).
- Availability is set per day of the week: separate weekday and weekend hours during setup, with the option to customize individual days.
- The student can **update availability later**; the AI uses the updated limits the next time it replans.
- The student can **edit subjects, exams and topics after setup** from the Settings / Edit area instead of restarting: add a new topic, change an exam date, or update a topic's difficulty and confidence. Changes are used the next time the AI replans.

- As a student, I want a guided setup so that entering my exams doesn't feel overwhelming.
  - [ ] Setup is a step-by-step flow, not a single long form.
  - [ ] I can add several subjects, each with an exam date and several topics.
  - [ ] Each topic captures name, estimated time, difficulty (1–5) and confidence (1–5); values outside 1–5 can't be entered.
  - [ ] I can set weekday and weekend hours and override individual days.
  - [ ] **Generate My Study Plan** produces a plan and takes me to the dashboard.
  - [ ] From Settings / Edit I can add a topic, change an exam date, and update a topic's difficulty or confidence without restarting.
  - [ ] Edits I make are the ones the next replan uses.

### Start Over (Reset Demo)
- A simple **Start Over** option clears all data (subjects, topics, availability, plan, session history) and returns the student to the initial setup. It is especially useful for demonstrating the app several times during the hackathon.

- As a student (or demoer), I want a clean restart so that I can run the demo repeatedly.
  - [ ] Start Over is reachable from the dashboard.
  - [ ] After confirming, all stored data is cleared and the welcome/setup flow appears as on first use.

### Plan generation
Implements `scope.md > The Core Loop`.
- The system generates a daily plan from today until the last exam, using AI for prioritization and planning decisions while the application enforces hard constraints (each day's available hours, exam dates, topic time). The inputs are exam dates, topic difficulty, confidence, estimated time and available hours.
- Weak, high-stakes topics are prioritized. Sessions are distributed within each day's hours, avoid overloading any day, and leave room for breaks.

- As a student, I want a realistic daily plan so that I know what to study today.
  - [ ] Every session shows subject, topic, planned duration, priority and status.
  - [ ] No day's total planned time exceeds that day's available hours.
  - [ ] Lower-confidence, higher-difficulty topics near an exam are scheduled with higher priority than strong topics.

### Session tracking
- Each session can be marked **Completed**, **Skipped** or **Partially Completed**.
- The student can record **actual time spent**.
- **Confidence** in the topic can be updated when completing or partially completing a session, so the student can say whether their understanding improved. The AI uses the latest confidence level when replanning.
- **Partially Completed:** the unfinished portion counts as remaining work at the next replan. For example, if a 2-hour session is completed for 1 hour, about 1 hour of work is still remaining.
- Progress is visible only as completed vs. unfinished sessions (no analytics).

- As a student, I want to record what really happened so that the plan reflects reality.
  - [ ] Each session offers Completed / Skipped / Partially Completed.
  - [ ] I can enter actual time spent for a session.
  - [ ] When I mark a session Completed or Partially Completed, I can update my confidence in that topic.
  - [ ] If I mark a 2-hour session partially done with 1 hour spent, the next replan treats about 1 hour as remaining.
  - [ ] Status changes are reflected on the dashboard immediately and remain after I close and reopen the app.

### Unconfirmed sessions
- If a session's scheduled day passes and the student hasn't updated it, it shows as **Unconfirmed**. It is **not** automatically treated as skipped, because the student may have done it offline.
- When the student opens the dashboard, they can resolve it to Completed / Skipped / Partially Completed.
- **The confirmation flow when the student clicks Replan with Unconfirmed sessions open:**
  1. Before anything is sent to the AI, a confirmation step appears, listing each Unconfirmed session (subject, topic, planned day and duration).
  2. For each listed session the student can mark it Completed, Skipped or Partially Completed right there.
  3. The student then chooses one of two actions: **Replan with these updates** (if they resolved them all, nothing is treated as missed) or **Replan anyway, treating the rest as missed**. A **Cancel** returns to the dashboard with nothing changed.
  4. When the student replans anyway, the AI treats the still-Unconfirmed sessions as missed **for this replan only**. Their recorded status stays "Unconfirmed" until the student resolves them. *(Small assumption: confirm in review.)*
  5. If there are no Unconfirmed sessions, this step is skipped and the replan starts straight away.

- As a student, I don't want the app to wrongly assume I skipped something so that my replan is fair.
  - [ ] A past, unmarked session displays "Unconfirmed", not "Skipped".
  - [ ] Clicking Replan with Unconfirmed sessions shows a confirmation step listing them, before any AI request is made.
  - [ ] In that step I can mark any of them Completed / Skipped / Partially Completed, then replan.
  - [ ] "Replan anyway" proceeds with the rest treated as missed for this replan only; their status stays "Unconfirmed".
  - [ ] "Cancel" returns me to the dashboard unchanged.
  - [ ] With no Unconfirmed sessions, Replan starts immediately with no confirmation step.

### Replan My Schedule
Implements `scope.md > The Unique Kernel` and `scope.md > What "Working" Looks Like`. This is the heart of the product.
- The AI reassesses remaining tasks, upcoming exams, completed/skipped/partial sessions, actual time spent, topic difficulty and confidence, and the current availability.
- It does **not** blindly move everything to the next day. It prioritizes important topics, postpones or shortens less urgent ones, and avoids unrealistic workloads.
- A loading state is shown while it works.
- **Who decides what:** the **AI decides the priorities** (what to move, shorten, postpone or leave out) **and writes the explanation**. The **application enforces the rules**: it checks the AI's proposed plan against the student's constraints before showing it. A proposal that breaks a rule is never shown to the student; the student sees the "Replan failed" message instead and can retry.
  - The rules the application enforces: no day exceeds its available hours; no session is scheduled after its subject's exam date; sessions are not scheduled in the past; no topic is scheduled for more time than its remaining work; every topic with remaining work is either scheduled or listed as Not scheduled; and the numbers quoted in the explanation (time needed vs. time available) match the plan.
- The result shows **only the affected sessions**, each original → revised, plus the AI's explanation. Unchanged sessions are not repeated; the whole plan is not duplicated.
- The AI explains which sessions were **moved, shortened or prioritized**, and why. Example: "I moved Database Architecture revision to Thursday because your Transaction Scheduling topic is less familiar and your exam is approaching."
- The student can **Accept** the revised plan (it becomes the active full plan) or **Keep original**.

- As a student, I want to see exactly what changed and why so that I trust the new plan.
  - [ ] After Replan, a loading state appears, then only the changed sessions display, each as original → revised.
  - [ ] Unchanged sessions are not duplicated in the review view.
  - [ ] A proposal that breaks any enforced rule (over a day's hours, after an exam, in the past, over a topic's remaining time, a topic neither scheduled nor listed) is never shown; I see the failure message with Retry.
  - [ ] Each moved, shortened or prioritized session is explained in plain language.
  - [ ] Accept replaces the active plan with the revised one; Keep original leaves the current plan unchanged.
  - [ ] The revised plan differs visibly from the original in priorities, time allocations or remaining workload (demo: original plan, a missed session, revised plan).

### Not enough time (honest trade-offs)
- If every topic can't realistically fit before an exam, the AI does **not** squeeze everything in. It prioritizes by exam proximity, difficulty and the student's confidence, while respecting available hours and reasonable breaks.
- The revised plan clearly separates **scheduled high-priority topics** from lower-priority topics that **couldn't fit**, listed as **Not scheduled** with the reason they were left out.
- The explanation states the shortfall plainly. Example: "Your exam is in two days, and you have four study hours available, but your remaining topics require six hours. I've prioritized Transaction Scheduling and Normalization because you reported lower confidence in them. Database Architecture revision couldn't fit into the available time and is listed below as 'Not scheduled.' Consider reviewing its key concepts if time permits."

- As a student, I want honesty when time is short so that I can make informed decisions.
  - [ ] When required time exceeds available time, the explanation states both numbers.
  - [ ] Topics that couldn't fit appear in a "Not scheduled" list with a reason each.
  - [ ] The scheduled sessions never exceed the available hours.

## States and Boundaries
- **First use / empty** — No plan exists yet, so the student sees the onboarding welcome and setup flow, not an empty dashboard.
- **Normal use** — Dashboard shows today's sessions, statuses, upcoming exams and progress.
- **Unconfirmed session** — A past, unmarked session shows "Unconfirmed" until the student resolves it (see Unconfirmed sessions).
- **Replan confirmation** — If Unconfirmed sessions exist, the student first sees the confirmation step (see Unconfirmed sessions).
- **Replan loading** — A visible loading state while the revised plan is generated.
- **Replan succeeded** — Only the affected sessions are shown, original → revised, with the explanation and Accept / Keep original.
- **Replan not needed** — The app says "You're on track! Your current plan still fits your deadlines and availability." and makes no changes. It never generates changes just to look useful.
- **Replan failed, too slow, or the proposal broke a rule** — The original plan stays unchanged and the app shows: "We couldn't generate your revised plan. Your current schedule is safe—please try again." A **Retry** button is available, and no recorded progress is lost.
- **Insufficient time** — Revised plan includes a "Not scheduled" list with reasons (see Not enough time).
- **After Start Over** — All data is cleared and the student sees the first-use welcome and setup again.
- **What persists** — The plan, session statuses, time spent, confidence, availability, and edited subjects/exams/topics remain between visits (the scope's "plan and progress survive between visits"). How is for `4-spec`.
- **Boundaries** — Single student, no accounts, nobody else can see or share the plan.

## Canonical Demo Scenario
The one scenario the app must reproduce end to end, and the one used for the demo video and for checking the build. It is assembled from your own examples (Database Systems, Transaction Scheduling, Normalization, Database Architecture, six hours needed vs. four available). The exact day layout is my arrangement of those numbers, so confirm it in review.

**Setup (entered in the onboarding flow)**
- Subject: **Database Systems**, exam on **Day 4**.
- Topics (2 hours each, 6 hours in total):
  - **Transaction Scheduling**: difficulty 5, confidence 1
  - **Normalization**: difficulty 4, confidence 2
  - **Database Architecture**: difficulty 2, confidence 4
- Availability: **2 hours per day** on Days 1–3.

**Original plan (Day 1 to Day 3, 6 hours, fits exactly)**
- Day 1: Transaction Scheduling (2h)
- Day 2: Normalization (2h)
- Day 3: Database Architecture (2h)

**What goes wrong**
- On Day 1 the student doesn't do Transaction Scheduling and never marks it. On Day 2 it shows as **Unconfirmed**.
- Now only Days 2 and 3 remain: **4 hours available, 6 hours of work still needed** (the exam is Day 4).

**The replan (the demo's "wow")**
1. The student clicks **Replan My Schedule**. The Unconfirmed confirmation step lists Transaction Scheduling; the student chooses **Replan anyway**, treating it as missed.
2. After the loading state, the review view shows only the affected sessions, original → revised:
   - Transaction Scheduling: Day 1 (missed) → **Day 2, 2h**, now first priority
   - Normalization: Day 2 → **Day 3, 2h**
   - Database Architecture: Day 3 → **Not scheduled** (strongest topic, confidence 4)
3. The AI's explanation states the numbers (6 hours needed, 4 available), says it prioritized Transaction Scheduling and Normalization because of lower confidence, and that Database Architecture couldn't fit, suggesting a review of its key concepts if time permits.
4. The student clicks **Accept revised plan**. The dashboard now shows the revised plan, with the Not scheduled topic and its reason listed.

**What the demo proves**
- The plan changed because of what the student actually did (a missed session), not because of a generic re-timetable.
- The AI prioritized the weakest topics, was honest about the shortfall, and the schedule never exceeded the available hours.

**Acceptance test**
The canonical demo scenario is the primary acceptance test. If the complete demo scenario works reliably, the POC is considered functionally successful even if non-critical edge cases or secondary UI polish remain.

## Product Decisions
- **Step-by-step onboarding, not one long form** — so students enter information without feeling overwhelmed.
- **Per-day availability (weekday/weekend defaults with custom days)** — a single fixed daily number isn't realistic (e.g., 2 hours weekdays, 5 on Saturday); changes apply the next time the AI replans.
- **Essential dashboard = today's sessions, status, simple exam overview** — the proof of concept should prove one thing really well: the plan adapts. Analytics and a topics-needing-attention panel can wait.
- **Show only the affected sessions, original → revised, with accept/keep choices** — so the student understands what changed without scanning two full plans; nothing silently replaces the plan.
- **AI prioritizes and explains; the application validates the rules** — the AI is good at judgment and explanation, but hard limits (daily hours, exam dates, topic time) are checked by the application so a bad proposal never reaches the student.
- **Difficulty and confidence are rated 1–5** — one simple, consistent scale (1 = easy / not confident, 5 = very hard / very confident).
- **Unconfirmed sessions get an explicit confirmation step before replanning** — resolve them right there, replan anyway treating them as missed, or cancel.
- **Manual editing and undo can wait** — they'd complicate the first version.
- **Past unmarked sessions become "Unconfirmed", not auto-skipped** — avoids wrongly judging a session the student may have done offline; Replan asks them to confirm or proceed assuming it was missed.
- **Failed replan keeps the original plan and offers retry** — the student never loses progress or trust.
- **No fake changes** — if the student is on track, say so.
- **Honesty over cramming** — when time is short, show a "Not scheduled" list with reasons instead of an unrealistic schedule.
- **Editing subjects, exams and topics after setup is in** — students shouldn't have to restart everything to add a topic, change an exam date or update difficulty/confidence. (This is a deliberate addition to the earlier scope sketch, kept as a simple edit area.)
- **Start Over / Reset Demo is in** — lets the app be demonstrated multiple times during the hackathon.
- **Partially Completed leaves the unfinished portion as remaining work** — e.g., 1 of 2 hours done means about 1 hour still counts at the next replan.
- **Confidence can be updated when completing or partially completing a session** — so the AI replans with the latest sense of the student's understanding.
- **Today's sessions are the main focus; the overview covers today to the last exam** — keeps the interface simple while showing the bigger picture.
- **Visual direction** — calm, warm off-white and deep navy with restrained teal/green, Linear-like clarity, no gimmicky AI visuals.

## What We're Building
Everything the proof of concept must do to be complete:
- Welcome screen and step-by-step setup (subjects, exam dates, topics with time/difficulty/confidence, per-day availability, Generate My Study Plan).
- AI-generated daily plan from today until the last exam, distributed within daily hours.
- Dashboard: today's sessions with subject, topic, duration, priority and status; upcoming exams overview; completed vs. unfinished progress; update availability.
- Session tracking: Completed / Skipped / Partially Completed, actual time spent, confidence update; remaining portion of partial sessions counts at replan; Unconfirmed state for past unmarked sessions.
- Settings / Edit: change availability, subjects, exam dates and topics (add topic, change difficulty/confidence) after setup.
- Start Over (Reset Demo): clears all data and returns to the initial setup.
- Replan My Schedule: Unconfirmed-session confirmation step; loading state; only the affected sessions shown original → revised with moved/shortened/prioritized explanations; Accept or Keep original; "Not scheduled" list with reasons when time is insufficient; "You're on track" message; failure message with Retry; the application checks the AI's proposal against the student's rules before showing it.
- One canonical demo scenario (below) that the app can reproduce.
- Plan and progress persist between visits.

## Deferred From the POC
- **Manual editing of the plan** — would add edit flows and conflict handling with AI replans; the proof only needs the AI adaptation.
- **Undo of an accepted replan** — extra history to maintain; "Keep original" at decision time covers the need for now.
- **Topics-needing-attention panel and detailed analytics** — progress via completed/unfinished sessions is enough to prove adaptation.
- **Accounts and multi-device sync** — cut in scope; one student, one browser.

## Possible Later Enhancements
- Assignments and other deadlines in the plan.
- Personal learning goals alongside exams.
- Advanced progress analytics and topic-level insights.
- Notifications and reminders.
- Collaborative features (study groups, shared plans).

## Non-Goals
- Not a full productivity platform or to-do manager. The focus is exam prep.
- Will not silently assume a student skipped a session.
- Will not generate plan changes when none are needed.
- Will not hide time shortfalls by cramming an unrealistic schedule.
- No user accounts in this version.

## Open Questions
None remaining that block `4-spec`. Earlier questions (editing after setup, Start Over, Partially Completed, where confidence is updated, daily view vs. overview) were answered by the learner and are recorded under Product Decisions.
