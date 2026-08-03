import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import Link from "next/link";

type ButtonVariant = "filled" | "outline" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
  className?: string;
}

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: "9px 16px", fontSize: "11px" },
  md: { padding: "13px 22px", fontSize: "11.5px" },
};

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  filled: { background: "var(--accent)", color: "var(--accent-fg)", border: "none", fontWeight: 700 },
  outline: { background: "none", color: "var(--fg)", border: "1px solid var(--line)", fontWeight: 600 },
  ghost: { background: "none", color: "var(--muted)", border: "none", fontWeight: 600 },
};

export function Button({
  children,
  variant = "filled",
  size = "md",
  icon,
  iconPosition = "left",
  href,
  type = "button",
  disabled = false,
  onClick,
  style,
  className,
}: ButtonProps) {
  const combinedStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderRadius: variant === "filled" || variant === "outline" ? 20 : 0,
    cursor: disabled ? "wait" : "pointer",
    opacity: disabled ? 0.6 : 1,
    whiteSpace: "nowrap",
    ...SIZE_STYLES[size],
    ...VARIANT_STYLES[variant],
    ...style,
  };

  const content = (
    <>
      {icon && iconPosition === "left" && icon}
      {children}
      {icon && iconPosition === "right" && icon}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} style={combinedStyle}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={className} style={combinedStyle}>
      {content}
    </button>
  );
}
