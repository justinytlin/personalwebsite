import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "deep-blue": "#1e3a8a",
        "royal-blue": "#2563eb",
        "soft-blue": "#60a5fa",
        "cyan": "#06b6d4",
        "light-cyan": "#67e8f9",
      },
      backgroundImage: {
        "blue-gradient": "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #60a5fa 100%)",
        "subtle-gradient": "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
