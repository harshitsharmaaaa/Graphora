/**
 * Reusable toolbar primitives: stateful tool button (default/hover/active/
 * focus/disabled) with a CSS-only tooltip carrying the keyboard shortcut.
 * Active state never relies on color alone (background + border + icon
 * contrast + an indicator bar).
 */
import type { ReactNode } from "react";

export function ToolButton({
  active,
  label,
  shortcut,
  onClick,
  disabled,
  children,
}: {
  readonly active?: boolean;
  readonly label: string;
  readonly shortcut?: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}) {
  const tip = shortcut === undefined || shortcut === "" ? label : `${label} · ${shortcut}`;
  return (
    <button
      type="button"
      className={active === true ? "tool-button active" : "tool-button"}
      aria-pressed={active === true}
      aria-label={label}
      data-tip={tip}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ToolbarDivider() {
  return <span className="toolbar-divider" aria-hidden="true" />;
}
