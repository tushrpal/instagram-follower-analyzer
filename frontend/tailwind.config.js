/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: '#7c3aed',
        secondary: '#6366f1',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
  // Safelist classes that are dynamically generated or used in prerendered content
  safelist: [
    'spinner',
    'dark',
    'dark:bg-gray-900',
    'dark:text-gray-100',
    'dark:border-gray-700',
  ],
}
