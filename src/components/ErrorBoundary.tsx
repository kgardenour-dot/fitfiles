import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Catches render/lifecycle errors in child trees so release builds don't quit silently.
 * Native crashes are not caught here — use device logs / TestFlight for those.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[FitLinks] ErrorBoundary', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.detail}>{this.state.error.message}</Text>
          <Pressable
            style={styles.button}
            onPress={() => this.setState({ error: null })}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  detail: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.buttonPrimary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 10,
  },
  buttonText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
