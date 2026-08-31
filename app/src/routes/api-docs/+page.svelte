<script lang="ts">
  const baseUrl = "https://app.socio.id/api/v1";
</script>

<svelte:head>
  <title>API Documentation — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Dokumentasi API reseller Socio.id — order, status, refill, layanan, dan profil via REST API. Integrasikan panel SMM kamu dengan API key."
  />
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-10 text-ink-900">
  <div class="flex items-center justify-between">
    <h1 class="font-display text-2xl font-extrabold tracking-tight">API Documentation</h1>
    <a
      href="/login"
      class="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
      >Masuk</a
    >
  </div>
  <p class="mt-2 text-sm text-ink-600">
    Otomatisasi order SMM langsung dari bot, toko, atau panel kamu. API key ada di menu
    <a href="/akun" class="font-bold text-primary hover:underline">Akun → API Key</a>.
  </p>

  <section class="mt-6 rounded-2xl border border-ink-100 bg-surface p-5">
    <h2 class="text-sm font-bold">Endpoint</h2>
    <code class="mt-2 block rounded-lg bg-ink-900 px-3 py-2 text-sm text-accent-300"
      >POST {baseUrl}</code
    >
    <p class="mt-2 text-xs text-ink-500">
      Body: <b>form-encoded</b> atau <b>JSON</b>. Parameter wajib: <code>api_key</code> +
      <code>action</code>. Rate limit: 60 request/menit per IP.
    </p>
  </section>

  <section class="mt-6 space-y-4">
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h2 class="text-sm font-bold"><code>action=services</code> — daftar layanan</h2>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">curl -s -X POST {baseUrl} \
  -d "api_key=KEY" -d "action=services"</pre>
      <p class="mt-2 text-xs text-ink-500">
        Return: id, harga per level (member/reseller/agen), min, max, tipe, kategori, status refill.
      </p>
    </div>

    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h2 class="text-sm font-bold"><code>action=order</code> — buat order</h2>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">curl -s -X POST {baseUrl} \
  -d "api_key=KEY" -d "action=order" \
  -d "service=123" -d "data=https://instagram.com/..." -d "quantity=1000"</pre>
      <p class="mt-2 text-xs text-ink-500">
        Parameter: <code>service</code> (id layanan), <code>data</code> (link target),
        <code>quantity</code> <i>atau</i> <code>comments</code> (untuk Custom Comments — tidak boleh
        dua-duanya). Return: <code>order_id</code> (pakai untuk status/refill) + harga.
      </p>
    </div>

    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h2 class="text-sm font-bold"><code>action=status</code> — cek status order</h2>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">curl -s -X POST {baseUrl} \
  -d "api_key=KEY" -d "action=status" -d "id=ORDER_ID"</pre>
      <p class="mt-2 text-xs text-ink-500">Return: status, start_count, remains, price.</p>
    </div>

    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h2 class="text-sm font-bold"><code>action=refill</code> — minta refill</h2>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">curl -s -X POST {baseUrl} \
  -d "api_key=KEY" -d "action=refill" -d "id=ORDER_ID"</pre>
      <p class="mt-2 text-xs text-ink-500">
        Hanya untuk layanan dengan garansi refill (<code>refill=true</code> di daftar layanan).
      </p>
    </div>

    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h2 class="text-sm font-bold"><code>action=profile</code> — profil & saldo</h2>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">curl -s -X POST {baseUrl} \
  -d "api_key=KEY" -d "action=profile"</pre>
      <p class="mt-2 text-xs text-ink-500">Return: username, full_name, balance, level.</p>
    </div>
  </section>

  <section class="mt-6 rounded-2xl bg-amber-50 p-4 text-xs text-amber-900">
    <b>Respons standar:</b>
    <code>&#123;"status": true/false, "message": "...", "data": ...&#125;</code>. Kalau
    <code>status=false</code>, baca <code>message</code> (mis. "Not Enough Balance", "min order: N").
    Saldo dipotong saat order dibuat — order gagal dikembalikan otomatis.
  </section>
</main>
