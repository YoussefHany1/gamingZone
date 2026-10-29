import { callSocialApi } from "./socialApi";

export type SessionInput = {
  conversationId: string;
  gameId: string | number;
  gameName: string;
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
