# Siklus SEO socio.id di VPS host

Source of truth untuk skrip yang dipasang di VPS host `130.254.47.93` (bukan di container).
Pipeline SEO socio.id = **cron host + `docker exec`** ke container runner
(`ssoe-new:latest`, id `c9iqug5vvi9kjywt1fn6xnsc-…`), repo di `/app/data/repo`
(`github.com/ReqTimeout/socio-seo-runner`).

## Berkas di sini

| Berkas | Dipasang ke | Isi |
|---|---|---|
| `seo-index-coid-cycle` | `/usr/local/bin/seo-index-coid-cycle` (0755) | reconcile `state.published` → GSC URL Inspection |
| `seo-measure-coid-cycle` | `/usr/local/bin/seo-measure-coid-cycle` (0755) | `gsc-analytics` (mining query) → `seo-status` (ringkasan + alert) |
| `cron.d-seo-index-coid` | `/etc/cron.d/seo-index-coid` (0644) | 05:40 + 11:40 UTC |
| `cron.d-seo-measure-coid` | `/etc/cron.d/seo-measure-coid` (0644) | 06:40 UTC |

## Cara pasang

```bash
scp scripts/seo/seo-index-coid-cycle scripts/seo/seo-measure-coid-cycle root@130.254.47.93:/usr/local/bin/
scp scripts/seo/cron.d-seo-index-coid scripts/seo/cron.d-seo-measure-coid root@130.254.47.93:/etc/cron.d/
ssh root@130.254.47.93 'chmod 0755 /usr/local/bin/seo-*-coid-cycle && chmod 0644 /etc/cron.d/seo-*-coid'
```

## Aturan

- **Jangan sentuh siklus `-my`** (`seo-measure-cycle`, `seo-index-my-cycle`, `seo-llm-ping-cycle`, …) — itu milik socio.my dan repo-nya ada di `/opt/seo-my/repo`.
- Semua wrapper pakai **load guard** (load ≥8 atau RAM <700MB → skip) + **`flock`** (satu instance).
- Laporan ditulis ke `/app/data/reports` (di dalam container, **di luar repo git**) — lihat `docs/deploy/APPSOCIOID_VPS.md` §7.1.
