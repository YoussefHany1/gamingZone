import { describe, expect, it } from "vitest";
import { deriveRelation, emptyRelationState } from "./relation";

describe("deriveRelation", () => {
  it("reports no relationship for an untouched pair", () => {
    expect(deriveRelation(emptyRelationState)).toBe("none");
  });

  it("reports an outgoing pending request", () => {
    expect(deriveRelation({ ...emptyRelationState, requestSent: true })).toBe("sent");
  });

  it("reports an incoming pending request", () => {
    expect(deriveRelation({ ...emptyRelationState, requestReceived: true })).toBe(
      "received",
    );
  });

  it("shows the actionable side when both directions are pending", () => {
    expect(
      deriveRelation({
        ...emptyRelationState,
        requestSent: true,
        requestReceived: true,
      }),
    ).toBe("received");
  });

  it("reports a friendship even if a request document is still pending", () => {
    expect(
      deriveRelation({
        ...emptyRelationState,
        friendshipActive: true,
        requestSent: true,
        requestReceived: true,
      }),
    ).toBe("friends");
  });

  it("lets a block win over every other state", () => {
    expect(
      deriveRelation({
        friendshipActive: true,
        requestSent: true,
        requestReceived: true,
        blocked: true,
      }),
    ).toBe("blocked");
  });
});
