import React, { Component, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import crashlytics from "@react-native-firebase/crashlytics";
import COLORS from "@/src/constants/colors";

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
  state: State = { hasError: false, errorMessage: "" };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
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
    this.setState({ hasError: false, errorMessage: "" });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        {this.props.sectionLabel ? (
          <Text style={styles.section}>Section: {this.props.sectionLabel}</Text>
        ) : null}
        <ScrollView style={styles.messageBox}>
          <Text style={styles.message}>{this.state.errorMessage}</Text>
        </ScrollView>
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleRetry}
          activeOpacity={0.8}
          accessibilityLabel="Retry"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
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
    textAlign: "center",
  },
  section: {
    fontSize: 13,
    color: COLORS.secondary,
    marginBottom: 12,
  },
  messageBox: {
    maxHeight: 120,
    width: "100%",
    backgroundColor: COLORS.darkBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24,
  },
  message: {
    fontSize: 12,
    color: COLORS.lightGray,
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: COLORS.button,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  buttonText: {
    color: COLORS.textLight,
    fontWeight: "600",
    fontSize: 15,
  },
});
