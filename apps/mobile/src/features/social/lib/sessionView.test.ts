import { describe, expect, it } from "vitest";
import type { PlaySession } from "../hooks/usePlaySessions";
import { activeProposal, deriveSessionView, sessionInitials } from "./sessionView";

const UID = "me";
const OTHER = "other";

function makeSession(overrides: Partial<PlaySession> = {}): PlaySession {
  return {
    id: "session-1",
    conversationId: "conversation-1",
    participantUids: [UID, OTHER],
    gameId: 1,
    gameName: "Halo",
    proposals: [
      {
        id: "proposal-1",
        proposerUid: UID,
        startsAt: 1_000,
        durationMin: 60,
        responses: { [UID]: "accepted", [OTHER]: "accepted" },
        status: "pending",
      },
    ],
    confirmedProposalId: null,
    startsAt: null,
    status: "proposed",
    ...overrides,
  };
}

describe("activeProposal", () => {
  it("ignores withdrawn proposals", () => {
    const session = makeSession({
      proposals: [
        {
          id: "withdrawn",
          proposerUid: UID,
          startsAt: 1,
          durationMin: 60,
          responses: {},
          status: "withdrawn",
        },
        {
          id: "pending",
          proposerUid: UID,
          startsAt: 2,
          durationMin: 60,
          responses: {},
        },
      ],
    });
    expect(activeProposal(session)?.id).toBe("pending");
  });

  it("returns undefined when every proposal is withdrawn", () => {
    const session = makeSession({
      proposals: [
        {
          id: "withdrawn",
          proposerUid: UID,
          startsAt: 1,
          durationMin: 60,
          responses: {},
          status: "withdrawn",
        },
      ],
    });
    expect(activeProposal(session)).toBeUndefined();
  });
});

describe("sessionInitials", () => {
  it("uses the first two characters uppercased", () => {
    expect(sessionInitials("valorant")).toBe("VA");
  });

  it("falls back when the name is blank", () => {
    expect(sessionInitials("   ")).toBe("GZ");
  });
});

describe("deriveSessionView", () => {
  it("offers accept and withdraw states for the proposer (confirm is automatic)", () => {
    const view = deriveSessionView(makeSession(), UID, "social");
    expect(view.accepted).toBe(true);
    expect(view.everyoneAccepted).toBe(true);
    expect(view.actions).toMatchObject({
      accept: false,
      decline: true,
      withdraw: true,
      // The backend auto-confirms on the final acceptance; users never tap confirm.
      confirm: false,
    });
  });

  it("offers accept to a participant who has not responded", () => {
    const session = makeSession({
      proposals: [
        {
          id: "proposal-1",
          proposerUid: OTHER,
          startsAt: 1_000,
          durationMin: 60,
          responses: { [UID]: "pending", [OTHER]: "accepted" },
        },
      ],
    });
    const view = deriveSessionView(session, UID, "social");
    expect(view.accepted).toBe(false);
    expect(view.everyoneAccepted).toBe(false);
    expect(view.actions).toMatchObject({
      accept: true,
      decline: false,
      withdraw: false,
      confirm: false,
    });
  });

  it("never offers proposal actions outside the proposed state", () => {
    const session = makeSession({ status: "confirmed" });
    const view = deriveSessionView(session, UID, "social");
    expect(view.actions).toMatchObject({
      accept: false,
      decline: false,
      withdraw: false,
      confirm: false,
    });
  });

  it("keeps the social lifecycle controls until the session is cancelled", () => {
    const confirmed = deriveSessionView(
      makeSession({ status: "confirmed" }),
      UID,
      "social",
    );
    expect(confirmed.actions.leave).toBe(true);
    expect(confirmed.actions.cancel).toBe(true);

    const completed = deriveSessionView(
      makeSession({ status: "completed" }),
      UID,
      "social",
    );
    expect(completed.actions.leave).toBe(true);
    expect(completed.actions.cancel).toBe(false);

    const cancelled = deriveSessionView(
      makeSession({ status: "cancelled" }),
      UID,
      "social",
    );
    expect(cancelled.actions.leave).toBe(false);
    expect(cancelled.actions.cancel).toBe(false);
  });

  it("only lets a participant cancel a social session", () => {
    const outsider = deriveSessionView(
      makeSession({ participantUids: [OTHER] }),
      UID,
      "social",
    );
    expect(outsider.actions.cancel).toBe(false);
  });

  it("uses the chat lifecycle controls", () => {
    const proposed = deriveSessionView(makeSession(), UID, "chat");
    expect(proposed.actions.cancel).toBe(true);

    const confirmed = deriveSessionView(
      makeSession({ status: "confirmed" }),
      UID,
      "chat",
    );
    expect(confirmed.actions.cancel).toBe(false);
    expect(confirmed.actions.leave).toBe(true);
  });

  it("handles a session without a proposal", () => {
    const view = deriveSessionView(makeSession({ proposals: [] }), UID, "social");
    expect(view.proposal).toBeUndefined();
    expect(view.everyoneAccepted).toBe(false);
    expect(view.actions.accept).toBe(false);
    expect(view.actions.confirm).toBe(false);
  });
});
