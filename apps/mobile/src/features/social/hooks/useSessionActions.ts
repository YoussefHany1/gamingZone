import { useCallback, useEffect, useRef } from "react";
import {
  cancelSession,
  confirmSession,
  leaveSession,
  respondToSlot,
  withdrawProposal,
} from "../lib/sessionService";
import type { SessionActionKind } from "../lib/sessionView";

export type SessionActionHandler = (
  sessionId: string,
  proposalId: string,
  action: SessionActionKind,
) => Promise<void>;

export type SessionActionErrorHandler = (
  error: unknown,
  action: SessionActionKind,
) => void;

/**
 * Maps a session-card action to its backend call and normalises failures.
 *
 * The returned handler is stable for the lifetime of the component, so it can
 * be passed to memoized cards; the error callback is read from a ref and may
 * be an inline function without re-creating the handler.
 */
export function useSessionActions(
  onError?: SessionActionErrorHandler,
): SessionActionHandler {
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  return useCallback(
    async (
      sessionId: string,
      proposalId: string,
      action: SessionActionKind,
    ): Promise<void> => {
      try {
        switch (action) {
          case "accept":
            await respondToSlot(sessionId, proposalId, "accepted");
            break;
          case "decline":
            await respondToSlot(sessionId, proposalId, "declined");
            break;
          case "withdraw":
            await withdrawProposal(sessionId, proposalId);
            break;
          case "confirm":
            await confirmSession(sessionId, proposalId);
            break;
          case "cancel":
            await cancelSession(sessionId);
            break;
          case "leave":
            await leaveSession(sessionId);
            break;
        }
      } catch (error) {
        onErrorRef.current?.(error, action);
      }
    },
    [],
  );
}
