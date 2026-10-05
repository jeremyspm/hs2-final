/* HER RG COLOUR-BLINDNESS QUIZ — "MODULE 3 CASES: RG COLOURBLINDNESS QUIZ", still hidden on Canvas here (211016). Read off her
   recorded 31 May 2024 case session (Canvas page "RECORDINGS EXAM PREP & CASE STUDIES Model answers", the Fertility & Red green
   colorblindness video; the video stays off this repo): she previews the quiz on screen, answers it aloud and submits 10/10.
   Only the questions whose EVERY option is readable on her screen are here (Q3, Q4); stems and options are hers, word for word
   (her spelling kept). Q1's drop-downs and Q2's genotype grid show only some options, Q5's pedigree drop-downs likewise, so they
   stay out (case 14's written questions carry the same answers). Each key = her choice, said aloud and scored correct.
   `said` = her words at that moment, from the local transcript ("XP" in the transcript is her "XB", the option on her screen). */
export const RGQUIZ = {
  quiz: 'rg-2024', case: 'c14', name: 'Her RG colour-blindness quiz (2024, read off her recorded session)',
  items: [
    { n: 3, at: '1:05:25', stem: "What would Simon's mum's genotype have been and why do you say so?",
      opts: ['XbXb - she inherited the recessive allele from her father', 'XBXB - she is not colourblind - the condition is recessive',
             'XbXB - she is not colourblind', 'XbXb - she inherited the recessive allele from both her parents',
             'XbXB - she carried it over to Simon but her normal XB gave her normal vision'],
      key: ['XbXB - she carried it over to Simon but her normal XB gave her normal vision'],
      said: 'She’s a carrier… She carried it over to Simon, but her normal XB gives her normal vision… if she’s not colourblind, she could just as well have been that one also. That this is not enough reason. This is the right one.' },
    { n: 4, at: '1:06:22', stem: 'Will Simon pass on red-green colour-blindness to his children? How?',
      opts: ['No, to none of his children', 'Yes to all his sons who will be colourblind', 'Yes to all his daughters who will all be colour-blind',
             'To none of his sons, but to all his daughters who will be unaffected carriers', 'Yes to all his children who will be colourblind'],
      key: ['To none of his sons, but to all his daughters who will be unaffected carriers'],
      said: 'He give his daughters an X… he cannot pass it on to his sons… To none of his sons, but to all his daughters who will be unaffected carriers. That’s right.' },
  ],
};
