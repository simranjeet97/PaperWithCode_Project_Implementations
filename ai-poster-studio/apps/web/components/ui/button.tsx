"use client"

import { cn } from "@/lib/utils"
import * as React from "react"

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger"
type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover active:bg-accent-active",
  secondary: "bg-surface-warm text-fg hover:bg-accent-soft border border-transparent",
  ghost: "text-fg hover:bg-surface-warm",
  outline: "border border-border bg-surface text-fg hover:bg-surface-warm",
  danger: "bg-danger text-white hover:bg-danger/90",
}

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"
