import { ResearchLandscape } from "../types/landscape";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function searchField(query: string, useCache: boolean = true) {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, use_cache: useCache }),
  });
  if (!res.ok) {
    throw new Error(`Search failed: ${res.statusText}`);
  }
  return res.json();
}

export async function getLandscape(id: string): Promise<ResearchLandscape> {
  const res = await fetch(`${API_BASE}/landscape/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to load landscape: ${res.statusText}`);
  }
  return res.json();
}

export async function getRecentLandscapes() {
  const res = await fetch(`${API_BASE}/recent`);
  if (!res.ok) return [];
  return res.json();
}

export function getExportUrl(landscapeId: string, format: string): string {
  return `${API_BASE}/export/${landscapeId}?format=${format}`;
}
