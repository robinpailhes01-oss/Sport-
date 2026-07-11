import type { Config } from "tailwindcss";

// Design tokens — direction "VOLT PROTOCOL" (tactical HUD).
// Le volt est une récompense : réservé à la progression (XP, level up, records, CTA primaire).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#0A0B0D", // fond global
        surface: {
          DEFAULT: "#111318",
          raised: "#161920",
        },
        line: {
          DEFAULT: "#23262E",
          bright: "#343946",
        },
        ink: {
          DEFAULT: "#E6EAF2", // texte principal
          dim: "#9AA3B2", // texte secondaire
          mute: "#5C6470", // labels techniques
        },
        volt: {
          DEFAULT: "#C8FF00",
          dim: "#8FB800",
          faint: "rgba(200,255,0,0.08)",
        },
        danger: "#FF4D4D",
        zone2: "#4DA6FF",
        arcane: "#8B5CF6", // rareté epic des modifiers
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        "glow-volt": "0 0 24px rgba(200,255,0,0.25), 0 0 64px rgba(200,255,0,0.10)",
        "glow-volt-sm": "0 0 12px rgba(200,255,0,0.30)",
        "glow-danger": "0 0 20px rgba(255,77,77,0.25)",
        "glow-arcane": "0 0 20px rgba(139,92,246,0.30)",
      },
      letterSpacing: {
        micro: "0.22em",
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "pulse-live": "pulse-live 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
