import { create } from "zustand";
import analytics from "@react-native-firebase/analytics";

type PendingAction = (() => void) | null;

const PENDING_TTL_MS = 2 * 60 * 1000;

interface AuthGateState {
  visible: boolean;
  pendingAction: PendingAction;
  returnTo: string | null;
  createdAt: number | null;
  /** When true, a completed auth should wait for setup wizard before resuming. */
  wizardHold: boolean;
}

interface AuthGateActions {
  /** Show the auth gate, optionally storing an action to resume after sign-in. */
  open: (opts?: { pendingAction?: () => void; returnTo?: string }) => void;
  /** Close without resuming the pending action (user dismissed). */
  dismiss: () => void;
  /** Mark that the setup wizard is blocking pending-action resume. */
  setWizardHold: (hold: boolean) => void;
  /**
   * Attempt to consume and run the pending action if it is still valid.
   * Returns true if an action was executed.
   */
  consumePendingAction: () => boolean;
  /** Drop any pending action (e.g. expired or invalid context). */
  clearPendingAction: () => void;
  /** Called after a successful authentication. Hides gate and, if no wizard hold, resumes. */
  onAuthenticated: () => void;
}

type AuthGateStore = AuthGateState & AuthGateActions;

const initialState: AuthGateState = {
  visible: false,
  pendingAction: null,
  returnTo: null,
  createdAt: null,
  wizardHold: false,
};

export const useAuthGateStore = create<AuthGateStore>()((set, get) => ({
  ...initialState,

  open: (opts) => {
    try {
      void analytics().logEvent("auth_gate_shown");
    } catch {
      // non-fatal
    }
    set({
      visible: true,
      pendingAction: opts?.pendingAction ?? null,
      returnTo: opts?.returnTo ?? null,
      createdAt: Date.now(),
    });
  },

  dismiss: () => {
    // Manual dismiss clears pending action so it never fires unexpectedly later.
    set({ visible: false, pendingAction: null, returnTo: null, createdAt: null });
  },

  setWizardHold: (hold) => set({ wizardHold: hold }),

  clearPendingAction: () =>
    set({ pendingAction: null, returnTo: null, createdAt: null }),

  consumePendingAction: () => {
    const { pendingAction, createdAt } = get();
    if (!pendingAction || !createdAt) return false;
    const expired = Date.now() - createdAt > PENDING_TTL_MS;
    // Always clear before running to avoid re-entry.
    set({ pendingAction: null, returnTo: null, createdAt: null });
    if (expired) return false;
    try {
      pendingAction();
    } catch {
      // Swallow - action target may have unmounted; never crash the gate flow.
    }
    return true;
  },

  onAuthenticated: () => {
    try {
      void analytics().logEvent("auth_gate_converted");
    } catch {
      // non-fatal
    }
    const { wizardHold } = get();
    // Hide the gate UI; keep pending action around if wizard must run first.
    if (wizardHold) {
      set({ visible: false });
      return;
    }
    set({ visible: false });
    get().consumePendingAction();
  },
}));
