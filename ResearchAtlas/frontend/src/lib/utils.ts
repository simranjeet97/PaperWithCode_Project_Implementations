import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAuthors(authors: string[]): string {
  if (!authors || authors.length === 0) return "Unknown Authors";
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors[0]} et al.`;
}

export function getScoreBadgeColor(score: number): string {
  if (score >= 0.85) return "text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold";
  if (score >= 0.70) return "text-blue-700 bg-blue-50 border-blue-200 font-semibold";
  return "text-indigo-700 bg-indigo-50 border-indigo-200 font-semibold";
}

export function getDifficultyBadgeColor(diff: string): string {
  switch (diff.toLowerCase()) {
    case "foundational":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "intermediate":
      return "text-blue-700 bg-blue-50 border-blue-200";
    case "advanced":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "frontier":
      return "text-rose-700 bg-rose-50 border-rose-200";
    default:
      return "text-slate-700 bg-slate-100 border-slate-200";
  }
}
