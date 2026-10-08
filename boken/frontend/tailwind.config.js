/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: token("paper"),
        sheet: token("sheet"),
        ink: token("ink"),
        muted: token("muted"),
        line: token("line"),
        seal: token("seal"),
        jade: token("jade"),
        ochre: token("ochre"),
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        panel: "0.875rem",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        stamp: {
          "0%": { transform: "scale(1.25) rotate(-8deg)", opacity: "0" },
          "60%": { transform: "scale(0.96) rotate(-8deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-8deg)", opacity: "1" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        pop: {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "70%": { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        rise: "rise 360ms cubic-bezier(0.2, 0.7, 0.2, 1) both",
        marquee: "marquee 60s linear infinite",
        pop: "pop 320ms cubic-bezier(0.3, 0.8, 0.3, 1) both",
        stamp: "stamp 420ms cubic-bezier(0.3, 0.8, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
