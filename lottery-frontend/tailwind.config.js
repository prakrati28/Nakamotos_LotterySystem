/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Outfit'", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        lbg: "#070A10",
        lsurface: "#0C1120",
        lcard: "#101828",
        lpanel: "#141E2E",
        lborder: "#1E2E46",
        lborderhi: "#2E4466",
        laccent: "#4F8EF7",
        laccenthi: "#73AAFF",
        laccentsub: "#2563EB",
        lgold: "#F59E0B",
        lgoldhi: "#FCD34D",
        lwarn: "#EF4444",
        lwarnhi: "#FCA5A5",
        lsuccess: "#10B981",
        lsuccesshi: "#34D399",
        lyellow: "#FBBF24",
        ltext: "#F0F5FF",
        lsubtle: "#A8BCDA",
        ldim: "#6B88AA",
        lghost: "#192233",
      },
      boxShadow: {
        lcard: "0 1px 3px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.35)",
        lpanel: "0 2px 8px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3)",
        lglow: "0 0 28px rgba(79,142,247,0.22)",
        lgolden: "0 0 24px rgba(245,158,11,0.2)",
        linner: "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      backgroundImage: {
        "l-gradient-card":
          "linear-gradient(135deg, rgba(79,142,247,0.06) 0%, transparent 60%)",
        "l-gradient-gold":
          "linear-gradient(135deg, rgba(245,158,11,0.07) 0%, transparent 60%)",
        "l-gradient-hero":
          "linear-gradient(180deg, rgba(79,142,247,0.1) 0%, transparent 40%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease forwards",
        "slide-up": "slideUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-up-d1": "slideUp 0.45s 0.08s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up-d2": "slideUp 0.45s 0.16s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up-d3": "slideUp 0.45s 0.24s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow": "spin 2s linear infinite",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.25rem",
      },
    },
  },
  plugins: [],
};
