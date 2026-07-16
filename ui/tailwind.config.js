/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"SF Pro Display"', '"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          950: '#070a12',
          900: '#0c1018',
          850: '#111623',
          800: '#161c2b',
          700: '#1d2436',
          600: '#262e44',
          500: '#36405c',
          400: '#4b5775',
          300: '#6b7596',
          200: '#9aa3bf',
          100: '#c8cfdf',
        },
        accent: {
          DEFAULT: '#2d7ff9',
          50: '#e6f1ff',
          100: '#cce3ff',
          200: '#9cc8ff',
          300: '#6cadff',
          400: '#4d9bff',
          500: '#2d7ff9',
          600: '#1a64e0',
          700: '#154fb4',
          800: '#163f87',
          900: '#173566',
        },
        mint: {
          400: '#3dd9a0',
          500: '#19c083',
          600: '#0fa56c',
        },
        amber: {
          400: '#ffc54d',
          500: '#ffab1a',
        },
        coral: {
          400: '#ff7a7a',
          500: '#f85454',
        },
        violet2: {
          400: '#9b8cff',
          500: '#7c6bff',
        },
      },
      borderRadius: {
        mac: '10px',
        'mac-lg': '14px',
        'mac-xl': '20px',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'win': '0 22px 70px 4px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.08) inset',
        'panel': '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 24px -10px rgba(0,0,0,0.4)',
        'card': '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 6px 18px -8px rgba(0,0,0,0.35)',
        'float': '0 12px 40px -8px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1)',
        'spotlight': '0 30px 90px -20px rgba(0,0,0,0.75), 0 0 0 0.5px rgba(255,255,255,0.14)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-down': { '0%': { opacity: '0', transform: 'translateY(-10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'spotlight-in': { '0%': { opacity: '0', transform: 'translateY(-16px) scale(0.98)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'ai-pulse': { '0%,100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
        'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'orbit': { '0%': { transform: 'rotate(0deg) translateX(6px) rotate(0deg)' }, '100%': { transform: 'rotate(360deg) translateX(6px) rotate(-360deg)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.2,0.9,0.3,1)',
        'slide-up': 'slide-up 0.22s cubic-bezier(0.2,0.9,0.3,1)',
        'slide-down': 'slide-down 0.22s cubic-bezier(0.2,0.9,0.3,1)',
        'spotlight-in': 'spotlight-in 0.28s cubic-bezier(0.2,0.9,0.3,1)',
        'ai-pulse': 'ai-pulse 1.4s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s linear infinite',
        'orbit': 'orbit 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};
