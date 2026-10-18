# Known gaps

Defects and design debts found while reviewing the codebase that the refactor
commits deliberately did **not** fix. None of them is a regression the refactor
introduced — each predates it and the refactor preserved the behaviour exactly,
so that a reviewer comparing before and after sees only structure moving, never a
quiet fix smuggled in. Each entry is a decision still open, recorded here so it is
not lost.

## 1. iOS gets no user feedback for action results

`ToastAndroid.show` is the app's only channel for reporting what happened after an
action: sign-in failed, list saved, share failed, Steam import failed, a rating
could not be written, a notification toggle did not stick. It is a **no-op on
iOS**, so on that platform every one of those actions completes in silence: 70 call
sites across 27 files.

Deliberately left as-is; this is its own phase entry rather than a change inside
the refactor. Two candidate fixes, neither taken yet:

- **An in-app toast** — a zustand store plus a small overlay mounted in `App.tsx`,
  then a mechanical sweep replacing the call sites. Non-blocking, identical on both
  platforms, and consistent with the store pattern used elsewhere; the cost is the
  overlay component and touching every call site.
- **A `src/lib/toast.ts` helper** — `ToastAndroid` on Android, `Alert.alert` on
  iOS. The smallest possible change, but every confirmation becomes a blocking
  modal on iOS, which is the wrong trade for something that fires this often.

Note that routing these through `src/lib/logger.ts` is not an alternative: the
logger is for the people maintaining the app, not for the person holding it.

## 2. Store prices can stay on their skeleton forever — FIXED

`useGameStorePrices` (`features/games/hooks/`) runs CheapShark and PSN in a
`Promise.all` with no rejection path:

```ts
Promise.all([fetchCheapSharkDeals(gameName), fetchPsnPrice(gameName, websites)])
  .then(([deals, psnPrice]) => { /* ...setStorePricesLoading(false) */ });
```

If either lookup rejects, `setStorePricesLoading(false)` never runs, so the prices
section shows its skeleton indefinitely and no error is surfaced.

**Fixed** as a deliberate ride-along after the Phase 3 migration: the promise
chain has a `.catch` that clears the loading flag and reports the failure through
`logger.error` (a Crashlytics non-fatal in release). Cancelled (superseded)
round-trips stay unlogged so superseded fetches don't add report noise.

## 3. PC requirements keep a stale loading flag — FIXED

`useGamePcRequirements` (`features/games/hooks/`) resets `pcRequirements` at the
top of its effect but not `pcReqLoading`:

```ts
setPcRequirements(null);
const appId = extractSteamAppId(websites);
if (!appId) return;          // <-- loading flag is not cleared on this path
setPcReqLoading(true);
```

The flag starts `false`, so a game without a Steam link is fine on first load. The
problem is the second load: once a game *with* a Steam link has set it `true`,
arriving at one without a link leaves it `true` with nothing in flight, and the
section keeps showing its skeleton.

**Fixed** as a deliberate ride-along after the Phase 3 migration:
`setPcReqLoading(false)` runs next to the `setPcRequirements(null)` reset at the
top of the effect, and a comment on the line records why it is load-bearing.

## 4. Two skeleton animation systems

`components/skeleton/shared.ts` (16 consumers) and
`features/games/skeleton/gameDetails/useShimmer.ts` (10 consumers) implement the
same shimmer effect independently. Consolidating them is worth doing, but it needs
the two timings compared frame by frame first — changing the feel of every loading
state is not something to fold into a structural refactor.

## 5. Double-encoded comments

Two files carry comment banners that were written as a UTF-8 box-drawing character
and later re-read as Latin-1, so each intended character is stored as three junk
ones: `features/games/types.ts` (4 lines) and
`features/games/components/gamesScreen/FreeGames.tsx` (2 lines). Cosmetic in the
app, but unreadable in review, and it is a trap for tooling: a scripted edit
touching those lines has to match the garbled bytes exactly, or the file ends up
with mixed encodings. Worth a single sweeping pass with a deliberate encoding
choice, kept away from functional commits — every one of those comment banners is
a section divider, so the intent is unambiguous.

The count above is incomplete: the sweep must also cover one more instance found
while porting that section (Phase 3, slice 7) — a double-encoded em dash in a
card comment of legacy
`features/games/components/gamesScreen/SteamTopSellers.tsx` line 194
(`Rank badge â€" Steam "Top Seller" ribbon style`). The ported
`sections/SteamTopSellersCard.tsx` carries the same comment rewritten cleanly, so
the file list for the sweep when the legacy file goes away.

## 6. ~~The rating colour scale is still screen-local~~ — FIXED (Phase 4)

FIXED in Phase 4: the section heading's concern was the aggregate-rating scale
cloning into shared card code, and the plan reordered to do the move *before*
any second consumer appeared. `getRatingGradient` now lives in
`src/constants/ratingColors.ts` (theme-independent semantic bands, reasoning in
the file doc) and the shared card layer imports it directly (`RecentGameCard`,
`TopRatedCard`); `gameDetails/utils.ts` re-exports it only as a compatibility
shim for its own consumers and the legacy files — the shim's removal is part of
the legacy-deletion PRs.

`getRatingColorCode` itself did **not** move: it is still consumed only inside
`gameDetails/utils.ts`, and Phase 4 found no second consumer for it, so the
"move before cloning, not after" rule resolves to "don't move yet".

For the record, the other helper-placement item from the review is already done:
`ReleaseCalendar`'s UTC calendar helpers live in `features/home/lib/calendarDates.ts`
and the component imports them. What remains in the component is `windowForToday`,
its window constants and the date-fns locale map — all pure, all fine where they
are until a second screen needs them.

## 7. `resolveLanguageCode("pt")` resolves to English

A device reporting generic Portuguese (no region) falls through every prefix check
and hits the `return "en"` default, so those users get the app in English. The
current behaviour is pinned by a test (`features/settings/lib/languages.test.ts`)
rather than silently changed, because the fix is a product call: bare `pt` should
mean `pt-BR`, `pt-PT`, or explicitly stay `en`.
