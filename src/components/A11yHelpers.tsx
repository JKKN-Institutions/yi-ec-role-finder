// Accessibility helper components and utilities

import { ReactNode } from "react";

interface VisuallyHiddenProps {
  children: ReactNode;
}

// Screen reader only content
export const VisuallyHidden = ({ children }: VisuallyHiddenProps) => (
  <span className="sr-only">{children}</span>
);

// Skip to main content link for keyboard navigation
export const SkipToMain = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
  >
    Skip to main content
  </a>
);

// Announce dynamic content changes to screen readers
export const LiveRegion = ({ children, priority = "polite" }: { children: ReactNode; priority?: "polite" | "assertive" }) => (
  <div role="status" aria-live={priority} aria-atomic="true" className="sr-only">
    {children}
  </div>
);
