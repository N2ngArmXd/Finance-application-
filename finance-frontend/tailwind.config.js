/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // ✅ เพิ่มส่วน Animation ให้ Pop-up เด้งสวยๆ
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                zoomIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            animation: {
                fadeIn: 'fadeIn 0.2s ease-out',
                zoomIn: 'zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', // มีแรงเด้งนิดๆ (Bouncy)
            },
        },
    },
    plugins: [],
}