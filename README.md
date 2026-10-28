# HS2 Paper Sim — Final exam

The HS2 (722.541) final is **Wed 4 Nov 2026, 130 minutes, 90 marks**, on campus in Echoexam. Session times are
09:30–11:40 or 12:30–14:40 (Jeremy's current standing instructions, 27 Oct; supersedes the older announcement date).
The Paper Sim's older 32-question/80-mark mock structure is a practice format, not a statement of the current exam format.
Her announcement: "Exam case studies are marked in
yellow and starred (test case studies are marked in blue, not starred and are not in the exam)" — and in her
own words (Assessment Overview) "based on the starred *Case studies in your Case Study Booklet A". Same format as
`hs2-test2`, `hs2-paper-m1` and `hs2-test3`; own storage prefix `hs2f.`; `noindex`.

## Guided recall — 27 Oct 2026

`rep.html` is linked prominently from home, and the hub's HS2 Final card opens on it (its Learn side). One queue
teaches the ten cases with a connected explanation, short answer pieces, typed recall and spaced returns.
Long answers unlock a complete-answer check after their pieces have been recalled independently.

**Second pass, same day** (the asks: "it looks so GPT coded, I want it estate looking", and "shouldn't it all be
typed?"):
- **The Paper Sim's skin.** `rep.css` uses template.html's tokens (dark default, `data-theme=light`, theme shared via
  `hs2f.theme`), the header, the title and the sim's rows; each case wears its system's colour. (27 Oct, later: the
  HS2-blue header bar and the giant-name banner went, "the CSS is way too much": a blue line under a plain header, a
  plain title. The page is **Write the cases** now, and its back link goes to the hub's Write side.)
- **Typed, and marked by the page.** No ticking on trust. A new piece is read, then every **bold** key word becomes a
  blank to type (`2 · Type the key words`, the supported attempt). When it comes back it is written out whole and
  `markFacts` counts a point when all its key words are in the answer (`termFound`: forgiving on endings, plurals and
  a one-letter typo; strict on numbers, genotype capitals, and first letters, so hyper/hypo and afferent/efferent never
  pass). A missed point can be counted with a deliberate "I wrote it differently" click.
- **A ladder, not a cliff** (the ask: "shouldn't it be gradual occlusion?", and the blank write-out "should be the
  final stage"), then **key words, not sentences** (same evening: nothing asks for a sentence). A new piece climbs
  in one visit: 1 read it (key words highlighted, the rest quiet) · 2 one key word a line hidden · 3 every key word
  hidden. Step 4, key words from memory (typed in any order, marked by `markFacts`), comes a few pieces later and is
  only ever the last step. A missed step is retried or left there (`items[id].rung` is where the next visit starts);
  a miss from memory comes back at step 3, never blank. `state.lv` 2 maps the morning's 5-step rungs onto these.
- **Drilled, in two layers** ("it needs multiple consecutive correct hits over a single session or day … then a
  bigger meta layer where multiple days need to be consecutively correct"; "this needs to be DRILLED into our
  heads"). `record` counts a day only after `DAY_HITS` (2) from-memory passes in a row that day, a few pieces apart;
  counted days space out 1, 2, 3 days; `SOLID` (3) days running is solid; any miss empties both. The queue serves
  due pieces first (Anki's order), still three pieces apart. Each save shows today's hits and the run of days.
- **Spelling leniency** with guards: British/US spellings, swapped letters, one slip (two in long words), a
  dropped or extra letter in short words, word endings by suffix (not by a shared start, which had let glycogen
  pass for glycogenesis), a three-word term may miss one word. `OPPOSITES` (hyper/hypo, intra/inter, af/ef,
  ilium/ileum, inhibin/inhibit …), numbers and genotypes stay exact; `rep.check.mjs` lists both sides.
- **Written questions only.** 117 pieces: her case questions and the compiled answers first, then her revision deck's
  written ones. The 81 that mark themselves (MCQ, T/F, matching, blanks) are the sim's `#rep` screen (⚡ Rep
  questions, `REPQS` in template.html), which the hub's HS2 Final Rep tab opens. The mini mock test was culled the
  same day; `#mock` is the full 130-minute sitting only.
- **A pace.** Home shows today's new pieces against `pace()`: new a day to have met every piece by Tue 3 Nov.

The build derives its coverage from the existing core and mock pool: **155 original questions**, plus **nine
compiled study answers** (eight held questions and the workbook's male-pill research prompt), plus **four more**
from student tutors' recall of a past HS2 final (28 Oct: insulin's daily high and low, Depo Provera's three
effects, the male accessory glands, the three cone types). Their own model answers were checked against hers and
not used where they disagree (their Harris I-2 and Anderson II-3 genotypes contradict the figures). Sources and
authorship are labelled on every supplement. All original short-answer fact lines are retained; the levodopa
BBB line is explicitly corrected to amino-acid transport while the original key remains in the source panel.
The Harris and Anderson pedigrees are the workbook's original figures, with independently worked solutions.

Supported attempts and misses return after three intervening checks. Independent successes return after one,
then two, then three days; repeats on the same day do not count as separate retention days. Failures reopen
missed components. Two new pieces alternate with one due review while unseen material remains. This is a
simple short-horizon spaced-retrieval queue, not FSRS. “Recalled on 2+ days” is a progress measure, not an exam prediction.

Progress lives separately in `hs2f.relearn.v1`, with pause/resume and JSON export/import. Original Paper Sim
scores are untouched. `rep.template.html`, `rep.css`, `rep.js`, `rep-engine.mjs` and `content/rep-lessons.mjs`
are the sources; **do not edit generated `rep.html`**. Both `build.mjs` and `resplice.mjs` regenerate it.

    node resplice.mjs       # preserve the existing bank; regenerate both pages
    node rep.build.mjs      # rebuild only the guided page
    node rep.check.mjs      # full fact coverage, scheduling, complete checks, pedigree solutions

Use the estate as the HTTP root because original figures also link to sibling sims. Check the flow at 375px,
including hints vs independent recall, typed blanks, the key-word marking and its override, figures, closed
questions and pause/resume.

## What is in it (built 2026-09-21)

**1,439 questions from 99 quizzes** (1,370 on 21 Sep; 5 Oct: + her RG quiz's two, her exam revision Kahoot's 49, and 18 written case questions).
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
  links under case 3), the question worded by the tool around her own table.
  **6 Oct 2026 — the last two gaps in the final:** case 4's two STARRED acid–base tables (metabolic, respiratory) and the
  unstarred "compare the tables" under them come in through `more` on case 4: her 2024 deck fills both tables (slides 15–16,
  one cell per line) and answers the compare question on slide 15 ("CO2 and H+ are linked, whatever happens to one, happens to
  the other"). Case 13's starred contraception table leaves `held`: her Fertility quiz's matching (condom = barrier, IUD =
  implantation, hormonal = ovulation), her mini-pill answer (31 May PM, 27:28) and her 31 May morning session (18:26–20:08:
  only the condom protects against STIs; the pill, the Jadelle implant and the IUD are pregnancy only). Filing the IUD as
  non-hormonal is the tool's and says so. 66 written case questions now, every one with a short version.
  **5 Oct, later — her other three sessions on that page** (29 May: lymph, panic, asthma, diabetes · 30 May: joints, with her
  exam revision Kahoot · 31 May morning: neurotransmitters and stroke), same recipe: case 3's blood-pressure answer is now HERS
  (`swap`; it was the one tool answer), case 9 gains her synapse labels ("you will get this specific drawing in the exam") and the
  levodopa question, and the case rows carry her exam tips (the booklet's diagrams "will be in the exam. I'm promising you"; the
  same cerebrum letters; steps put in order; depth). **The YELLOW part:** her exam announcement (413237) says "Exam case studies
  are marked in yellow and starred" — in the workbook the yellow is paragraph shading on each exam case's text, i.e. the whole
  case, so its UNSTARRED questions now come in too, each labelled so (`YELLOW` in its src): case 6's five + her glucose/insulin
  day graph (her deck slides 31–34), case 8's four (her session, her Kahoot, Emma's page), case 9's levodopa; case 4's were
  already in via hs2-paper-m1; case 8's "compare bursitis and arthritis" has no answer of hers and is held.
  **Her exam revision Kahoot** (`content/kahoot-exam.js`, "Exam revision BN2", her own account, the one she plays in the 30 May
  session): 49 of its 50 with her keys, each on its case's row, in the exam core, the mock pool and Every case question; its Getty
  stock pictures are not copied (question 26 needs its picture and is left out).
  **9 held** (four of 13, four of 15 — the whānau charts are worked on board 413346, still hidden — and case 8's compare
  question) — each case row lists its held questions.
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

**Home (his pick, 5 Oct 2026 — "strip the home down", from three mockups):** one line — "The exam is the 10 starred cases. Her
words: 'I am 100% sure.'" — then Next up (Decide for me), **🩺 Every case question**, ✍️ SAQ trainer, ⏱ Mock test; Learn as you
go, Pick my rep, My misses, What to learn and Videos fold under **More**. A deliberate exception to the four-sim same-rows rule,
for this sim only, because she says the exam is the cases. **🩺 Every case question** (his ask the same day: "what if a user wants
perfect marks and needs to rep every single thing to do with the case studies?"): all of her case questions at once (204 since 6 Oct), no cap
— the exam core A + the mock's closed pool — least-seen and misses first; Learn them (each checks itself, place saved) or sit
them as one untimed test; then the 401 case-topic module questions.

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
own case questions in closed form** (`DATA.mock.pool`, 130: her formative case test 211092, her revision deck, her exam revision
Kahoot, her RG quiz read off her recorded session, and the case quizzes her exam helpline lists under the cases — Fertility 211050, neuron/AP/synapse
211129, pedigree 211086 + 211014), because her 413286 post says the exam's closed questions are her case SAQs converted. They
are dealt by body-system group in proportion to how many of the ten cases sit on each (lymph 1, resp 2, endo 1, ms 1, ns 2,
repro 1, gen 2; thin groups top up from the rest), least-seen first. Then written case questions are added one case at a time
(least-sat case first) until the written share of the MARKS reaches 37%; one that would push it past 42% waits for another
sitting, and a deal that runs out short of 37% takes back the smallest one set aside. Measured over 500 deals: always 32, never a
module-bank question, written 37–42% (six at 44–45%). The mini mock is 12 from the same pool. Learn as you go still deals from the whole bank. **Learn / Sit the 10 cases** deals her formative items
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
3. ~~Her other three 2024 session videos~~ — done 5 Oct (recipe in `D:\hs2-exam-recordings`: download, `transcribe.py` with
   `HS2_HOTWORDS`/`HS2_PROMPT`, `frames.py` + `sheets.py`, `crop.py`, `grab.py`). Her other Kahoots (Module 3, Emma's six,
   Module 2's) are public too and could join the same way.
4. Her RG quiz's Q1, Q2 and Q5 (drop-downs / genotype grid / pedigree): only some options were on her screen, so they are out;
   add them when 211016 opens. The musculoskeletal (1) and lymph (2) groups of the mock pool are thin.

## Kahoots are their own lower-yield section (12 Oct 2026)

His rule ("give it its own category … I feel like it's lower yield"). Her exam revision Kahoot (49 questions) is flagged `kh`:
out of the exam core, the mock's closed pool (130 → 81: her formative case test, revision deck, RG quiz and the helpline case
quizzes) and Every case question; a case row only counts it ("🎮 N in her Kahoots"). It runs from its own 🎮 button inside
Every case question (Learn only, never the misses pile or the score chart), each card tagged 🎮 Kahoot. A module sim's own
Kahoots (hs2-test3's 116) are never imported. Checked: 1,000 mock deals all 32 questions, 0 Kahoot, 0 module-bank, written
share 37–42% in 98.8% (max 44%, the existing take-back rule). Same day: the mock screen's stale "Thu 5 Nov … 80 marks" now
reads Wed 4 Nov, 2 h 10 min, 90 marks.
