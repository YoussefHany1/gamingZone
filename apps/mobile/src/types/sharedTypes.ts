/**
 * App-wide types that were never specific to one feature.
 *
 * The domain models themselves live in `@gaming-zone/core` and are re-exported
 * here for call sites that already import from this module. Never re-declare
 * one of them locally — `npm run check:models` fails the build if you do.
 */
export type { CountdownResult, Game, GamingEvent } from "@gaming-zone/core";

export type UserList = {
  id: string;
  name: string;
  isChecked: boolean;
};

export type PickerOption = {
  label: string;
  value: string;
};
