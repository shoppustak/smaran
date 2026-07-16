/**
 * Gotra vocabulary.
 * This is a semi-open seed list per D-05.
 * A no-match is a valid, expected outcome (stored as-heard), and we should never force
 * a gotra to the nearest entry if it exceeds the threshold (GOTRA_MAX_EDITS = 1).
 */

import { VocabEntry } from "./types";

export const gotraVocab: VocabEntry[] = [
  { canonical: "Kashyap", variants: ["कश्यप", "Kashyapa", "Kasiapa"] },
  { canonical: "Bharadwaj", variants: ["भारद्वाज", "Bhardwaj", "Bharadwaja"] },
  { canonical: "Vashishtha", variants: ["वशिष्ठ", "Vasishtha", "Vashistha", "Vashisht"] },
  { canonical: "Vishwamitra", variants: ["विश्वामित्र", "Viswamitra", "Vishvamitra"] },
  { canonical: "Atri", variants: ["अत्रि"] },
  { canonical: "Gautam", variants: ["गौतम", "Gautama"] },
  { canonical: "Jamadagni", variants: ["जमदग्नि", "Jamadagnya"] },
  { canonical: "Agastya", variants: ["अगस्त्य", "Agasti"] },
  { canonical: "Shandilya", variants: ["शांडिल्य", "Sandilya", "Shandilya"] },
  { canonical: "Garg", variants: ["गर्ग", "Garga"] },
  { canonical: "Kaushik", variants: ["कौशिक", "Koushik", "Kaushika"] },
  { canonical: "Parashar", variants: ["पराशर", "Parashara", "Parasara", "Parashur"] },
  { canonical: "Vatsa", variants: ["वत्स", "Vats"] },
  { canonical: "Angirasa", variants: ["अंगिरस", "Angiras", "Angirasa"] },
  // Additional seed gotras
  { canonical: "Harita", variants: ["हरित", "Haritasya"] },
  { canonical: "Kanva", variants: ["कण्व"] },
  { canonical: "Bhrigu", variants: ["भृगु"] },
  { canonical: "Upamanyu", variants: ["उपमन्यु"] },
  { canonical: "Mudgala", variants: ["मुद्गल", "Maudgalya"] },
  { canonical: "Atreya", variants: ["आत्रेय"] },
  { canonical: "Kaundinya", variants: ["कौंडिन्य", "Kondinya"] },
  { canonical: "Sankriti", variants: ["सांकृति"] },
  { canonical: "Alambayana", variants: ["आलंबायन"] },
  { canonical: "Vadhula", variants: ["वाधुल"] },
  { canonical: "Katyayana", variants: ["कात्यायन"] },
  { canonical: "Dhanvantari", variants: ["धन्वन्तरि"] },
  { canonical: "Maitreya", variants: ["मैत्रेय"] },
  { canonical: "Sanatana", variants: ["सनातन"] },
  { canonical: "Shaunaka", variants: ["शौनक"] },
  { canonical: "Udgata", variants: ["उद्गाता"] },
  { canonical: "Vatsyayana", variants: ["वात्स्यायन"] },
  { canonical: "Bhargava", variants: ["भार्गव"] },
  { canonical: "Audala", variants: ["औदाल"] },
  { canonical: "Pippalada", variants: ["पिप्पलाद"] },
  { canonical: "Kapila", variants: ["कपिल"] },
  { canonical: "Dattatreya", variants: ["दत्तात्रेय"] },
  { canonical: "Chyavana", variants: ["च्यवन"] },
  { canonical: "Markandeya", variants: ["मार्कंडेय"] },
  { canonical: "Valmiki", variants: ["वाल्मीकि"] },
  { canonical: "Vyasa", variants: ["व्यास"] },
  { canonical: "Pulastya", variants: ["पुलस्त्य"] },
  { canonical: "Pulaha", variants: ["पुलह"] },
  { canonical: "Kratu", variants: ["क्रतु"] },
  { canonical: "Daksha", variants: ["दक्ष"] },
  { canonical: "Manu", variants: ["मनु"] },
  { canonical: "Marichi", variants: ["मरीचि"] }
];
