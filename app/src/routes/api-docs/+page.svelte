<script lang="ts">
  const baseUrl = "https://app.socio.id/api/v1";
  const accountUrl = "/akun";

  const ex = {
    servicesReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=services"`,
    servicesRes: `[
  {
    "service": 123,
    "name": "Instagram Followers [Real]",
    "type": "Default",
    "category": "Instagram Followers",
    "rate": "12500",
    "min": "100",
    "max": "50000",
    "refill": true,
    "cancel": true
  }
]`,
    addReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=add" \\
  -d "service=123" -d "link=https://instagram.com/p/xxx" -d "quantity=1000"`,
    addRes: `{ "order": "1795000000000123456" }`,
    addSubReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=add" \\
  -d "service=456" -d "username=channelname" \\
  -d "min=100" -d "max=500" -d "delay=0"`,
    addCommentsReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=add" \\
  -d "service=789" -d "link=https://instagram.com/p/xxx" \\
  -d "comments=Nice!\\nGreat post\\nLove it"`,
    statusReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=status" -d "order=1795000000000123456"`,
    statusRes: `{
  "charge": "12500",
  "start_count": "3572",
  "status": "In progress",
  "remains": "157",
  "currency": "IDR"
}`,
    multiStatusReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=status" -d "orders=1795000000000123456,1795000000000654321"`,
    multiStatusRes: `{
  "1795000000000123456": { "charge": "12500", "start_count": "3572", "status": "Completed", "remains": "0", "currency": "IDR" },
  "1795000000000654321": { "error": "Incorrect order ID" }
}`,
    refillReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=refill" -d "order=1795000000000123456"`,
    refillRes: `{ "refill": "1" }`,
    refillStatusReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=refill_status" -d "refill=1"`,
    refillStatusRes: `{ "status": "Success" }`,
    cancelReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=cancel" -d "orders=1795000000000123456"`,
    cancelRes: `[ { "order": "1795000000000123456", "cancel": 1 } ]`,
    balanceReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=balance"`,
    balanceRes: `{ "balance": "100840", "currency": "IDR" }`,
    addIdemReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=add" \\
  -d "service=123" -d "link=https://instagram.com/p/xxx" -d "quantity=1000" \\
  -d "idempotency_key=order-saya-0001"`,
    ordersReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=orders" -d "status=Completed" -d "limit=10"`,
    ordersRes: `[
  {
    "order": "1795000000000123456",
    "service": 123,
    "name": "Instagram Followers [Real]",
    "link": "https://instagram.com/p/xxx",
    "quantity": "1000",
    "charge": "12500",
    "status": "Completed",
    "remains": "0",
    "start_count": "3572",
    "created_at": "2026-11-19 09:30:00",
    "currency": "IDR"
  }
]`,
    bulkAddReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=bulk_add" \\
  --data-urlencode 'orders=[{"service":123,"link":"https://instagram.com/p/xxx","quantity":1000},{"service":456,"link":"https://tiktok.com/@user/video/1","quantity":500}]'`,
    bulkAddRes: `[ { "order": "1795000000000123456" }, { "order": "1795000000000654321" } ]`,
    setWebhookReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=set_webhook" \\
  -d "url=https://panel-kamu.com/socio/hook"`,
    setWebhookRes: `{
  "webhook_url": "https://panel-kamu.com/socio/hook",
  "webhook_secret": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822c",
  "enabled": true
}`,
    setApiSecretReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=set_api_secret" -d "require_signature=1"`,
    setApiSecretRes: `{
  "api_secret": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb0",
  "sign_required": true
}`,
    depositReq: `curl -s -X POST ${baseUrl} \\
  -d "key=KEY_KAMU" -d "action=deposit" -d "amount=50000"`,
    depositRes: `{
  "invoice": "DEP-1795000000000-42",
  "transfer_amount": "50777",
  "credited": "55777",
  "bonus": "5000",
  "suffix": 777,
  "method": "manual",
  "status": "Pending",
  "expire": "2026-11-20T12:00:00.000Z",
  "bank_number": "1392680815",
  "bank_name": "Awangga Ramadhi",
  "currency": "IDR"
}`,
    affiliateRes: `{
  "commission": "1240",
  "withdrawn": "30000",
  "requested": "0",
  "downline": 8,
  "can_withdraw": false,
  "min_withdraw": 5000,
  "ref_code": "ABC123",
  "ref_link": "https://app.socio.id/daftar?ref=ABC123",
  "currency": "IDR"
}`,
    errorRes: `{ "error": "Not Enough Balance" }`,
  };

  const benefits = [
    [
      "Harga grosir",
      "Order dengan rate level Reseller / Agen kamu — harga sama dengan yang terlihat di panel, dipotong dari saldo prabayar.",
    ],
    [
      "API Socio plug-and-play",
      "API Socio memakai action, parameter, dan respons JSON flat yang sama dengan API panel SMM populer. Arahkan bot atau panel kamu ke base URL kami dengan key kamu — tanpa tulis ulang kode.",
    ],
    [
      "Whitelabel penuh",
      "Pelanggan kamu tidak pernah melihat brand kami. Nama layanan disanitasi dan setiap panggilan diproses server-side dari panel atau toko kamu sendiri.",
    ],
    [
      "Otomatisasi semua",
      "Daftar layanan, buat order, pantau status, minta refill dan cancel secara programatik — satuan atau batch (hingga 100 ID).",
    ],
    [
      "Saldo aman",
      "Saldo dipotong atomik saat order dibuat. Kalau provider menolak, dana kamu dikembalikan otomatis.",
    ],
    [
      "Semua tipe layanan",
      "Default, Package, Custom Comments, Mentions, Subscriptions (Telegram), Poll, Invites from Groups, dan lainnya — masing-masing dengan parameter yang benar.",
    ],
  ];

  const statusEnum = [
    "Pending",
    "Processing",
    "In progress",
    "Partial",
    "Completed",
    "Canceled",
    "Error",
  ];
</script>

<svelte:head>
  <title>Dokumentasi API — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Dokumentasi API reseller Socio.id — services, order, status, refill, cancel, dan saldo. Otomatisasi panel SMM kamu dengan API key (Reseller & Agen)."
  />
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-10 text-ink-900">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="font-display text-2xl font-extrabold tracking-tight">Dokumentasi API</h1>
    <a
      href={accountUrl}
      class="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
      >Ambil API key kamu</a
    >
  </div>
  <p class="mt-2 text-sm text-ink-600">
    Otomatisasi order SMM dari bot, toko, atau panel kamu. <b>Socio API</b> memakai action, parameter,
    dan format respons yang sama dengan API panel SMM populer, jadi integrasi yang sudah ada cukup ganti
    base URL dan key.
  </p>

  <!-- Keuntungan -->
  <section class="mt-8">
    <h2 class="font-display text-lg font-bold">Kenapa pakai API</h2>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      {#each benefits as [title, desc] (title)}
        <div class="rounded-2xl border border-ink-100 bg-surface p-4">
          <h3 class="text-sm font-bold">{title}</h3>
          <p class="mt-1 text-xs text-ink-600">{desc}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Akses -->
  <section class="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
    <h2 class="font-display text-lg font-bold">Akses</h2>
    <ul class="mt-2 space-y-1 text-sm text-ink-700">
      <li>• Akses API hanya untuk akun <b>Reseller</b> dan <b>Agen</b>.</li>
      <li>
        • Lihat / regenerate key kamu di <a
          href={accountUrl}
          class="font-bold text-primary hover:underline">Akun → API Key</a
        >.
      </li>
      <li>
        • Akun Reseller wajib <b>teraktivasi</b> (aktivasi selesai &amp; dikonfirmasi) sebelum bisa order.
      </li>
      <li>
        • Akun Member / Demo: upgrade ke Reseller atau Agen untuk membuka API dan harga grosir.
      </li>
      <li>
        • Jaga kerahasiaan key kamu — key itu membawa saldo kamu. Regenerate segera kalau bocor.
      </li>
    </ul>
  </section>

  <!-- Cara pakai -->
  <section class="mt-8">
    <h2 class="font-display text-lg font-bold">Cara pakai</h2>
    <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-700">
      <li>
        Salin API key kamu dari <a href={accountUrl} class="font-bold text-primary hover:underline"
          >Akun → API Key</a
        >.
      </li>
      <li>
        Kirim HTTP <b>POST</b> ke endpoint di bawah dengan <code>key</code> + <code>action</code>
        (form-encoded atau JSON).
      </li>
      <li>
        Baca respons JSON. Kalau gagal kamu dapat <code>{'{"error": "..."}'}</code> — baca pesannya.
      </li>
    </ol>
    <div class="mt-3 rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold">Endpoint</h3>
      <code class="mt-2 block rounded-lg bg-ink-900 px-3 py-2 text-sm text-accent-300"
        >POST {baseUrl}</code
      >
      <p class="mt-2 text-xs text-ink-500">
        Body: <b>form-encoded</b> atau <b>JSON</b>. Parameter auth: <code>key</code>
        (legacy <code>api_key</code> juga diterima). Rate limit: <b>60 request/menit per IP</b>.
        Mata uang: <b>IDR (Rp)</b>.
      </p>
    </div>
    <div class="mt-3 rounded-2xl bg-ink-50 p-4 text-xs text-ink-600">
      <b>Integrasi panel:</b> set API URL panel kamu ke <code>{baseUrl}</code> dan API key ke key
      Socio.id kamu. Action <code>services</code>, <code>add</code>, <code>bulk_add</code>,
      <code>status</code>, <code>refill</code>, <code>refill_status</code>, <code>cancel</code>,
      <code>balance</code>, <code>orders</code>, <code>set_webhook</code> dan semua bentuk respons cocok
      dengan format Socio API.
    </div>
  </section>

  <!-- Referensi action -->
  <section class="mt-10 space-y-5">
    <h2 class="font-display text-lg font-bold">Action</h2>

    <!-- services -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=services</code> — daftar layanan</h3>
      <p class="mt-1 text-xs text-ink-500">
        Mengembalikan semua layanan aktif dengan rate jual level kamu. Tanpa parameter tambahan.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.servicesReq}</pre>
      <p class="mt-2 text-xs font-semibold text-ink-600">Respons</p>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.servicesRes}</pre>
      <p class="mt-2 text-xs text-ink-500">
        <code>rate</code> = harga jual per 1000 (IDR) untuk tipe Default, atau per pack untuk tipe
        Package. <code>refill</code> / <code>cancel</code> = apakah layanan mendukung refill /
        cancel.
        <code>type</code> menentukan parameter <code>add</code> yang wajib (lihat bawah).
      </p>
    </div>

    <!-- add -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=add</code> — buat order</h3>
      <p class="mt-1 text-xs text-ink-500">
        Wajib: <code>service</code> (ID layanan) + field sesuai <code>type</code>-nya. Mengembalikan
        <code>order</code> (ID order — pakai untuk status / refill / cancel). Saldo dipotong
        sekarang; order gagal dikembalikan otomatis. Alias legacy: <code>action=order</code>.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.addReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.addRes}</pre>
      <p class="mt-3 text-xs font-semibold text-ink-600">Parameter per tipe layanan</p>
      <div class="mt-1 overflow-x-auto">
        <table class="w-full text-left text-xs text-ink-600">
          <thead class="text-ink-500">
            <tr><th class="py-1 pr-3">Tipe</th><th class="py-1 pr-3">Field wajib</th></tr>
          </thead>
          <tbody>
            <tr
              ><td class="py-1 pr-3 font-semibold">Default</td><td class="py-1"
                >link, quantity (opsional runs, interval)</td
              ></tr
            >
            <tr><td class="py-1 pr-3 font-semibold">Package</td><td class="py-1">link</td></tr>
            <tr
              ><td class="py-1 pr-3 font-semibold">SEO</td><td class="py-1"
                >link, quantity, keywords (dipisah \n)</td
              ></tr
            >
            <tr
              ><td class="py-1 pr-3 font-semibold">Custom Comments</td><td class="py-1"
                >link, comments (dipisah \n; quantity = jumlah baris)</td
              ></tr
            >
            <tr
              ><td class="py-1 pr-3 font-semibold">Mentions Custom List</td><td class="py-1"
                >link, usernames (dipisah \n)</td
              ></tr
            >
            <tr
              ><td class="py-1 pr-3 font-semibold">Mentions Hashtag</td><td class="py-1"
                >link, quantity, hashtag</td
              ></tr
            >
            <tr
              ><td class="py-1 pr-3 font-semibold">Mentions User Followers</td><td class="py-1"
                >link, quantity, username (URL sumber)</td
              ></tr
            >
            <tr
              ><td class="py-1 pr-3 font-semibold">Comment Likes</td><td class="py-1"
                >link, quantity, username (pemilik komentar)</td
              ></tr
            >
            <tr
              ><td class="py-1 pr-3 font-semibold">Poll</td><td class="py-1"
                >link, quantity, answer_number</td
              ></tr
            >
            <tr
              ><td class="py-1 pr-3 font-semibold">Invites from Groups</td><td class="py-1"
                >link, quantity, groups (dipisah \n)</td
              ></tr
            >
            <tr
              ><td class="py-1 pr-3 font-semibold">Subscriptions</td><td class="py-1"
                >username, min, max, delay (opsional posts, old_posts, expiry d/m/Y)</td
              ></tr
            >
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-xs font-semibold text-ink-600">Contoh Subscriptions (Telegram)</p>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.addSubReq}</pre>
      <p class="mt-3 text-xs font-semibold text-ink-600">Contoh Custom Comments</p>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.addCommentsReq}</pre>
      <p class="mt-3 text-xs font-semibold text-ink-600">Idempotency (retry aman)</p>
      <p class="mt-1 text-xs text-ink-500">
        Tambahkan <code>idempotency_key</code> opsional (≤100 karakter, scoped per akun). Replay key
        yang sama mengembalikan <b>ID order yang sama</b> tanpa menagih lagi atau membuat duplikat — cocok
        untuk bot dan logika retry. Request gagal melepas key supaya bisa dipakai ulang.
      </p>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.addIdemReq}</pre>
    </div>

    <!-- status -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=status</code> — status order</h3>
      <p class="mt-1 text-xs text-ink-500">
        Satuan: <code>order</code> = ID order. Batch: <code>orders</code> = ID dipisah koma (maks 100).
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.statusReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.statusRes}</pre>
      <p class="mt-2 text-xs text-ink-500">
        <code>charge</code> = nominal yang ditagih (IDR). <code>start_count</code> = jumlah saat
        order dibuat. <code>remains</code> = sisa yang belum dikirim.
      </p>
      <p class="mt-3 text-xs font-semibold text-ink-600">Respons batch</p>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.multiStatusReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.multiStatusRes}</pre>
      <p class="mt-2 text-xs text-ink-500">
        Nilai <code>status</code> yang mungkin: {statusEnum.join(", ")}.
      </p>
    </div>

    <!-- refill -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=refill</code> — minta refill</h3>
      <p class="mt-1 text-xs text-ink-500">
        Hanya untuk layanan dengan <code>refill=true</code>. Satuan: <code>order</code> →
        <code>{'{"refill": id}'}</code>. Batch: <code>orders</code> →
        <code>[{'{"order": id, "refill": id}'}]</code>. Pakai ID refill dengan
        <code>refill_status</code>.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.refillReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.refillRes}</pre>
    </div>

    <!-- refill_status -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=refill_status</code> — status refill</h3>
      <p class="mt-1 text-xs text-ink-500">
        Satuan: <code>refill</code> = ID refill. Batch: <code>refills</code> = ID dipisah koma (maks 100).
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.refillStatusReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.refillStatusRes}</pre>
      <p class="mt-2 text-xs text-ink-500">Nilai status: Pending, In progress, Success.</p>
    </div>

    <!-- cancel -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=cancel</code> — batalkan order</h3>
      <p class="mt-1 text-xs text-ink-500">
        <code>orders</code> = ID order dipisah koma (maks 100). Hanya untuk layanan dengan
        <code>cancel=true</code> dan order berstatus bisa dibatalkan. Cancel yang berhasil dikembalikan
        dananya setelah provider konfirmasi.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.cancelReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.cancelRes}</pre>
      <p class="mt-2 text-xs text-ink-500">
        <code>cancel: 1</code> = permintaan diterima. <code>cancel: {'{"error": "..."}'}</code> = ditolak
        (baca pesan).
      </p>
    </div>

    <!-- balance -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=balance</code> — saldo kamu</h3>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.balanceReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.balanceRes}</pre>
      <p class="mt-2 text-xs text-ink-500">
        Legacy <code>action=profile</code> juga mengembalikan username, full_name, dan level selain saldo.
      </p>
    </div>

    <!-- orders / history -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=orders</code> — riwayat order</h3>
      <p class="mt-1 text-xs text-ink-500">
        Daftar order kamu, terbaru dulu. Filter opsional: <code>status</code> (enum publik:
        <code>Pending</code>, <code>Processing</code>, <code>In progress</code>,
        <code>Completed</code>, <code>Partial</code>, <code>Canceled</code>, <code>Error</code>),
        <code>service</code> (ID layanan), <code>limit</code> (default 50, maks 100) dan
        <code>offset</code> (pagination). Alias: <code>action=history</code>.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.ordersReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.ordersRes}</pre>
    </div>

    <!-- bulk_add -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=bulk_add</code> — buat banyak order sekaligus</h3>
      <p class="mt-1 text-xs text-ink-500">
        <code>orders</code> = JSON array objek order (maks 100), masing-masing dengan field yang
        sama seperti <code>add</code> (service + field tipe, opsional <code>idempotency_key</code>).
        Tiap item diproses atomik berurutan; item gagal refund sendiri dan tidak menghentikan
        sisanya. Mengembalikan <code>[{'{"order": ...}'} | {'{"error": ...}'}]</code> selaras urutan input.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.bulkAddReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.bulkAddRes}</pre>
    </div>

    <!-- set_webhook -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=set_webhook</code> — callback status order</h3>
      <p class="mt-1 text-xs text-ink-500">
        Daftarkan URL <b>https</b> publik (<code>url</code>; kosong = nonaktif). Saat order mencapai
        status final, Socio mengirim POST payload JSON bertanda tangan ke URL kamu — tanpa polling.
        Mengembalikan <code>webhook_secret</code> kamu; kirim <code>regenerate_secret=1</code> untuk rotate.
        URL private / loopback ditolak (SSRF guard).
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.setWebhookReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.setWebhookRes}</pre>
      <p class="mt-3 text-xs font-semibold text-ink-600">Payload callback &amp; verifikasi</p>
      <p class="mt-1 text-xs text-ink-500">
        Body: <code
          >{`{event:"order.status", order, status, charge, remains, start_count, currency, timestamp}`}</code
        >. Header: <code>X-Socio-Signature</code> = HMAC-SHA256 hex dari raw body memakai
        <code>webhook_secret</code> kamu, dan <code>X-Socio-Event</code>. Verifikasi signature
        sebelum mempercayai callback. Delivery retry dengan backoff (1m → 5m → 30m → 2j → 6j, maks 5
        attempt).
      </p>
    </div>

    <!-- set_api_secret -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=set_api_secret</code> — HMAC request signing</h3>
      <p class="mt-1 text-xs text-ink-500">
        Buat secret per akun untuk menandatangani request. <b
          >Begitu secret diset, setiap request wajib ditandatangani</b
        >
        — request key-saja ditolak. Mengembalikan <code>api_secret</code> +
        <code>sign_required</code>. Cara sign: tambahkan <code>timestamp</code> (unix detik) dan
        <code>signature</code> = HMAC-SHA256 hex dari canonical string — semua parameter kecuali
        <code>signature</code>, diurutkan berdasarkan key, tiap key dan value di-<b>URL-encode</b>
        (<code>encodeURIComponent</code>), digabung <code>key=value</code> dengan
        <code>&amp;</code>. Timestamp lebih tua dari 5 menit ditolak, dan tiap signature
        <b>sekali pakai</b> (replay request bertanda tangan dalam window ditolak). SDK resmi auto-sign
        kalau kamu memasukkan secret.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.setApiSecretReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.setApiSecretRes}</pre>
    </div>

    <!-- sandbox -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold">Sandbox — uji dry-run (<code>sandbox=1</code>)</h3>
      <p class="mt-1 text-xs text-ink-500">
        Tambahkan <code>sandbox=1</code> untuk uji tanpa memotong saldo atau menghubungi provider.
        <code>add</code>/<code>bulk_add</code> memvalidasi parameter dan menghitung harga, lalu
        mengembalikan ID order palsu <code>SBX-...</code> dan <code>charge</code> yang akan ditagih
        —
        <b>tanpa deduct, tanpa panggilan provider, tanpa tulis database</b>. <code>status</code>
        untuk ID <code>SBX-...</code> mengembalikan simulasi <code>Completed</code>;
        <code>balance</code>
        dengan <code>sandbox=1</code> mengembalikan saldo uji <code>1000</code>.
      </p>
    </div>

    <!-- deposit -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold">
        <code>action=deposit</code> (alias <code>topup</code>) — invoice top-up
      </h3>
      <p class="mt-1 text-xs text-ink-500">
        Buat invoice top-up manual BCA (paritas dengan top-up web). <code>amount</code> dalam Rupiah
        (dibulatkan ke rupiah utuh); kode unik 3 digit ditambahkan supaya transfer mudah dicocokkan.
        Mengembalikan <code>transfer_amount</code> persis yang harus dibayar, saldo
        <code>credited</code> (termasuk bonus), <code>bank_number</code> + <code>bank_name</code>
        tujuan, dan <code>expire</code> 24 jam. Deposit berstatus <b>Pending</b> — saldo dikredit hanya
        setelah konfirmasi admin (tanpa gateway otomatis). Maks 2 deposit pending per akun. Minimum Rp20.000,
        maksimum Rp10.000.000.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.depositReq}</pre>
      <pre
        class="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.depositRes}</pre>
    </div>

    <!-- deposits -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold"><code>action=deposits</code> — riwayat deposit</h3>
      <p class="mt-1 text-xs text-ink-500">
        Riwayat deposit read-only (terbaru dulu). Parameter <code>limit</code> (default 50, maks
        100) dan <code>offset</code>. Tiap baris:
        <code>invoice, amount, transfer_amount, method, status, created, expire, currency</code>.
        Pakai untuk memantau status deposit setelah membuat invoice.
      </p>
    </div>

    <!-- affiliate -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h3 class="text-sm font-bold">
        <code>action=affiliate</code> — statistik affiliate (read-only)
      </h3>
      <p class="mt-1 text-xs text-ink-500">
        Mengembalikan <code>commission</code> (pending), <code>withdrawn</code>,
        <code>requested</code>, jumlah <code>downline</code>, <code>can_withdraw</code>,
        <code>min_withdraw</code> (Rp5.000), <code>ref_code</code> dan <code>ref_link</code>.
        Penarikan tetap di web app (approval admin) — API tidak pernah memindahkan uang affiliate.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{ex.affiliateRes}</pre>
    </div>
  </section>

  <!-- SDK -->
  <section class="mt-8 rounded-2xl border border-ink-100 bg-surface p-5">
    <h2 class="font-display text-lg font-bold">SDK Resmi</h2>
    <p class="mt-1 text-xs text-ink-500">
      Client siap pakai membungkus semua action (termasuk riwayat <code>orders</code> dan
      <code>idempotency_key</code>) dengan helper bertipe dan penanganan error. Dependensi
      nol/minimal:
    </p>
    <ul class="mt-2 list-inside list-disc text-xs text-ink-600">
      <li><b>Python</b> — <code>sdk/python/socio_api.py</code> (standard library saja)</li>
      <li><b>PHP</b> — <code>sdk/php/SocioApi.php</code> (ext-curl)</li>
      <li><b>Node.js</b> — <code>sdk/node/socio-api.mjs</code> (fetch native, Node 18+)</li>
      <li><b>Contoh bot Telegram</b> — <code>sdk/examples/telegram-bot.py</code></li>
    </ul>
    <pre
      class="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-200">{`from socio_api import SocioApi
api = SocioApi("KEY_KAMU")
order = api.add(service=123, link="https://instagram.com/p/xxx", quantity=1000,
                idempotency_key="order-saya-0001")
print(api.status(order["order"]))
print(api.orders(status="Completed", limit=10))`}</pre>
  </section>

  <!-- Error -->
  <section class="mt-8 rounded-2xl bg-amber-50 p-4 text-xs text-amber-900">
    <b>Error:</b> setiap kegagalan mengembalikan <code>{ex.errorRes}</code>. Pesan umum:
    <code>Wrong API Key</code>, <code>API access is limited to Reseller and Agen accounts</code>,
    <code>Not Enough Balance</code>, <code>min order: N</code>, <code>max order: N</code>,
    <code>Missing required parameter: X</code>, <code>Service not available / inactive</code>,
    <code>Provider rejected the order</code>, <code>Provider error, try again later</code>,
    <code>Rate limit exceeded</code>, <code>Signature required</code>,
    <code>Invalid signature</code>,
    <code>Replay detected</code>, <code>Duplicate idempotency_key</code>. Saldo dipotong saat order
    dibuat — order gagal dikembalikan otomatis.
  </section>

  <p class="mt-8 text-center text-xs text-ink-400">
    Socio.id Reseller API v2 · format SMM panel · mata uang IDR · 60 req/menit/IP
  </p>
</main>
