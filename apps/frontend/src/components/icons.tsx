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

type ChromeIconName =
  "undo" | "redo" | "share" | "spark" | "check" | "cloud" | "chevron" | "lock" | "close" | "search";

const CHROME_PATHS: Record<ChromeIconName, JSX.Element> = {
  undo: <path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" />,
  redo: <path d="m15 7 5 5-5 5M19 12h-8a6 6 0 0 0-6 6" />,
  share: (
    <>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
    </>
  ),
  spark: (
    <path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4zM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6z" />
  ),
  check: <path d="m5 12 4 4L19 6" />,
  cloud: <path d="M7.5 18.5h9a4 4 0 0 0 .7-7.9A5.5 5.5 0 0 0 6.6 9.2 4.8 4.8 0 0 0 7.5 18.5Z" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4.5 4.5" />
    </>
  ),
};

export function ChromeIcon({
  name,
  size = 16,
}: {
  readonly name: ChromeIconName;
  readonly size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {CHROME_PATHS[name]}
    </svg>
  );
}
