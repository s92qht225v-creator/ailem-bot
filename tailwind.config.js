/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: '#111827',
        accent: '#ed2224',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      maxWidth: {
        'mobile': '448px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
