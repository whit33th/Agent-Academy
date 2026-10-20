"use client";
import { Component, type ReactNode } from "react";

export default class CollectionBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <>
        <div
          role="alert"
          className="mb-4 border border-white/10 bg-val-surface p-4 text-sm text-white/65"
        >
          <p>
            Your cloud collection is unavailable. Your local catalog is still
            available.
          </p>
          <button
            type="button"
            className="mt-2 text-val-red underline"
            onClick={() => this.setState({ failed: false })}
          >
            Try again
          </button>
        </div>
        {this.props.fallback}
      </>
    );
  }
}
