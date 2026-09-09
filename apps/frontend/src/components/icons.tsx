/**
 * Inline SVG tool icons (stroke = currentColor). Zero dependencies, crisp at
 * any DPR, high-contrast on the dark toolbar by construction.
 */
import type { JSX } from "react";
import type { ToolId } from "@eraser/editor-tools";

function Base({ children }: { readonly children: JSX.Element | readonly JSX.Element[] }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<ToolId, JSX.Element> = {
  select: (
    <Base>
      <path d="M6 3.5 18.5 12l-7 1.6L8.6 21z" />
    </Base>
  ),
  hand: (
    <Base>
      <path d="M8.5 12.5V6a1.5 1.5 0 0 1 3 0v5m0-6a1.5 1.5 0 0 1 3 0v6m0-4.5a1.5 1.5 0 0 1 3 0V12m0-2a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-1.6a6 6 0 0 1-4.8-2.4l-2.3-3a1.6 1.6 0 0 1 2.4-2l1.8 2.1" />
    </Base>
  ),
  rectangle: (
    <Base>
      <rect x="4" y="6" width="16" height="12" rx="1.5" />
    </Base>
  ),
  ellipse: (
    <Base>
      <ellipse cx="12" cy="12" rx="8" ry="6" />
    </Base>
  ),
  diamond: (
    <Base>
      <path d="M12 3.5 20 12l-8 8.5L4 12z" />
    </Base>
  ),
  line: (
    <Base>
      <path d="M5.5 18.5 18.5 5.5" />
      <circle cx="5.5" cy="18.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="5.5" r="1.3" fill="currentColor" stroke="none" />
    </Base>
  ),
  arrow: (
    <Base>
      <path d="M4.5 19.5 19 5M11.5 5H19v7.5" />
    </Base>
  ),
  freehand: (
    <Base>
      <path d="M3.5 16.5c2.5-7 4.5 2.5 7-3.5s4 4.5 7-.5 3-3.5 3-3.5" />
    </Base>
  ),
  text: (
    <Base>
      <path d="M5 5.5h14M12 5.5V19" />
    </Base>
  ),
  frame: (
    <Base>
      <rect x="4" y="4" width="16" height="16" rx="1.5" strokeDasharray="3.5 2.5" />
    </Base>
  ),
  image: (
    <Base>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M4.5 17 10 12.5l3.5 3 2.5-2 3.5 3" />
    </Base>
  ),
};

export function ToolIcon({ id }: { readonly id: ToolId }) {
  return ICONS[id];
}
