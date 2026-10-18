import { useCallback, useState } from "react";

export type UseHomeRefreshResult = {
  refreshing: boolean;
  /** Bumped on every pull-to-refresh; used to key/refresh the home sections. */
  refreshToken: number;
  handleRefresh: () => void;
};

/**
 * Pull-to-refresh state for the home screen. Bumping `refreshToken` remounts
 * the sections (re-running their staggered fetches), and the indicator is
 * stopped after a short delay so it doesn't spin indefinitely.
 */
export function useHomeRefresh(): UseHomeRefreshResult {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshToken, setRefreshToken] = useState<number>(0);

  const handleRefresh = useCallback((): void => {
    setRefreshing(true);
    setRefreshToken((token) => token + 1);
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  return { refreshing, refreshToken, handleRefresh };
}
