/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'game-bg': '#0F1117',
        'game-card': '#1A1D29',
        'game-border': '#2A2D3A',
        'gold': '#FFD700',
        'neon-green': '#00FF9C',
        'neon-blue': '#00D4FF',
        'neon-purple': '#B794F4',
        'red-win': '#FF4655',
        'green-win': '#00FF88',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
}