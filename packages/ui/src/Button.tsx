import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly variant?: "primary" | "secondary" | "quiet" | "danger";
  readonly size?: "compact" | "regular";
}

/** Shared button primitive for surfaces outside the editor shell. */
export function Button({
  children,
  variant = "primary",
  size = "regular",
  type,
  style,
  ...rest
}: ButtonProps) {
  const palette = {
    primary: { background: "#30465e", border: "#617d9e", color: "#d7e7ff" },
    secondary: { background: "#181c23", border: "#35404d", color: "#e8edf3" },
    quiet: { background: "transparent", border: "transparent", color: "#a2adba" },
    danger: { background: "transparent", border: "#7c4e56", color: "#e98c8c" },
  }[variant];
  return (
    <button
      type={type ?? "button"}
      data-variant={variant}
      data-size={size}
      style={{
        background: palette.background,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        borderRadius: 7,
        padding: size === "compact" ? "5px 9px" : "8px 13px",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
