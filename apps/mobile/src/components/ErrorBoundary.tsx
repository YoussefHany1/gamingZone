import React, { Component, ReactNode } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import crashlytics from "@react-native-firebase/crashlytics";
import COLORS from "@/src/constants/colors";
import CustomText from "./CustomText";
import Svg, { Path } from "react-native-svg";
import ContactScreen from "../features/settings/screens/ContactScreen";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  /** The subtree to guard. */
  children: ReactNode;
  /**
   * Optional custom fallback UI.
   * If omitted the built-in fallback is shown.
   */
  fallback?: ReactNode;
  /**
   * Optional label shown in the fallback header — e.g. the screen name.
   * Useful for narrowing down which section crashed.
   */
  sectionLabel?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  showContactScreen: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Catches synchronous render errors anywhere in the subtree,
 * reports them to Firebase Crashlytics, and renders a recovery UI
 * instead of a blank crash screen.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary sectionLabel="GameDetails">
 *   <GameDetailsScreen />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: "", showContactScreen: false };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message, showContactScreen: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Report to Crashlytics — non-fatal so the session continues
    crashlytics().log(
      `[ErrorBoundary] section="${this.props.sectionLabel ?? "unknown"}" — ${error.message}`,
    );
    crashlytics().recordError(error);
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: "", showContactScreen: false });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.state.showContactScreen) {
      return (
        <ContactScreen
          navigation={
            { goBack: () => this.setState({ showContactScreen: false }) } as any
          }
          route={{} as any}
        />
      );
    }

    if (this.props.fallback) return this.props.fallback;

    return (
      <View style={styles.container}>
        <Svg fill="#779bdd" width="50px" height="50px" viewBox="0 0 256 256" id="Flat">
          <Path d="M116,136V104a12,12,0,0,1,24,0v32a12,12,0,0,1-24,0Zm124.23242,77.979a27.71154,27.71154,0,0,1-24.25586,14.01319H40.02344A28.00034,28.00034,0,0,1,15.79,185.96582L103.7666,33.97314v.00049a27.99988,27.99988,0,0,1,48.4668,0L240.21,185.96533A27.71359,27.71359,0,0,1,240.23242,213.979Zm-20.79394-15.99072L131.46191,45.99609a4.00012,4.00012,0,0,0-6.92382,0h0L36.56152,197.98828a4.0004,4.0004,0,0,0,3.46192,6.00391H215.97656a4.0004,4.0004,0,0,0,3.46192-6.00391ZM128,160a16,16,0,1,0,16,16A16.00016,16.00016,0,0,0,128,160Z" />
        </Svg>
        <CustomText style={styles.title}>Something went wrong</CustomText>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleRetry}
            activeOpacity={0.8}
            accessibilityLabel="Retry"
            accessibilityRole="button"
          >
            <CustomText style={styles.buttonText}>Try again</CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.contactButton]}
            onPress={() => this.setState({ showContactScreen: true })}
            activeOpacity={0.8}
          >
            <CustomText style={styles.buttonText}>Contact Support</CustomText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textLight,
    marginBottom: 8,
    marginTop: 18,
    textAlign: "center",
  },
  section: {
    fontSize: 13,
    color: COLORS.secondary,
    marginBottom: 12,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  button: {
    backgroundColor: COLORS.button,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  contactButton: {
    backgroundColor: COLORS.secondary,
  },
  buttonText: {
    color: COLORS.textLight,
    fontWeight: "600",
    fontSize: 15,
  },
});
