---
doc: scope
status: approved
---

# StudyFlow AI

An AI-powered exam study planner that adapts when you fall behind, instead of breaking.

## The Unique Kernel
**A study plan shouldn't break when life gets in the way. It should adapt.** At the press of **Replan My Schedule**, the AI looks at what the student actually did (completed, skipped, or partly done, and how long it really took) and rebuilds the remaining plan. It doesn't blindly push everything to tomorrow. It prioritizes weak, high-stakes topics, postpones what can wait, avoids unrealistic workloads, and explains the trade-offs honestly when there isn't enough time.

## Who It's For
University students managing several courses and deadlines at once, like the learner: a Software Engineering student. Today they make a fixed study timetable, and it falls apart when one topic takes longer than expected or something unexpected comes up. Then they're left staring at everything they've missed.

## The Core Loop
The student opens the dashboard and sees today's study sessions. They mark each one **Complete**, **Skip**, or **Partially Done**, enter the actual time spent, and update their confidence in the topic. When they fall behind, they click **Replan My Schedule**. A revised schedule appears with changed tasks, new time allocations, and an explanation of what moved and why. They come back because it always tells them what to do *next*, not what they've missed.

## Inspiration & Identity
A clean dashboard that helps students focus on "what should I do next" rather than feel overwhelmed. Calm and practical in tone, and honest about trade-offs. No other references volunteered yet. `3-prd` will fill any look-and-feel gaps.

## Why This Matters to the Learner
Balancing university courses, assignments, exams, and extra skills they want to learn is hard, and a schedule quickly becomes unrealistic when one topic runs long or other responsibilities appear. In their words: "students need more than a fixed timetable; they need a practical way to recover when they fall behind and focus on what matters most. I want to use AI to make study planning more realistic, flexible, and less stressful." It's also the learner's chosen way to practice **integrating AI** into an app.

## What "Working" Looks Like
The student enters subjects, exam dates, topics, difficulty, confidence levels, and available study hours. The app generates a daily plan. They mark a session as skipped or partial and record the actual time. They click **Replan My Schedule**.

The "oh, that's cool" beat: the **original plan, the missed session, and the AI-revised plan shown side by side**, with visible changes in priorities, deadlines, and remaining workload, plus the AI's plain-language reasons. Example demo case: a Database Systems exam in two days, six hours of material left, only four hours available. The AI prioritizes the weakest topics (e.g., transaction scheduling, normalization), moves a strong topic (database architecture) until after the exam, and says honestly that about two hours of high-priority material remains. This proves the AI responds to actual progress rather than producing another generic timetable.

## The POC Boundary
- Exam preparation and topics only.
- Inputs: subjects, exam dates, topics, difficulty levels, confidence levels, available study hours.
- AI-generated daily study plan.
- Mark sessions Complete / Skip / Partially Done, and record actual time spent (and update confidence).
- **Replan My Schedule**: adjusts the remaining plan from real progress and explains what changed and why.
- Data saved in the browser (local storage) so the plan and progress survive between visits.

## Technical Preference (carried to `4-spec`)
The learner will build the whole project with the **MERN stack** (MongoDB, Express, React, Node). This is their stated choice. `4-spec` decides how the scope's "plan survives between visits, no accounts" requirement maps onto it. The scope currently says browser local storage; with MERN, MongoDB may or may not be needed for a single anonymous student, and that tradeoff is for `4-spec`.

## Later
- Assignments and other deadlines
- Personal learning goals (skills outside the curriculum)
- Advanced analytics
- Notifications
- Collaborative features

## Explicitly Cut
- **User accounts**: unnecessary for the first version. Browser local storage is enough to keep a single student's plan between visits, and the priority is proving the plan adapts, not building a complete productivity platform.
