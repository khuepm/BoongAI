/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./popup.html", "./popup.js"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#006492", "on-primary": "#ffffff", "primary-container": "#cae6ff", "on-primary-container": "#001e30",
        "surface": "#f8f9ff", "surface-container": "#f0f4f9", "surface-variant": "#e1e2ec", "on-surface": "#191c20",
        "on-surface-variant": "#44474f", "outline": "#74777f",
        "dark-primary": "#8aceff", "dark-on-primary": "#00344e", "dark-primary-container": "#004b6f", "dark-on-primary-container": "#cae6ff",
        "dark-surface": "#111318", "dark-surface-container": "#1d2024", "dark-on-surface": "#e2e2e9", "dark-outline": "#8e9099",
      },
      fontFamily: {
        "display": ["Roboto", "Manrope", "sans-serif"],
        "body": ["Roboto", "Manrope", "sans-serif"]
      },
      borderRadius: {
        "xl": "12px", "2xl": "16px", "3xl": "24px", "4xl": "28px"
      },
      boxShadow: {
        'm3-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'm3-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
      }
    },
  },
  plugins: [],
};
