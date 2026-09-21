/* case-topics.js — which module checklist rows each starred case stands on. THE TRIAGE.
   Her words: the exam "will be based on the starred *Case studies in your Case Study Booklet A", and its written 37% "on the
   content of your Case Study Workbook". Her exam revision deck backs the same reading for the closed part: every one of its
   30 slides is on a case topic (brain areas, synapse, insulin, asthma, the bicarbonate buffer, blood pressure, pedigrees,
   colour blindness, the cycle graph, the vagus nerve). So a module row a case needs is where the closed questions most
   likely come from; a row no case touches is the least likely.
   Read by hand against each case's starred questions and her answers (21 Sep 2026) — a row is listed only when a starred
   question or her model answer is ABOUT it. `why` says which. The build fails on a row id that is not a checklist row. */
export const CASE_TOPICS = {
  c2: { why: 'lymph functions, the axillary nodes and metastasis, and the fluid dynamics of lymphoedema',
        rows: ['m1:lymph-function', 'm1:lymph-anatomy', 'm1:lymph-cvs', 'm1:lymph-terms', 'm1:cvs-capillary-fluid'] },
  c3: { why: 'the airway and its defences (escalator, smoking), airway resistance and ventilation, the tissue of trachea to alveolus, and the baroreflex that brings blood pressure down afterwards',
        rows: ['m1:resp-anatomy', 'm1:resp-airpath', 'm1:resp-zones', 'm1:resp-alveoli', 'm1:resp-ventilation', 'm1:resp-terms', 'm1:cvs-bp-control', 'm2:ns-ans'] },
  c4: { why: 'the steps of inhalation and exhalation, the forced-breathing muscles, what changes ventilation, and the bicarbonate buffer / respiratory alkalosis',
        rows: ['m1:resp-ventilation', 'm1:resp-co2-transport', 'm1:resp-chemical', 'm1:resp-rhythm', 'm1:resp-conscious'] },
  c6: { why: 'insulin from the islets, what opposes it (glucagon, adrenaline, cortisol, growth hormone, thyroid), insulin released by a humoral stimulus',
        rows: ['m2:endo-pancreas', 'm2:endo-adrenal', 'm2:endo-thyroid', 'm2:endo-stimuli'] },
  c8: { why: 'the synovial joint and its structures, arthritis and bursitis, cortisol from the adrenal cortex',
        rows: ['m2:ms-joints', 'm2:ms-imbalance', 'm2:endo-adrenal'] },
  c9: { why: 'what a neurotransmitter is, dopamine made in the brain stem, calcium and the synapse, excitatory vs inhibitory',
        rows: ['m2:ns-synapse', 'm2:ns-neuron', 'm2:ns-action-potential', 'm2:ns-brain-regions'] },
  c10: { why: 'the functional areas of the cerebrum, the brain parts in her guided answers (cerebellum, pons, medulla, corpus callosum), stroke itself',
        rows: ['m2:ns-lobes', 'm2:ns-brain-regions', 'm2:ns-stroke', 'm2:ns-motor-neuron-lesion'] },
  c13: { why: 'the ovarian and uterine cycles and their hormones, ovulation, contraception, male fertility (sperm count, spermatogenesis and FSH), pregnancy',
        rows: ['m3:repro-cycle-ovarian', 'm3:repro-cycle-uterine', 'm3:repro-female-hormones', 'm3:repro-female', 'm3:repro-pregnancy', 'm3:repro-semen', 'm3:repro-sperm'] },
  c14: { why: 'rods and cones in the retina, X-linked recessive inheritance, the pedigree she asks you to draw',
        rows: ['m3:eye-retina', 'm3:gen-sexlinked', 'm3:gen-pedigree'] },
  c15: { why: 'autosomal recessive (CF) vs autosomal dominant (Huntington’s), reading both pedigrees, the chance a child inherits it',
        rows: ['m3:gen-disorders', 'm3:gen-pedigree', 'm3:gen-crosses', 'm3:gen-vocab'] },
};
