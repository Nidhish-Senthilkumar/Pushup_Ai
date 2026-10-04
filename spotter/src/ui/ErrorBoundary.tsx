import { Component, type ReactNode } from "react";

/**
 * If a page crashes, show a way out instead of a blank screen. At a booth
 * there's nobody to open the developer tools.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app-glow grid min-h-screen place-items-center p-6 text-center" role="alert">
        <div className="card max-w-md p-6">
          <h1 className="display text-4xl">Something went wrong</h1>
          <p className="mt-2 text-ink-2">Spotter hit an unexpected error. Your saved workouts are safe.</p>
          <p className="mt-2 text-xs text-muted">{this.state.error.message}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              className="btn btn-volt"
              onClick={() => {
                window.location.hash = "#/";
                window.location.reload();
              }}
            >
              Back to start
            </button>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
