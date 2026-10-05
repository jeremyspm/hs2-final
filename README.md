# HS2 Paper Sim — Final exam

The HS2 (722.541) final: **Thu 5 Nov 2026 — it opens 1 pm sharp, be at your venue 60 min before (her helpline, 5 Oct); on
campus, 130 min, 32 questions / 80 marks (160 answers at ½ mark), 37% written, Modules 1–3**, and in her
own words (Assessment Overview) "based on the starred *Case studies in your Case Study Booklet A". Same format as
`hs2-test2`, `hs2-paper-m1` and `hs2-test3`; own storage prefix `hs2f.`; `noindex`.

## What is in it (built 2026-09-21)

**1,377 questions from 97 quizzes** (1,370 on 21 Sep; +7 written case questions on 5 Oct).
- **The ten starred cases** (`content/cases.js`): 2 lymph-node removal · 3 asthma · 4 panic attacks · 6 diabetes · 8 joints &
  arthritis · 9 neurotransmitters · 10 stroke · 13 fertility · 14 RG colour blindness · 15 genetic diseases. Scenario and
  starred questions verbatim from her *Case Study Workbook 2026 S2*; **51 written questions marked against HER model
  answers** — cases 2/3/4 imported from hs2-paper-m1 (her 2024 case-study answer deck), 6/8/9/10 from her 2024 answer
  decks, her NS1 deck and NS2 learning page, 13 from her Fertility quiz (which her Anatomy Mondays 15 page names as the
  case's model answer). One line is the tool's and says so (the "damage →" half of case 10).
  **5 Oct 2026 — her recorded 31 May 2024 case session** (Canvas page "RECORDINGS EXAM PREP & CASE STUDIES Model answers",
  the Fertility & Red green colorblindness video; transcribed locally, the video and transcript stay OFF this repo in
  `D:\hs2-exam-recordings`): she talks her Fertility quiz and her RG colour-blindness quiz through (the latter is the quiz still
  hidden here as 211016, same scenario, same seven relatives) and keys it 10/10 on screen, then marks the case-15 board. That
  answers **all four of case 14**, case 13's progesterone-contraception question and case 15's modes of inheritance; each
  `src` gives the minute, and the page labels these answers "tidied into lines from her recorded session" (not word for word).
  Case 14's last rods/cones line is the tool's (photopic / scotopic / peripheral are the question's words) and says so. Plus
  `more` on case 3: her four lung micrographs (workbook table, her "CASE STUDY LUNG HISTOLOGY FOR EXAM" deck that the helpline
  links under case 3), the question worded by the tool around her own table. **8 held** starred questions (four of 13, four
  of 15: the whānau charts are worked on board 413346, still hidden) — each case row lists its held questions.
- **Her exam revision deck** (`content/revision-deck.js`, "Exam Revison ppt for Hs2 Final", linked from her Module 3 Completion
  page): her 30 exam-style slides → **33 questions** (her T/F slide splits into four). Every key was read off her RED answer
  slide on the render; each question carries that answer slide under it. Its own tier-0 checklist row, with her charades
  terms (slides 2–24). Slides ship as `img/slides/` via `slides-todo.json` + `python compress-slides.py`.
- **Her CASE STUDY FORMATIVE TEST MODULE 1-2** (211092, 7 Q, 20 marks) — the one quiz that belongs to the exam, not a module:
  captured 21 Sep into `_inbox/HS2 Final Capture`, parsed to `hs2-anki/final/questions.json`, run through the same stem /
  key / image pipeline as every sim. Each item sits on its case's row.
- **Every question of the three module sims, imported AS BUILT** (their `index.html` DATA): 378 + 506 + 402 = 1,286, each
  with its explain row (her slides, prose, course files, Patton, per-part refs, caption-verified videos, Module 2's helpline
  answers). Their figures are **hot-linked** from the sibling sim (`../hs2-test2/img/…`, same origin on GitHub Pages) —
  the build checks every one exists on disk. Nothing of theirs is copied.

**The triage — "🧭 Decide for me"** (top of home): one button, 15 at a time, least-seen and misses first. It deals **her 84 exam
questions** first (the 51 written case questions, her formative test, her revision deck — 91 in all) and only once every one has been
seen once adds the **401 module questions on the case topics**. `content/case-topics.js` names, per case, the module rows a
starred question or her model answer is about (read by hand); those rows are tier 1 of the checklist ("On a case topic"),
off-case rows with 30+ marks tier 2, the rest tier 3 ("Only if there is time"). Why: her exam is built on the cases, and every
slide of her exam revision deck sits on a case topic.

**Her MODULE 1 HELPLINE** (`content/helpline-m1.js`, from his save of 21 Sep): her blood-pressure question lists and direct-renal
answer, her ventilation table and factors, her CO2 transport, her lymph pointer — under the four Module 1 rows they answer and
44 questions read one by one (pneumothorax, gas laws, the bell jar and CO x PR left off), including case 3's baroreflex and
case 4's breathing questions. Gated both ways.

**The mock exam** (`dealFull` in `template.html`): 32 questions, 130-min clock. **Since 5 Oct the closed questions are ONLY her
own case questions in closed form** (`DATA.mock.pool`, 81: her formative case test 211092, her revision deck, her RG quiz read
off her recorded session, and the case quizzes her exam helpline lists under the cases — Fertility 211050, neuron/AP/synapse
211129, pedigree 211086 + 211014), because her 413286 post says the exam's closed questions are her case SAQs converted. They
are dealt by body-system group in proportion to how many of the ten cases sit on each (lymph 1, resp 2, endo 1, ms 1, ns 2,
repro 1, gen 2; thin groups top up from the rest), least-seen first. Then written case questions are added one case at a time
(least-sat case first) until the written share of the MARKS reaches 37%; one that would push it past 42% waits for another
sitting. Measured over 200 deals: always 32, never a module-bank question, written 37–42%, every case 155–178 written
appearances. The mini mock is 12 from the same pool. Learn as you go still deals from the whole bank. **Learn / Sit the 10 cases** deals her formative items
and the written case questions in booklet order.

**The checklist:** the ten case rows on top ("The exam is built on these — her words"), then all 123 module rows of the three
sims re-tiered on their own marks (a module's tier-0 — her words about THAT test — is not a word about the exam; the row
says where it used to sit). Module 1's own "exam cases 2, 3, 4" row is replaced by the three case rows.

## Build

    python host-figs.py      # the workbook's own figures (content/hosted-figs.json) → img/wb26-*.png
    node bind-images.mjs     # only when a capture is added to _inbox/HS2 Final Capture
    node build.mjs           # re-run whenever hs2-paper-m1, hs2-test2 or hs2-test3 is rebuilt
    python compress-slides.py   # her revision-deck slides → img/slides/ (after build)
    node resplice.mjs        # chrome-only template changes

Gates (each provoked once on 21 Sep and seen to fail): a case figure missing · a `pull` row that is not a module row · a
`formative` fragment that matches nothing (or a formative question on no case) · an imported figure missing from its sim ·
plus every gate inherited from hs2-test3 (stems, blanks, keys, `<details>` balance, the page's script must parse).

Preview locally by serving the estate ROOT (the figures live in the sibling sims): launch config `estate-root`
→ `http://localhost:8786/hs2-final/`. `build.mjs` reads each sibling's DATA line; since 5 Oct it tolerates a CRLF checkout
(autocrlf=true left hs2-test3's `index.html` CRLF, and the old slice kept the trailing `;` → JSON error).

## Not done yet (in order)

1. **Still hidden on 5 Oct:** board 413346 (case 15's whānau charts — her full model answer), the colour-blindness board
   413347 and quiz 211016 (being redone "with more about the eye" — check it against case 14 when it opens), board 413351.
   Her EXAM CASE STUDY HELPLINE (413364) is open: read 5 Oct, its lung-histology deck is in (case 3).
2. Case 13's four unanswered starred questions, if she posts answers; the M1 helpline's worked answers (BP control,
   ventilation, CO2 transport) under the case 3 / 4 questions.
3. Her other three 2024 session videos on the same Canvas page (Neurotransmitters & Stroke · Joints · Lymph/Panic/Asthma/
   Diabetes) — same recipe (`D:\hs2-exam-recordings`: download, `transcribe.py`, `frames.py` + `sheets.py`, `crop.py`).
4. Her RG quiz's Q1, Q2 and Q5 (drop-downs / genotype grid / pedigree): only some options were on her screen, so they are out;
   add them when 211016 opens. The musculoskeletal (1) and lymph (2) groups of the mock pool are thin.
