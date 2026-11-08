/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // same type as the portfolio: Work Sans for text, Poppins for headings
        sans: ["Work Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Work Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
