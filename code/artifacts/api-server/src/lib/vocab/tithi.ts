import { VocabEntry } from "./types";

export interface TithiVocabEntry extends VocabEntry {
  tithiNumber: number;
  impliedPaksha?: "Shukla" | "Krishna";
}

export const tithiVocab: TithiVocabEntry[] = [
  { canonical: "Pratipada", variants: ["पड़वा"], tithiNumber: 1 },
  { canonical: "Dwitiya", variants: ["दूज"], tithiNumber: 2 },
  { canonical: "Tritiya", variants: ["तीज"], tithiNumber: 3 },
  { canonical: "Chaturthi", variants: ["चौथ"], tithiNumber: 4 },
  { canonical: "Panchami", variants: [], tithiNumber: 5 },
  { canonical: "Shashthi", variants: ["छठ"], tithiNumber: 6 },
  { canonical: "Saptami", variants: [], tithiNumber: 7 },
  { canonical: "Ashtami", variants: [], tithiNumber: 8 },
  { canonical: "Navami", variants: [], tithiNumber: 9 },
  { canonical: "Dashami", variants: [], tithiNumber: 10 },
  { canonical: "Ekadashi", variants: ["ग्यारस"], tithiNumber: 11 },
  { canonical: "Dwadashi", variants: ["बारस"], tithiNumber: 12 },
  { canonical: "Trayodashi", variants: ["तेरस"], tithiNumber: 13 },
  { canonical: "Chaturdashi", variants: ["चौदस"], tithiNumber: 14 },
  { canonical: "Purnima", variants: ["पूनम"], tithiNumber: 15, impliedPaksha: "Shukla" },
  { canonical: "Amavasya", variants: ["अमावस"], tithiNumber: 15, impliedPaksha: "Krishna" },
];
