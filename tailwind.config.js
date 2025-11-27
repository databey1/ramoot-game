/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    // Tailwind'in tüm React/JSX dosyalarınızı taramasını sağlar
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}