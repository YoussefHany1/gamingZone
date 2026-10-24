import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/src/store/useAuthStore";
import { storage } from "@/src/lib/storage";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import AuthPromptModal from "@/src/components/AuthPromptModal";

const HIDE_KEY = "hide_auth_prompt";
const DELAY_MS = 2500;

export const useAuthPrompt = () => {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [visible, setVisible] = useState(false);
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (hasShownRef.current) return;
    if (user && !user.isAnonymous) return;

    const hideFlag = storage.getString(HIDE_KEY);
    if (hideFlag === "true") return;

    hasShownRef.current = true;

    const task = runAfterInteractions(() => {
      const timer = setTimeout(() => {
        setVisible(true);
      }, DELAY_MS);
      return () => clearTimeout(timer);
    });

    return () => task.cancel();
  }, [isLoading, user]);

  const dismiss = () => setVisible(false);

  return { visible, dismiss, AuthPromptModal };
};

export { AuthPromptModal };
export default useAuthPrompt;
