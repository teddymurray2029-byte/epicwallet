import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // CareCoin specific colors
        care: {
          teal: "hsl(var(--care-teal))",
          "teal-light": "hsl(var(--care-teal-light))",
          "teal-dark": "hsl(var(--care-teal-dark))",
          green: "hsl(var(--care-green))",
          "green-light": "hsl(var(--care-green-light))",
          blue: "hsl(var(--care-blue))",
          "blue-light": "hsl(var(--care-blue-light))",
          warning: "hsl(var(--care-warning))",
          "warning-foreground": "hsl(var(--care-warning-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-pop": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 hsl(160 50% 40% / 0.5)" },
          "70%": { boxShadow: "0 0 0 6px hsl(160 50% 40% / 0)" },
          "100%": { boxShadow: "0 0 0 0 hsl(160 50% 40% / 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "shimmer": "shimmer 4s linear infinite",
        "float": "float 3s ease-in-out infinite",
        "gradient-shift": "gradient-shift 6s ease infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "scale-pop": "scale-pop 0.35s ease-out both",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, hsl(var(--care-teal) / 0.08), hsl(var(--care-green) / 0.05), hsl(var(--care-blue) / 0.08))",
        "card-mesh": "radial-gradient(at 20% 30%, hsl(var(--care-teal) / 0.06) 0%, transparent 50%), radial-gradient(at 80% 70%, hsl(var(--care-green) / 0.04) 0%, transparent 50%)",
        "mesh-gradient": "radial-gradient(at 15% 25%, hsl(var(--care-teal) / 0.06) 0%, transparent 55%), radial-gradient(at 85% 75%, hsl(var(--care-green) / 0.04) 0%, transparent 55%), radial-gradient(at 50% 10%, hsl(var(--care-blue) / 0.03) 0%, transparent 50%)",
      },
      backgroundSize: {
        "shimmer": "300% 100%",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
