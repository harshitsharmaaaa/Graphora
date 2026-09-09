import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly variant?: "primary" | "secondary";
}

/**
 * Minimal shared button. Deliberately unstyled-framework-free (plain CSS
 * classes defined in `button.css`-in-JS below via inline styles would be
 * overkill) — just enough to prove `@eraser/ui` resolves from `apps/frontend`.
 * A real design system lands in a later phase.
 */
export function Button({ children, variant = "primary", type, ...rest }: ButtonProps) {
  const background = variant === "primary" ? "#4f46e5" : "#e5e7eb";
  const color = variant === "primary" ? "#ffffff" : "#111827";
  return (
    <button
      type={type ?? "button"}
      style={{
        background,
        color,
        border: "none",
        borderRadius: 8,
        padding: "8px 16px",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
