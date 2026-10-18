# Screen-refactor smoke checklist

Reusable per-screen verification for the decomposition work (see the code-review action
plan). Run this for **every** refactored screen and for every migrated feed section before
deleting the legacy implementation.

## 0. Automated gates

From `apps/mobile`:

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint <touched paths> --ext .ts,.tsx
```

Both must be clean. `tsc` must be run for the whole project, not just the touched files —
prop-drilling changes surface errors in call sites elsewhere.

## 1. Invariants (must not change)

These are load-bearing; a refactor that changes them is a behaviour change.

- [ ] Cache keys (`STORAGE_KEY`, `CACHE_KEY`) are byte-identical — otherwise users get a
      blank first paint on upgrade.
- [ ] Deferral timings are unchanged (`DeferredSection` delays, `runAfterInteractions`
      offsets). These exist to prevent the documented cold-start input-dispatch ANR.
- [ ] Skeleton placeholder heights are unchanged (prevents layout shift).
- [ ] Ads are still gated by `useAdsEnabled()` and still mount after the first frame.
- [ ] i18n keys are unchanged (no renamed/removed keys).
- [ ] Error-state rendering is still explicit and inline in the screen.
- [ ] Rationale comments preserved verbatim.

## 2. Behaviour

- [ ] **Cold start** with cleared MMKV (`react-native-mmkv`): skeletons render, layout does
      not shift when data lands.
- [ ] **Warm start**: cached data paints on the first frame (no blank flash) — this is the
      cache-key check in practice.
- [ ] **Airplane mode**: error/offline state shows; cached content still visible; no crash.
- [ ] **Empty payload**: the empty component renders (not a blank box).
- [ ] **Pull-to-refresh / focus refetch** where the screen has one.
- [ ] **Ad slot**: visible when ads are enabled, absent when disabled, absent from the first
      frame.
- [ ] **Navigation**: every card/row navigates to the correct screen with the correct
      params; back returns to the same scroll position.
- [ ] **Interaction**: presses, toggles, modals, forms behave as before.

## 3. Presentation

- [ ] **Theme**: switch light ↔ dark live; no color-literal leaks.
- [ ] **Locale**: EN + AR — all keys resolve, RTL layout intact.
- [ ] **Text metrics**: no truncation/overflow regressions from prop changes.

## 4. Performance / resilience

- [ ] Low-end device: scroll the screen/feed to the bottom with no jank and no ANR.
- [ ] Network panel: **exactly one request per section** — proves old and new
      implementations are not both mounted.
- [ ] Crashlytics: no new non-fatals after the change.

## 5. Record the result

Paste the completed checklist into the PR description (see
`.github/pull_request_template.md`), including which device/emulator and OS version were
used, and before/after screenshots for any visual change.
