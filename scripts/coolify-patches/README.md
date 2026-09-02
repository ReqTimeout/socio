# Coolify v4.3.14 Patches

> Status: **REQUIRED** — apply setelah container recreate/update.
> Patch hilang kalau container Coolify di-restart dari image bersih.

## Daftar patch

### 1. `get_environment_variables` decrypt + unserialize fix
File: `app/Models/EnvironmentVariable.php` di dalam container coolify.
Symptom: env vars plaintext (PORT, NODE_ENV, semua SOCIO_*) di-inject ke container sebagai `s:N:"...";`
serialized form → Node crash, app tidak bisa start.

Lihat: `scripts/coolify-patches/apply-env-decrypt-fix.sh` — script yang replace
patch single-line broken ke patch lengkap (unserialize + decrypt fallback).

## Apply via SSH setelah recreate container:

```bash
ssh root@130.254.47.93 "bash -s" < scripts/coolify-patches/apply-env-decrypt-fix.sh
```

Atau copy-paste langsung script ke SSH session.

## Tracking upstream fix

PR upstream Coolify belum ada (v4.3.14 source masih broken).
Patch harus re-apply setiap kali Coolify container di-recreate.

## Long-term: rollback ke Coolify v4.3.13 (jika ada versi stable sebelumnya)
yang fix bug ini, atau build image Coolify sendiri dari source patch.