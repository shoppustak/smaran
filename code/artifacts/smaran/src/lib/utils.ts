import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatIndianCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function translateEventType(type: string) {
  const map: Record<string, string> = {
    'shraddh': 'Shraddh (Death Anniversary)',
    'katha': 'Satyanarayan Katha',
    'birthday': 'Janmadin (Birthday)',
    'griha_pravesh': 'Griha Pravesh',
    'namkaran': 'Namkaran Sanskar',
    'shanti': 'Shanti Puja'
  };
  return map[type] || type;
}

export function formatTithi(paksha: string, tithi: number) {
  const tithiNames = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", 
    paksha === "Shukla" ? "Purnima" : "Amavasya"
  ];
  const tName = tithi >= 1 && tithi <= 15 ? tithiNames[tithi - 1] : `Tithi ${tithi}`;
  return `${paksha} ${tName}`;
}
