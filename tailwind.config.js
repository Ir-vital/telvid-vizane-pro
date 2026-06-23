/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#020817',
        panel: '#0f172a',
        glass: 'rgba(15,23,42,0.6)',
        neon: {
          blue: '#3b82f6',
          violet: '#8b5cf6',
          cyan: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        glass: '12px',
      },
      boxShadow: {
        neon: '0 0 20px rgba(59,130,246,0.3)',
        'neon-violet': '0 0 20px rgba(139,92,246,0.3)',
        'neon-cyan': '0 0 20px rgba(6,182,212,0.3)',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'border-pulse': 'border-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(59,130,246,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(59,130,246,0.7)' },
        },
        'border-pulse': {
          '0%, 100%': { borderColor: 'rgba(59,130,246,0.3)' },
          '50%': { borderColor: 'rgba(59,130,246,0.9)' },
        },
      },
    },
  },
  plugins: [],
}
