import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-3 py-1 text-small font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-main focus:ring-offset-2",
  {
    variants: {
      variant: {
        accent: "bg-accent-main bg-opacity-12 text-accent-main",
        neutral: "bg-surface-elevated text-text-secondary",
        success: "bg-state-success bg-opacity-12 text-state-success",
        warning: "bg-state-warning bg-opacity-12 text-state-warning",
        error: "bg-state-error bg-opacity-12 text-state-error",
        outline: "border border-border text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }