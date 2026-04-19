export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0f1117',
          surface: '#161b22',
          card: '#1c2128',
          border: '#30363d',
          accent: '#2563eb',
          'accent-hover': '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
