/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a4bcfd',
          400: '#8098fb',
          500: '#6175f6',
          600: '#4a56eb',
          700: '#3b44d8',
          800: '#3138af',
          900: '#2d358a',
          950: '#1c2057',
        },
      },
      boxShadow: {
        'neumorphic': '0.3rem 0.3rem 0.6rem rgba(0,0,0,0.1), -0.2rem -0.2rem 0.5rem rgba(255,255,255,0.7)',
        'neumorphic-md': '0.5rem 0.5rem 1rem rgba(0,0,0,0.12), -0.3rem -0.3rem 0.8rem rgba(255,255,255,0.6)',
        'neumorphic-lg': '0.8rem 0.8rem 1.6rem rgba(0,0,0,0.15), -0.4rem -0.4rem 1rem rgba(255,255,255,0.5)',
        'neumorphic-inset': 'inset 0.2rem 0.2rem 0.5rem rgba(0,0,0,0.1), inset -0.2rem -0.2rem 0.5rem rgba(255,255,255,0.7)',
        'neumorphic-dark': '0.3rem 0.3rem 0.6rem rgba(0,0,0,0.5), -0.2rem -0.2rem 0.5rem rgba(255,255,255,0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}

