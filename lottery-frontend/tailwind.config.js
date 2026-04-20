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
        // Display / headings — Syne: geometric, modern, distinctive
        display: ["'Syne'", "sans-serif"],
        // Body copy — Geist: clean, technical, professional
        sans: ["'Geist'", "sans-serif"],
        // Code / addresses — Geist Mono
        mono: ["'Geist Mono'", "monospace"],
      },
      colors: {
        // All prefixed with "l" to avoid Tailwind core conflicts
        lbg:       "#080B12",   // near-black with blue tint
        lsurface:  "#0D1117",   // GitHub-dark inspired surface
        lcard:     "#111827",   // card background
        lpanel:    "#161D2B",   // slightly elevated panel
        lborder:   "#1F2A3C",   // subtle border
        lborderhi: "#2D3F57",   // highlighted border
        laccent:   "#3B82F6",   // electric blue — professional, not garish
        laccenthi: "#60A5FA",   // lighter accent for hover
        laccentsub:"#1D4ED8",   // darker accent
        lgold:     "#F59E0B",   // amber for prize/winner highlights
        lgoldhi:   "#FCD34D",
        lwarn:     "#EF4444",   // error red
        lwarnhi:   "#FCA5A5",
        lsuccess:  "#10B981",   // emerald green
        lsuccesshi:"#34D399",
        lyellow:   "#FBBF24",   // commit phase
        ltext:     "#F1F5F9",   // primary text
        lsubtle:   "#94A3B8",   // secondary text
        ldim:      "#475569",   // muted / disabled
        lghost:    "#1E293B",   // ghost backgrounds
      },
      boxShadow: {
        lcard:    "0 1px 3px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
        lpanel:   "0 2px 8px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.25)",
        lglow:    "0 0 24px rgba(59,130,246,0.2)",
        lgolden:  "0 0 24px rgba(245,158,11,0.2)",
        linner:   "inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        "l-gradient-card":
          "linear-gradient(135deg, rgba(59,130,246,0.04) 0%, transparent 60%)",
        "l-gradient-gold":
          "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 60%)",
        "l-gradient-hero":
          "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, transparent 40%)",
      },
      animation: {
        "fade-in":       "fadeIn 0.5s ease forwards",
        "slide-up":      "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-up-d1":   "slideUp 0.4s 0.08s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up-d2":   "slideUp 0.4s 0.16s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up-d3":   "slideUp 0.4s 0.24s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-slow":    "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow":     "spin 2s linear infinite",
        "shimmer":       "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
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
