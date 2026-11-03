import { callSocialApi } from "./socialApi";

export type SessionLinkInput = {
  label?: string | null;
  url: string;
};

export type SessionInput = {
  conversationId: string;
  gameId: string | number;
  gameName: string;
  /** Optional initial party-room links; the backend normalizes and drops bad rows. */
  links?: SessionLinkInput[];
};

export const createPlaySession = (input: SessionInput) =>
  callSocialApi<{ sessionId: string }>("/social/sessions", input);

export const proposeSlot = (
  sessionId: string,
  startsAt: number | string,
  durationMin = 60,
) => callSocialApi<{ proposalId: string }>("/social/sessions/propose", {
  sessionId,
  startsAt,
  durationMin,
});

export const respondToSlot = (
  sessionId: string,
  proposalId: string,
  response: "accepted" | "declined",
) => callSocialApi("/social/sessions/respond", { sessionId, proposalId, response });

export const withdrawProposal = (sessionId: string, proposalId: string) =>
  callSocialApi("/social/sessions/withdraw", { sessionId, proposalId });

export const confirmSession = (sessionId: string, proposalId: string) =>
  callSocialApi("/social/sessions/confirm", { sessionId, proposalId });

export const cancelSession = (sessionId: string) =>
  callSocialApi("/social/sessions/cancel", { sessionId });

export const leaveSession = (sessionId: string) =>
  callSocialApi("/social/sessions/leave", { sessionId });

/** Creator-only add/remove of a party-room link on an existing session. */
export const updateSessionLinks = (
  sessionId: string,
  action: "add" | "remove",
  link: SessionLinkInput & { id?: string },
) =>
  callSocialApi<{ links: SessionLinkInput[] }>("/social/sessions/links", {
    sessionId,
    action,
    link,
  });
