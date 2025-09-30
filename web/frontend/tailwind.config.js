/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        surface: '#f8fafc',
        headerBlue: '#1E3A8A',
        sidebarBg: '#F5F5F5',
        teal: '#0D9488',
        orange: '#F97316',
        success: '#16A34A',
        error: '#DC2626'
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0,0,0,0.06)'
      },
      borderRadius: {
        xl: '14px'
      }
    },
    container: {
      center: true,
      padding: '1rem'
    }
  },
  plugins: [],
}
