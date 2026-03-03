/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
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
        'content': '1024px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
