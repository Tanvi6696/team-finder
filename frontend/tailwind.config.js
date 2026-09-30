/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          800: '#1e1b4b',
          900: '#0f0a1e',
          950: '#070412',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(79, 70, 229, 0.12)',
        lift: '0 20px 40px rgba(79, 70, 229, 0.25)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        'page-light': 'radial-gradient(ellipse at top, #eef2ff 0%, #f8fafc 45%, #f5f3ff 100%)',
        'page-dark': 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f0a1e 50%, #070412 100%)',
      },
      animation: {
        shimmer: 'shimmer 1.4s ease infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
