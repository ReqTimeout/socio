import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind'; // <--- Pastikan baris ini ada

// https://astro.build/config
export default defineConfig({
  integrations: [
    svelte(), 
    tailwind() // <--- Pastikan fungsi ini dipanggil di sini
  ] 
});