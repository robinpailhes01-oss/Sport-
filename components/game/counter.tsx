"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { HUD_EASE } from "@/components/motion/primitives";

/** Compteur qui "tick" jusqu'à sa valeur — les chiffres sont les héros du HUD. */
export function Counter({
  value,
  duration = 1.2,
  delay = 0,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) =>
    Math.round(v).toLocaleString("fr-FR"),
  );

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      delay,
      ease: HUD_EASE,
    });
    return () => controls.stop();
  }, [mv, value, duration, delay]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
