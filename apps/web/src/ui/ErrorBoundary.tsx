import { Component, type ReactNode } from 'react';

type Props = { fallback: (message: string) => ReactNode; children: ReactNode };
type State = { message: string | null };

/** Keeps a crash in one view (say, a lost WebGL context) from taking down the player. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { message: null };

  static getDerivedStateFromError(e: unknown): State {
    return { message: e instanceof Error ? e.message : String(e) };
  }

  override render() {
    return this.state.message === null ? this.props.children : this.props.fallback(this.state.message);
  }
}
