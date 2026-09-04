# P2-14 — CSS delivery optimization

**Tanggal:** 4 September 2026  
**Scope:** admin SvelteKit production build; hanya optimasi delivery CSS yang aman, tanpa mengubah design token atau layout.

## Baseline

`pnpm --filter app build` menghasilkan 24 asset CSS dengan total **197,579 B raw / 32,034 B gzip**.

| Asset                       |       Raw |     Gzip | Peran                                       |
| --------------------------- | --------: | -------: | ------------------------------------------- |
| shared Tailwind (`0.*.css`) | 167,569 B | 22,514 B | stylesheet global yang dipakai lintas route |
| route/component CSS lain    |  30,010 B |  9,520 B | stylesheet kecil untuk node/page tertentu   |

Shared Tailwind sengaja tetap external agar browser dapat melakukan caching lintas halaman. Memecah atau meng-inline seluruh file global tidak aman untuk admin: HTML response membesar dan cache CSS hilang.

## Perubahan

Menambahkan `kit.inlineStyleThreshold: 4096` di `app/svelte.config.js`.

SvelteKit sekarang menggabungkan CSS file yang ukurannya ≤4 KiB ke satu `<style>` SSR. Ini menghapus request stylesheet kecil yang render-blocking pada first response, tetapi tidak menyentuh shared Tailwind stylesheet.

## Verifikasi

- Production build: **PASS** (`✓ built in 11.90s` pada run verifikasi).
- Production `/admin`: **HTTP 200** setelah dev-admin session.
- SSR response: **1 `<style data-sveltekit>`**, **0 `<link rel="stylesheet">`** untuk halaman admin yang diuji; stylesheet shared tetap tersedia di client build untuk navigasi/hydration.
- HTML response size pada sampel `/admin`: **332,985 B**. Ini adalah trade-off yang diharapkan dari inlining style; hanya CSS kecil yang di-inline, bukan shared 167 KB.
- Tidak mengubah markup, token, motion, atau accessibility behavior.

## Keputusan scope

CSS global 167 KB raw (~22 KB gzip) bukan dihapus secara agresif karena seluruh utility dipakai lintas dashboard dan shared asset sudah cacheable. Critical-CSS extraction penuh ditunda sampai ada pengukuran production Lighthouse dengan network throttling yang representatif; melakukan itu sekarang berisiko memperbesar SSR HTML dan menurunkan cache hit rate.
