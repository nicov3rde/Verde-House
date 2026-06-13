/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0F0F0F',
        card:    '#1A1A1A',
        border:  '#2A2A2A',
        accent:  '#3DBA6F',
        'accent-dim': '#2E9057',
        muted:   '#6B7280',
        danger:  '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
