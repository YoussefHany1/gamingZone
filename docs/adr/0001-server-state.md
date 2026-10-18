# ADR 0001 — Server state management

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** mobile owner(s)

## Context

`apps/mobile` currently contains four overlapping ways to obtain remote data:

| Mechanism | Where | Notes |
|---|---|---|
| `useCachedData` (MMKV stale-while-revalidate) | `src/hooks/useCachedData.ts`, ~18 call sites | Documented: MMKV cache + NetInfo connectivity cache + per-key TTL |
| Firestore `onSnapshot` subscriptions | `features/lists/hooks/*`, `useGameDetails`, `useRecommendedGames` | Real-time data that must stay live |
| Zustand stores | `useAuthStore`, `useThemeStore`, `useAdsStore`, `useTabBarStore` | Client state, not server state |
| **TanStack React Query** | `App.tsx:18,58-66,355` | A `QueryClientProvider` with a configured client (`staleTime: 5m`, `gcTime: 30m`, `retry: 2`) and **zero consumers** |

React Query is wired up but nothing in the repository calls `useQuery`, `useMutation`, or
`queryClient`. The configuration implies an intended migration that never happened.

## Decision

**Retire React Query** and keep `useCachedData` as the single caching primitive for
browsable, non-realtime server data.

- `useCachedData` stays the default for cached lists/detail screens (games, news, events).
- Firestore subscriptions stay for genuinely realtime data (the user's own lists).
- Zustand stays for client state only.
- React Query's provider and dependency are removed.

If a future requirement genuinely needs what React Query offers (background refetching,
request de-duplication across screens, mutation state machines), that should arrive as a
new ADR that supersedes this one — not as leftover provider boilerplate.

## Consequences

- ~1 dependency removed from the mobile bundle; one less cache with its own invalidation
  semantics to reason about.
- Screen-level refresh/`refetch` behaviour continues to come from `useCachedData` (already
  the case everywhere).
- Anyone re-adding React Query must first supersede this ADR.

## Follow-up

- Remove `QueryClientProvider` + `QueryClient` from `App.tsx` and drop
  `@tanstack/react-query` from `apps/mobile/package.json`.
