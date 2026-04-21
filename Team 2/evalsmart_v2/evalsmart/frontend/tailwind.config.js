/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { 
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        background: '#ffffff',
        surface: '#f8fafc',
        card: '#ffffff',
        border: '#e2e8f0',
        primary: '#2563eb',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        text: '#0f172a',
        muted: '#64748b',
      }
    } 
  },
  plugins: [],
};
