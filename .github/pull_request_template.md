## What & why

<!-- One paragraph. Link the issue/action-plan item. -->

## Scope

- [ ] Single screen / single feed section (refactors must not batch several sections)
- [ ] No behavioural change intended

## Refactor invariants

If this touches a screen or feed section, confirm every box (see
[`docs/refactor-smoke-checklist.md`](../docs/refactor-smoke-checklist.md)):

- [ ] Cache keys (`STORAGE_KEY` / `CACHE_KEY`) unchanged
- [ ] Deferral timings and skeleton heights unchanged
- [ ] Ads still gated by `useAdsEnabled()` and still deferred past the first frame
- [ ] i18n keys unchanged
- [ ] Rationale comments preserved

## Verification

- [ ] `npx tsc --noEmit -p tsconfig.json` clean (whole project, from `apps/mobile`)
- [ ] `npx eslint <touched paths> --ext .ts,.tsx` clean
- [ ] Smoke checklist run — device/OS noted below
- [ ] Exactly one network request per section after the change
- [ ] Before/after screenshots attached for any visual change

Device / OS used:
<!-- e.g. Pixel 6a, Android 14 / iPhone 13, iOS 18.2 -->

## Rollback

<!--
Single-PR revert is the rollback. Confirm the legacy implementation still exists in the
tree, or state explicitly that this PR deletes it and why that is safe.
-->
