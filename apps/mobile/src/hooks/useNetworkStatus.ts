import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Returns a boolean that is `true` when the device is definitively offline.
 *
 * The value starts as `false` (treated as online) until NetInfo reports an
 * authoritative state, so we never flash a banner on cold start.
 */
export function useNetworkStatus(): boolean {
  const [isOffline, setIsOffline] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  return isOffline;
}

export default useNetworkStatus;