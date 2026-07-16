/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Palet Warna Haloka sesuai Brand Guideline
				primary: '#223c61',    // Deep Blue (Warna Utama Text/BG)
				accent: '#075e54',     // WhatsApp Dark Green (Aksen Gelap)
				teal: '#128c7e',       // Teal Green
				green: '#25d366',      // Bright WhatsApp Green (Tombol/CTA)
				beige: '#ece5dd',      // Background Chat WhatsApp
				sky: '#34b7f1',        // Light Blue (Aksen Terang)
			},
			fontFamily: {
				// Kita akan load font ini di layout nanti
				sans: ['"Open Sans"', 'sans-serif'],
				display: ['"Fredoka"', 'sans-serif'],
				round: ['"Comfortaa"', 'sans-serif'],
			}
		},
	},
	plugins: [],
}
