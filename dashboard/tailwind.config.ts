import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#05070a",
          900: "#0a0f14",
          850: "#0d141c",
          800: "#101a24"
        },
        system: {
          500: "#58b8c8",
          600: "#3e8e9a"
        },
        caution: {
          500: "#d6a24a"
        },
        critical: {
          500: "#d34b47"
        }
      },
      fontFamily: {
        ui:      ["var(--font-ui)",      "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",    "ui-monospace",  "monospace"],
      },
      letterSpacing: {
        tactical: "0.22em"
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(88,184,200,0.10), 0 24px 60px rgba(0,0,0,0.55)"
      },
      backgroundImage: {
        noise:
          "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.08), transparent 30%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06), transparent 35%), radial-gradient(circle at 30% 80%, rgba(255,255,255,0.05), transparent 40%)"
      }
    }
  },
  plugins: []
} satisfies Config;

