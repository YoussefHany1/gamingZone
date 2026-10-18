# ADR 0002 — Typed linting is broken by a peer-dependency conflict (known issue)

- **Status:** Known issue / accepted risk (temporary)
- **Date:** 2026-10-17

## Context

`npm run lint` **crashes** for `apps/web` and `apps/backend`:

```
Oops! Something went wrong! :(
ESLint: 10.7.0
TypeError: Cannot read properties of undefined (reading 'Cjs')
    at @typescript-eslint/typescript-estree/dist/create-program/shared.js:59:18
```

Root cause — an unsatisfiable peer combination in the hoisted dependency tree:

| Package | Version resolved at the repo root | Declared by |
|---|---|---|
| `typescript` | **7.0.2** | `apps/backend` (`^7.0.2`) |
| `@typescript-eslint/*` | **8.64.0** | `apps/backend` (`^8.63.0`) |
| `eslint` | **10.7.0** | `apps/backend` (`^10.7.0`) |

`@typescript-eslint@8` (currently the newest published major — there is no v9) declares:

```json
"peerDependencies": { "typescript": ">=4.8.4 <6.1.0", "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0" }
```

So it supports ESLint 10, but **not TypeScript 7**. Its `typescript-estree` package resolves
`typescript` from the hoisted root and reads an enum member that no longer exists in TS 7.

`apps/web` is affected transitively: it declares `typescript: ^5` (so it has its own nested
TS 5 copy) but declares no `@typescript-eslint` of its own, so it resolves the hoisted
v8 package — which then loads the hoisted TS 7.

`apps/mobile` is unaffected: it pins `eslint ^8.57.1`, `typescript ~6.0.3` and
`@typescript-eslint ^7.18.0`, so its nested copies are self-consistent. Mobile lint runs
and is gated in CI with a `--max-warnings` ratchet.

**Net effect: `apps/web` and `apps/backend` have had no working lint coverage.**

## Decision

Do not block CI on those two lints yet. They run with `continue-on-error: true` in
`.github/workflows/ci.yml`, with a comment pointing here. Everything else about those two
workspaces is gated (typecheck, and tests for the backend).

The peer conflict is a dependency-management change with its own blast radius (it can
change which rules fire and therefore surface a large set of pre-existing violations), so it
is deliberately **not** bundled into the guardrails PR.

## Resolution options (pick one, then make the lints blocking)

1. **Downgrade backend TypeScript** to `~6.0.3` (matching mobile). Cheapest, but must be
   verified against backend sources in case TS 7-only syntax/behaviour is in use.
2. **Add an explicit `typescript` + `@typescript-eslint` pair to `apps/web`** so it stops
   inheriting the hoisted pair, and downgrade the backend's TS as in (1) so one version
   satisfies both.
3. **Wait for `@typescript-eslint` v9** (supports TS 7) and upgrade `eslint` +
   `@typescript-eslint` together across `apps/web` and `apps/backend`.

Whichever is chosen, expect a first run to surface a backlog of violations; baseline that
backlog with `--max-warnings` per workspace, the same ratchet used for mobile.

## Consequences

- CI is honest about the current state instead of either failing on a tooling crash or
  silently skipping lint.
- Until resolved, style/type-rule regressions in `apps/web` and `apps/backend` are caught by
  the typechecker and tests only.
