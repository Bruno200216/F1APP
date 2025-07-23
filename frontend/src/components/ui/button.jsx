import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-body font-medium transition-all duration-normal ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-main focus-visible:ring-opacity-50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent-main text-white hover:bg-accent-hover hover:shadow-glow-accent",
        ghost: "bg-transparent text-accent-main hover:bg-accent-main hover:bg-opacity-12",
        outline: "border border-border bg-transparent text-text-primary hover:bg-surface-elevated hover:text-text-primary",
        secondary: "bg-surface-elevated text-text-primary hover:bg-surface-elevated hover:bg-opacity-80",
        danger: "bg-state-error text-white hover:bg-state-error hover:bg-opacity-90",
      },
      size: {
        default: "h-10 px-6 py-3",
        sm: "h-8 px-4 py-2 text-small",
        lg: "h-12 px-8 py-4",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }