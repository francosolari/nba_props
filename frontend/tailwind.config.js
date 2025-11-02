module.exports = {
  content: [
    '../backend/predictions/templates/**/*.html',
    './src/**/*.{js,jsx,ts,tsx}', // Include React components for Tailwind
  ],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        // Apple-like, modern sans stack; uses SF Pro on macOS/iOS, falls back to Inter/system UI
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Inter',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
          'sans-serif',
        ],
        display: [
          'SF Pro Display',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
