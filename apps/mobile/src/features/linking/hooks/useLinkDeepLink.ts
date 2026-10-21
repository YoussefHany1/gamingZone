/**
 * useLinkDeepLink — routes the app's linking deep links to the right flow.
 *
 * The app is either already running (the "url" event) or cold-started by the
 * link (getInitialURL) — both have to reach the same handler the in-app
 * WebView intercept uses.
 */
import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import { STEAM_REDIRECT, XBOX_REDIRECT } from "@/src/features/linking/lib/constants";

export type LinkDeepLinkHandlers = {
  onSteam?: ((url: string) => Promise<void> | undefined) | undefined;
  onXbox?: ((url: string) => Promise<void> | undefined) | undefined;
};

export function useLinkDeepLink({
  onSteam,
  onXbox,
}: LinkDeepLinkHandlers): void {
  // The handlers are re-created whenever the account snapshot changes; the
  // listener itself must not be re-subscribed for that (it would re-run
  // `getInitialURL` and re-deliver an already handled launch URL).
  const handlersRef = useRef<LinkDeepLinkHandlers>({ onSteam, onXbox });

  useEffect(() => {
    handlersRef.current = { onSteam, onXbox };
  }, [onSteam, onXbox]);

  useEffect(() => {
    const dispatch = (url: string | null | undefined): void => {
      if (!url) return;
      if (url.startsWith(STEAM_REDIRECT)) void handlersRef.current.onSteam?.(url);
      else if (url.startsWith(XBOX_REDIRECT)) void handlersRef.current.onXbox?.(url);
    };

    const sub = Linking.addEventListener("url", (event) => dispatch(event.url));
    Linking.getInitialURL()
      .then((initial) => dispatch(initial))
      .catch(() => {
        /* no launch URL - nothing to recover */
      });
    return () => sub.remove();
  }, []);
}
