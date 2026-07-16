import axios from "axios";
import { GameData, Website, PcRequirements } from "../types";

const SERVER_URL = "https://igdb-api-omega.vercel.app";

export function extractSteamAppId(websites?: Website[]): string | null {
  if (!websites) return null;
  const steamSite = websites.find((w) => w.type === 13);
  if (!steamSite) return null;
  const match = steamSite.url.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match ? match[1] : null;
}

export function parseSpecHtml(html: string) {
  const stripped = html.replace(/<[^>]+>/g, (tag) => {
    const lower = tag.toLowerCase();
    if (lower.startsWith("</li")) return "\n";
    if (lower.startsWith("<br")) return "\n";
    return "";
  });
  const rows: { label: string; value: string }[] = [];
  stripped.split("\n").forEach((line) => {
    const clean = line
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (!clean) return;
    const colonIdx = clean.indexOf(":");
    if (colonIdx > 0) {
      const label = clean
        .slice(0, colonIdx)
        .replace(/\s*\*$/, "")
        .trim();
      const value = clean.slice(colonIdx + 1).trim();
      if (label && value && !/additional/i.test(label))
        rows.push({ label, value });
    }
  });
  return rows;
}

export async function fetchSteamRequirements(appId: string): Promise<PcRequirements | null> {
  try {
    const res = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`,
      { timeout: 5000 },
    );
    const data = res.data?.[appId];
    if (!data?.success || !data?.data?.pc_requirements) return null;
    const reqs = data.data.pc_requirements;
    return {
      minimum: reqs.minimum ? parseSpecHtml(reqs.minimum) : [],
      recommended: reqs.recommended ? parseSpecHtml(reqs.recommended) : [],
    };
  } catch {
    return null;
  }
}

export async function fetchGameDetails(id: string): Promise<GameData | null> {
  try {
    const res = await axios.get<GameData>(`${SERVER_URL}/game-details`, {
      params: { id },
      timeout: 8000,
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching game details:", error);
    return null;
  }
}
