"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-[0.14em] transition-colors disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-volt text-void hover:bg-[#d6ff33] shadow-glow-volt-sm hover:shadow-glow-volt",
        ghost:
          "border border-line-bright text-ink-dim hover:text-ink hover:border-ink-mute bg-transparent",
        danger:
          "border border-danger/50 text-danger hover:bg-danger/10 bg-transparent",
      },
      size: {
        sm: "h-9 px-4 text-[11px]",
        md: "h-12 px-6 text-xs",
        lg: "h-14 px-8 text-sm w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends HTMLMotionProps<"button">,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
