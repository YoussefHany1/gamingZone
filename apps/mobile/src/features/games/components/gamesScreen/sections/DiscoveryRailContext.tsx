import React, { createContext, useContext } from "react";
import { useDiscoveryRailKind } from "../../../hooks/useDiscoveryRailKind";
import type { DiscoveryRailDecision } from "../../../hooks/useDiscoveryRailKind";

const DiscoveryRailContext = createContext<DiscoveryRailDecision | null>(null);

/**
 * Resolves the discovery fallback chain once per screen and shares it with both
 * the rail itself and the quick-action chip, so their labels can never drift.
 */
export function DiscoveryRailProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const decision = useDiscoveryRailKind();
  return (
    <DiscoveryRailContext.Provider value={decision}>
      {children}
    </DiscoveryRailContext.Provider>
  );
}

/**
 * Outside a provider this defaults to the personalized rail (the historical
 * behaviour), so a misplaced consumer degrades gracefully instead of throwing.
 */
export function useDiscoveryRailDecision(): DiscoveryRailDecision {
  return (
    useContext(DiscoveryRailContext) ?? {
      kind: "recommended",
      ready: false,
      platform: null,
    }
  );
}
