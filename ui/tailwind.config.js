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
        // 主题颜色使用 RGB 通道变量，保留 Tailwind 透明度修饰符能力。
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-500) / <alpha-value>)',
          50: 'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
          800: 'rgb(var(--accent-800) / <alpha-value>)',
          900: 'rgb(var(--accent-900) / <alpha-value>)',
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
        'win': '0 22px 70px 4px rgb(var(--shadow-win-rgb) / var(--shadow-win-alpha)), 0 0 0 0.5px rgb(var(--hairline-rgb) / var(--hairline-alpha)) inset',
        'panel': '0 1px 0 0 rgb(var(--hairline-rgb) / var(--hairline-alpha)) inset, 0 8px 24px -10px rgb(var(--shadow-soft-rgb) / var(--shadow-soft-alpha))',
        'card': '0 1px 0 0 rgb(var(--hairline-rgb) / var(--hairline-alpha)) inset, 0 6px 18px -8px rgb(var(--shadow-soft-rgb) / var(--shadow-soft-alpha))',
        'float': '0 12px 40px -8px rgb(var(--shadow-soft-rgb) / var(--shadow-soft-alpha)), 0 0 0 0.5px rgb(var(--hairline-rgb) / var(--hairline-alpha))',
        'spotlight': '0 30px 90px -20px rgb(var(--shadow-win-rgb) / var(--shadow-win-alpha)), 0 0 0 0.5px rgb(var(--hairline-rgb) / var(--hairline-alpha))',
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
