import { storage } from "@/src/lib/storage";
import type { FeedbackType } from "../types";

// ─── EmailJS config ───────────────────────────────────────────────────────────

const EMAILJS_SERVICE_ID = (
  process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID ?? ""
).replace(/^"|"$/g, "");
const EMAILJS_TEMPLATE_ID = (
  process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID ?? ""
).replace(/^"|"$/g, "");
const EMAILJS_PUBLIC_KEY = (process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY ?? "").replace(
  /^"|"$/g,
  "",
);

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

// ─── Form constants ───────────────────────────────────────────────────────────

export const MAX_MESSAGE_LENGTH = 5000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(address: string): boolean {
  return EMAIL_REGEX.test(address);
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
//
// Backed by synchronous MMKV reads, so a submission can be checked and recorded
// without an await between the check and the send.

export const MAX_MESSAGES_PER_HOUR = 5;

const RATE_LIMIT_KEY = "contact_rate_limit_timestamps";
const ONE_HOUR_MS = 3_600_000;

/** Timestamps of the messages submitted within the last hour. */
export function getRecentSubmissions(): number[] {
  try {
    const raw = storage.getString(RATE_LIMIT_KEY);
    if (!raw) return [];

    const all: number[] = JSON.parse(raw);
    const now = Date.now();
    return all.filter((timestamp) => now - timestamp < ONE_HOUR_MS);
  } catch {
    return [];
  }
}

/** Records a submission on top of the given (already-pruned) timestamps. */
export function recordSubmission(recentSubmissions: number[]): void {
  try {
    storage.set(
      RATE_LIMIT_KEY,
      JSON.stringify([...recentSubmissions, Date.now()]),
    );
  } catch {
    // silently fail — don't block the user on storage errors
  }
}

// ─── Sending ──────────────────────────────────────────────────────────────────

export type FeedbackPayload = {
  type: FeedbackType;
  message: string;
  email: string;
  uid: string | null;
};

/** Posts the feedback to EmailJS. Throws when the API rejects the request. */
export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  const response = await fetch(EMAILJS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        feedback_type: payload.type,
        message: payload.message,
        from_email: payload.email || "(not provided)",
        user_id: payload.uid ?? "anonymous",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EmailJS HTTP Error: ${response.status} ${errorText}`);
  }
}
