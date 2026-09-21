# HS2 Paper Sim — Final exam

The HS2 (722.541) final: **Thu 5 Nov 2026, 12:30, on campus — 130 min, 32 questions, 37% written, Modules 1–3**, and in her
own words (Assessment Overview) "based on the starred *Case studies in your Case Study Booklet A". Same format as
`hs2-test2`, `hs2-paper-m1` and `hs2-test3`; own storage prefix `hs2f.`; `noindex`.

## What is in it (built 2026-09-21)

**1,337 questions from 94 quizzes.**
- **The ten starred cases** (`content/cases.js`): 2 lymph-node removal · 3 asthma · 4 panic attacks · 6 diabetes · 8 joints &
  arthritis · 9 neurotransmitters · 10 stroke · 13 fertility · 14 RG colour blindness · 15 genetic diseases. Scenario and
  starred questions verbatim from her *Case Study Workbook 2026 S2*; **44 written questions marked against HER model
  answers** — cases 2/3/4 imported from hs2-paper-m1 (her 2024 case-study answer deck), 6/8/9/10 from her 2024 answer
  decks, her NS1 deck and NS2 learning page, 13 from her Fertility quiz (which her Anatomy Mondays 15 page names as the
  case's model answer). One line is the tool's and says so (the "damage →" half of case 10). **14 held** starred questions
  (most of 13, all of 14 and 15): her answers sit in the colour-blindness quiz 211016 and the case-15 board 413346, both
  hidden on Canvas today — each case row lists its held questions.
- **Her CASE STUDY FORMATIVE TEST MODULE 1-2** (211092, 7 Q, 20 marks) — the one quiz that belongs to the exam, not a module:
  captured 21 Sep into `_inbox/HS2 Final Capture`, parsed to `hs2-anki/final/questions.json`, run through the same stem /
  key / image pipeline as every sim. Each item sits on its case's row.
- **Every question of the three module sims, imported AS BUILT** (their `index.html` DATA): 378 + 506 + 402 = 1,286, each
  with its explain row (her slides, prose, course files, Patton, per-part refs, caption-verified videos, Module 2's helpline
  answers). Their figures are **hot-linked** from the sibling sim (`../hs2-test2/img/…`, same origin on GitHub Pages) —
  the build checks every one exists on disk. Nothing of theirs is copied.

**The mock exam** (`dealFull` in `template.html`): 32 questions, 130-min clock; closed questions dealt across Modules 1–3 in
proportion to her banks, then written case questions added one case at a time (least-sat case first) until the written
share of the MARKS reaches 37% — measured 38–41% over repeated deals. **Learn / Sit the 10 cases** deals her formative items
and the written case questions in booklet order.

**The checklist:** the ten case rows on top ("The exam is built on these — her words"), then all 123 module rows of the three
sims re-tiered on their own marks (a module's tier-0 — her words about THAT test — is not a word about the exam; the row
says where it used to sit). Module 1's own "exam cases 2, 3, 4" row is replaced by the three case rows.

## Build

    python host-figs.py      # the workbook's own figures (content/hosted-figs.json) → img/wb26-*.png
    node bind-images.mjs     # only when a capture is added to _inbox/HS2 Final Capture
    node build.mjs           # re-run whenever hs2-paper-m1, hs2-test2 or hs2-test3 is rebuilt
    node resplice.mjs        # chrome-only template changes

Gates (each provoked once on 21 Sep and seen to fail): a case figure missing · a `pull` row that is not a module row · a
`formative` fragment that matches nothing (or a formative question on no case) · an imported figure missing from its sim ·
plus every gate inherited from hs2-test3 (stems, blanks, keys, `<details>` balance, the page's script must parse).

Preview locally by serving the estate ROOT (the figures live in the sibling sims): launch config `estate-root`
→ `http://localhost:8786/hs2-final/`.

## Not done yet (in order)

1. **Her exam revision deck** ("Exam Revison ppt for Hs2 Final.pptx", ~30 exam-style questions, rendered to
   `_inbox/HS2 Final Capture/slides/`): her MCQ answers are shown by highlight on the answer slide, so each needs reading off
   the render before it can ship as a quiz.
2. **When they open:** the M2 combined case board (Wed 30 Sep 08:00), the case 4 board (Fri 2 Oct), the M1-2-3 exam-case
   board (Sun 4 Oct 08:00), her **EXAM CASE STUDY HELPLINE** (Mon 19 Oct 00:00 — "most important resource for exam prep";
   whatever she names joins the top band), the colour-blindness quiz 211016 (case 14's answer) and board 413346 (case 15's).
3. Case 13's five unanswered starred questions, if she posts answers; the M1 helpline's worked answers (BP control,
   ventilation, CO2 transport) under the case 3 / 4 questions.
