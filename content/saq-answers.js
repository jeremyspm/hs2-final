/* Model answers the TOOL writes for essays in the final's OWN quizzes (none yet: 211092 has no essays). Keyed on the normalised
   opening of the question text ONLY. build.mjs fails if an own essay finds no entry here, and if an entry matches no essay.
   The ten cases carry their own answers (content/cases.js), and imported questions keep their sims' answers. */
export const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const SAQ_ANSWERS = [
];
