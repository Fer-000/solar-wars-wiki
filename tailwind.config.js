/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        // Safelist theme classes so they aren't purged
        'theme-red-alert',
        'theme-green-matrix',
        'theme-gold-luxury',
        'theme-ice-blue',
        'theme-amber-warm',
        'theme-violet-mystic',
        'page-content',
        'page-header'
    ],
    theme: {
        extend: {
            colors: {
                primary: '#00d9ff',
                secondary: '#8b5cf6',
                accent: '#f43f5e',
                'bg-dark': '#0a0e1a',
                'bg-card': '#151b2e',
                'text-primary': '#e2e8f0',
                'text-secondary': '#94a3b8',
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
