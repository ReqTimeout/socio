// D8: Konfigurasi 10 money pages /beli-* + /smm-panel-* (SEO system §2).
// Harga real dari prices.json (jangan hardcode harga di sini) — hanya mapping
// keyword, FAQ, copy spesifik per halaman. Anti-pattern: jangan buat
// platform×layanan×kota — 10 halaman ini cukup.

export interface BeliFaq {
  q: string;
  a: string;
}

export interface BeliPageData {
  slug: string; // URL path: /beli-followers-instagram
  keyword: string; // keyword utama (H1)
  title: string; // ≤70 char
  description: string; // ≤160 char
  heroSub: string; // 1 kalimat di bawah H1
  // layanan utama: nama persis di prices.json top[] untuk tabel harga
  serviceMatch: string;
  platform: string; // platform utama
  reasons: [string, string, string]; // 3 reason ledger
  faq: BeliFaq[]; // 5 item
  crossSell: string[]; // slug 3 money page lain
}

const DAFTAR = "https://app.socio.id/daftar?mode=reseller";

export const beliPages: BeliPageData[] = [
  {
    slug: "beli-followers-instagram",
    keyword: "Beli Followers Instagram Murah & Terpercaya",
    title: "Beli Followers Instagram Murah, Aman & Proses Instan | Socio.id",
    description:
      "Beli followers Instagram mulai Rp7.395/1.000 — proses otomatis tanpa password, garansi refill. Daftar reseller Rp50.000 dapat harga lebih murah.",
    heroSub:
      "Harga mulai Rp7.395 per 1.000 followers — proses otomatis 24 jam, cukup link profil, tanpa password.",
    serviceMatch: "Instagram Followers",
    platform: "Instagram",
    reasons: [
      "Proses otomatis mulai 1-10 menit setelah saldo masuk — followers berjalan gradual, natural untuk algoritma.",
      "Tanpa password. Cukup link profil publik — akun kamu tetap full milik kamu.",
      "Layanan refill tersedia — followers yang turun dalam masa garansi diisi ulang otomatis.",
    ],
    faq: [
      {
        q: "Berapa harga 1.000 followers Instagram?",
        a: "Mulai Rp7.395 per 1.000 followers untuk member, Rp6.902 untuk reseller. Harga live ada di katalog layanan — selalu ter-update.",
      },
      {
        q: "Apakah beli followers Instagram aman untuk akun?",
        a: "Aman. Followers dikirim gradual tanpa perlu password, dan akun tetap bisa dipakai normal. Order wajar tetap jadi kunci.",
      },
      {
        q: "Berapa lama proses pemesanan followers?",
        a: "Pesanan mulai berjalan 1-10 menit setelah pembayaran saldo dikonfirmasi. Kecepatan pengiriman tergantung layanan yang dipilih.",
      },
      {
        q: "Apakah followers bisa turun (drop)?",
        a: "Sebagian layanan memang bisa turun seiring pembersihan platform. Pilih layanan refill — pengisian ulang otomatis selama masa garansi.",
      },
      {
        q: "Apakah butuh password akun saya?",
        a: "Tidak. Semua proses hanya butuh link profil publik. Panel yang minta password = penipuan, jangan pernah kirim.",
      },
    ],
    crossSell: [
      "beli-likes-instagram",
      "beli-views-tiktok",
      "smm-panel-reseller",
    ],
  },
  {
    slug: "beli-likes-instagram",
    keyword: "Beli Likes Instagram Murah — Harga Real 2026",
    title: "Beli Likes Instagram Murah, Harga Mulai Rp1.185/1k | Socio.id",
    description:
      "Beli likes Instagram mulai Rp1.185/1.000 — proses instan tanpa password. Likes bahan bakar engagement algoritma. Harga reseller lebih murah.",
    heroSub:
      "Harga mulai Rp1.185 per 1.000 likes — kirim ke post, reel, atau carousel, proses otomatis dalam menit.",
    serviceMatch: "Instagram Likes",
    platform: "Instagram",
    reasons: [
      "Likes masuk dalam menit — sempat nge-hook di jam emas distribusi algoritma konten baru.",
      "Cukup link post — bukan akun. Bisa untuk post mana pun, termasuk Reels dan carousel.",
      "Harga reseller Rp1.106/1k — naik level sekali, murah di semua 8.270 layanan.",
    ],
    faq: [
      {
        q: "Berapa harga 1.000 likes Instagram?",
        a: "Mulai Rp1.185 per 1.000 likes untuk member, Rp1.106 untuk reseller. Katalog Instagram punya banyak varian — filter sesuai kebutuhan.",
      },
      {
        q: "Likes bisa dikirim ke Reels dan carousel?",
        a: "Bisa. Setiap layanan di katalog mencantumkan jenis konten yang didukung — pastikan link yang ditempel sesuai.",
      },
      {
        q: "Apakah likes dari akun asli?",
        a: "Tersedia banyak varian di katalog — dari likes bot cepat murah sampai real accounts. Detail tiap layanan tertera jelas di panel.",
      },
      {
        q: "Kenapa likes penting untuk algoritma?",
        a: "Instagram menilai interaksi per konten. Likes yang naik cepat di 1-2 jam pertama menandakan konten layak didorong ke lebih banyak feed.",
      },
      {
        q: "Apakah likes bisa drop?",
        a: "Varian tertentu bisa turun sedikit. Layanan dengan badge refill diisi ulang otomatis — cek katalog sebelum order.",
      },
    ],
    crossSell: [
      "beli-followers-instagram",
      "beli-views-youtube",
      "smm-panel-api",
    ],
  },
  {
    slug: "beli-views-tiktok",
    keyword: "Beli Views TikTok Murah & Instan",
    title: "Beli Views TikTok Murah, Mulai Rp165/1.000 Instan | Socio.id",
    description:
      "Beli views TikTok mulai Rp165/1.000 — proses instan otomatis 24 jam. Views adalah bahan bakar FYP. Harga reseller Rp154/1k.",
    heroSub:
      "Harga mulai Rp165 per 1.000 views — kirim ke video mana pun, mulai berjalan dalam menit, 24 jam.",
    serviceMatch: "TikTok Video Views",
    platform: "TikTok",
    reasons: [
      "Views adalah sinyal distribusi utama TikTok — video dengan views tinggi lebih mudah diangkat ke FYP.",
      "Proses instan: tempel link video, order, views mulai masuk dalam 1-10 menit.",
      "Termasuk di antara termurah se-katalog — Rp165/1k member, Rp154/1k reseller.",
    ],
    faq: [
      {
        q: "Berapa harga 1.000 views TikTok?",
        a: "Mulai Rp165 per 1.000 views untuk member, Rp154 untuk reseller. Katalog TikTok punya 1.500+ layanan views dengan varian kecepatan berbeda.",
      },
      {
        q: "Apakah views TikTok bisa buat FYP?",
        a: "Views menaikkan sinyal distribusi, tapi FYP tetap bergantung retensi watch time dan interaksi. Views kickstart — konten yang bagus tetap kuncinya.",
      },
      {
        q: "Berapa lama proses pengiriman views?",
        a: "Mulai 1-10 menit setelah pembayaran. Kecepatan penuh bervariasi per layanan — ada instan dan gradual.",
      },
      {
        q: "Bisa order views untuk video lama?",
        a: "Bisa. Semua video publik bisa menerima views kapan pun — meski efek terbaik untuk video baru di 24 jam pertama.",
      },
      {
        q: "Apakah views bisa drop atau berkurang?",
        a: "Views umumnya stabil. Varian murah tertentu bisa terkoreksi sedikit — layanan refill menutup risiko itu.",
      },
    ],
    crossSell: [
      "beli-followers-tiktok",
      "beli-views-youtube",
      "smm-panel-reseller",
    ],
  },
  {
    slug: "beli-followers-tiktok",
    keyword: "Beli Followers TikTok Murah & Terpercaya",
    title: "Beli Followers TikTok Murah, Terpercaya & Instan | Socio.id",
    description:
      "Beli followers TikTok dari panel terpercaya — proses otomatis tanpa password, layanan refill tersedia. Daftar Rp50.000 dapat saldo Rp20.000.",
    heroSub:
      "Naikkan social proof akun TikTok kamu — followers dikirim gradual, cukup link profil, tanpa password.",
    serviceMatch: "TikTok Followers",
    platform: "TikTok",
    reasons: [
      "Followers gradual — naik natural, tidak mencolok, aman untuk akun aktif.",
      "Tanpa password — cukup link profil publik, pesanan berjalan otomatis.",
      "Layanan refill tersedia untuk varian followers garansi — turun, diisi ulang otomatis.",
    ],
    faq: [
      {
        q: "Berapa harga followers TikTok?",
        a: "Katalog TikTok punya ratusan varian followers dengan harga berbeda — dari murah cepat sampai garansi refill. Cek katalog untuk harga live.",
      },
      {
        q: "Apakah followers TikTok aman untuk akun?",
        a: "Aman selama order wajar dan gradual. Jangan order puluhan ribu followers untuk akun baru sekaligus.",
      },
      {
        q: "Perlu akun public dulu?",
        a: "Ya. Pastikan akun TikTok tidak private saat order — sistem tidak bisa mengirim ke akun private.",
      },
      {
        q: "Followers dari Indonesia atau luar?",
        a: "Ada varian di katalog — global, Asia, dan negara spesifik. Detail targeting tertera di nama layanan.",
      },
      {
        q: "Kalau followers turun, gimana?",
        a: "Pilih layanan refill — followers yang turun dalam masa garansi diisi ulang otomatis tanpa biaya tambahan.",
      },
    ],
    crossSell: [
      "beli-views-tiktok",
      "beli-followers-instagram",
      "smm-panel-reseller",
    ],
  },
  {
    slug: "beli-subscribers-youtube",
    keyword: "Beli Subscribers YouTube Murah & Aman",
    title: "Beli Subscribers YouTube Murah, Aman & Garansi | Socio.id",
    description:
      "Beli subscribers YouTube mulai Rp3.081/1.000 dengan layanan refill garansi. Proses otomatis tanpa password — aman untuk channel monetisasi.",
    heroSub:
      "Harga mulai Rp3.081 per 1.000 subscribers — layanan garansi refill tersedia, cukup link channel.",
    serviceMatch: "Youtube Subscriber",
    platform: "YouTube",
    reasons: [
      "Subscribers garansi refill tersedia — jumlah yang turun diisi ulang otomatis.",
      "Tanpa password, tanpa akses channel — cukup link, pesanan jalan sendiri.",
      "Cocok untuk channel baru yang butuh social proof sebelum audiens organik datang.",
    ],
    faq: [
      {
        q: "Berapa harga 1.000 subscribers YouTube?",
        a: "Mulai Rp3.081 per 1.000 subscribers untuk member, Rp2.876 untuk reseller. Varian refill garansi harganya beda — cek katalog.",
      },
      {
        q: "Apakah subscribers aman untuk channel monetisasi?",
        a: "Subscribers tidak merusak monetisasi. Tetap jaga watch time dan konten orisinal — itu yang dinilai YouTube untuk AdSense.",
      },
      {
        q: "Kenapa subscribers YouTube lebih mahal dari followers IG?",
        a: "Subs YouTube prosesnya lebih lambat dan stabil, plus risiko drop lebih tinggi — harga provider naik. Layanan refill menutup risiko itu.",
      },
      {
        q: "Apakah subscribers bisa drop?",
        a: "Bisa — itulah kenapa pilih varian refill. Dalam masa garansi, jumlah turun diisi ulang otomatis.",
      },
      {
        q: "Butuh berapa subscribers untuk monetisasi?",
        a: "Syarat YPP: 1.000 subscribers + 4.000 jam watch time (atau 10 juta Shorts views 90 hari). Subs kickstart — konten tetap penentu utama.",
      },
    ],
    crossSell: [
      "beli-views-youtube",
      "beli-views-tiktok",
      "smm-panel-reseller",
    ],
  },
  {
    slug: "beli-views-youtube",
    keyword: "Beli Views YouTube Murah — Harga Real 2026",
    title: "Beli Views YouTube Murah, Harga Mulai Rp6.162/1k | Socio.id",
    description:
      "Beli views YouTube mulai Rp6.162/1.000 — proses otomatis, ada varian ads (monetized-safe). Harga reseller Rp5.751/1k.",
    heroSub:
      "Harga mulai Rp6.162 per 1.000 views — varian high-retention dan ads tersedia di katalog.",
    serviceMatch: "YouTube Views",
    platform: "YouTube",
    reasons: [
      "Varian views ads (via iklan asli) tersedia — aman dan monetized-safe untuk channel serius.",
      "Views dari sumber real, retention tertera per layanan — bukan bot instan murah.",
      "Proses otomatis 24 jam — mulai berjalan menit setelah saldo masuk.",
    ],
    faq: [
      {
        q: "Berapa harga 1.000 views YouTube?",
        a: "Mulai Rp6.162 per 1.000 views untuk member, Rp5.751 reseller. Varian high-retention dan ads harganya lebih tinggi.",
      },
      {
        q: "Views YouTube aman untuk monetisasi?",
        a: "Varian ads aman — views datang dari iklan asli. Varian murah bot cepat tidak disarankan untuk channel yang sudah monetisasi.",
      },
      {
        q: "Kenapa views YouTube lebih mahal dari TikTok?",
        a: "Sumber views YouTube lebih berat: retention, quality, dan risiko audit lebih tinggi. Varian ads ikut bayar iklan asli.",
      },
      {
        q: "Views bisa untuk Shorts?",
        a: "Bisa. Di katalog ada layanan khusus YouTube Shorts — pastikan link yang ditempel adalah video Shorts.",
      },
      {
        q: "Berapa lama proses pengiriman views?",
        a: "Bervariasi per layanan — dari gradual beberapa jam sampai instan. Kecepatan tertera di deskripsi masing-masing.",
      },
    ],
    crossSell: [
      "beli-subscribers-youtube",
      "beli-views-tiktok",
      "smm-panel-api",
    ],
  },
  {
    slug: "beli-members-telegram",
    keyword: "Beli Member Telegram Murah & Cepat",
    title: "Beli Member Telegram Murah, Mulai Rp801/1.000 | Socio.id",
    description:
      "Beli member Telegram mulai Rp801/1.000 — proses otomatis untuk group/channel, tanpa admin access. Harga reseller Rp748/1k.",
    heroSub:
      "Harga mulai Rp801 per 1.000 member — kirim ke group atau channel publik, proses otomatis 24 jam.",
    serviceMatch: "Telegram Members",
    platform: "Telegram",
    reasons: [
      "Salah satu termurah se-katalog — Rp801/1k member, Rp748/1k reseller.",
      "Cukup link group/channel publik — tidak perlu jadikan admin siapa pun.",
      "Pengiriman cepat — cocok untuk grup komunitas yang butuh anggota awal.",
    ],
    faq: [
      {
        q: "Berapa harga 1.000 member Telegram?",
        a: "Mulai Rp801 per 1.000 member untuk member, Rp748 untuk reseller. Varian last-touch dan negara spesifik juga tersedia.",
      },
      {
        q: "Apakah perlu jadikan bot admin grup?",
        a: "Tidak. Semua proses via link publik group/channel. Panel yang minta akses admin = red flag.",
      },
      {
        q: "Member Telegram bisa drop?",
        a: "Bisa, terutama varian murah cepat. Varian refill tersedia untuk pengisian ulang otomatis.",
      },
      {
        q: "Bisa target member dari negara tertentu?",
        a: "Bisa. Katalog Telegram punya varian Asia, India, global — targeting tertera di nama layanan.",
      },
      {
        q: "Untuk channel private bisa?",
        a: "Tidak. Sistem butuh link publik untuk mengirim member. Jadikan publik dulu selama proses berjalan.",
      },
    ],
    crossSell: [
      "smm-panel-reseller",
      "beli-followers-facebook",
      "smm-panel-api",
    ],
  },
  {
    slug: "beli-followers-facebook",
    keyword: "Beli Followers Facebook Murah & Terpercaya",
    title: "Beli Followers Facebook Murah, Harga Real & Instan | Socio.id",
    description:
      "Beli followers Facebook mulai Rp6.162/1.000 — untuk profil, fan page, atau akun bisnis. Proses otomatis, harga reseller Rp5.751/1k.",
    heroSub:
      "Harga mulai Rp6.162 per 1.000 followers — kirim ke profil atau fan page, proses otomatis 24 jam.",
    serviceMatch: "Facebook Followers",
    platform: "Facebook",
    reasons: [
      "Followers untuk profil personal, fan page, dan akun bisnis — semua via link publik.",
      "Proses otomatis tanpa akses akun — Facebook kamu tetap aman.",
      "Social proof page bisnis: calon pembeli lebih percaya page dengan ribuan followers.",
    ],
    faq: [
      {
        q: "Berapa harga 1.000 followers Facebook?",
        a: "Mulai Rp6.162 per 1.000 followers untuk member, Rp5.751 untuk reseller. Varian page dan profil harganya berbeda.",
      },
      {
        q: "Followers bisa untuk fan page?",
        a: "Bisa — pastikan layanan yang dipilih sesuai target: profil personal atau fan page. Link yang ditempel harus publik.",
      },
      {
        q: "Apakah followers Facebook aman?",
        a: "Aman selama tanpa akses akun dan order wajar. Jangan order besar untuk page baru yang belum ada aktivitas.",
      },
      {
        q: "Followers bisa drop?",
        a: "Sebagian varian bisa. Layanan refill di katalog menjamin pengisian ulang otomatis selama masa garansi.",
      },
      {
        q: "Bisa target followers Indonesia?",
        a: "Ada varian negara spesifik di katalog — cek nama layanan untuk detail targeting.",
      },
    ],
    crossSell: [
      "beli-members-telegram",
      "beli-followers-instagram",
      "smm-panel-reseller",
    ],
  },
  {
    slug: "smm-panel-reseller",
    keyword: "SMM Panel Reseller — Jadi Reseller SMM Modal Rp50 Ribu",
    title: "SMM Panel Reseller: Jadi Reseller SMM Modal Rp50.000 | Socio.id",
    description:
      "SMM panel reseller terpercaya: daftar Rp50.000 → saldo Rp20.000 + harga grosir di 8.270 layanan. API ready, tanpa biaya bulanan.",
    heroSub:
      "Modal Rp50.000 sekali bayar — saldo Rp20.000 langsung bisa order + harga reseller lebih murah di semua layanan.",
    serviceMatch: "TikTok Video Views",
    platform: "TikTok",
    reasons: [
      "Harga grosir: selisih member→reseller di seluruh 8.270 layanan, menumpuk besar di volume tinggi.",
      "API ready — order bisa diotomasi dari sistem kamu sendiri (kios, bot, web toko sendiri).",
      "Tanpa biaya bulanan, tanpa kontrak — sekali daftar, harga reseller selamanya.",
    ],
    faq: [
      {
        q: "Apa itu SMM panel reseller?",
        a: "SMM panel yang menjual layanan sosmed dengan harga reseller/grosir — kamu beli murah, jual lagi di harga pasar, margin keuntunganmu sendiri.",
      },
      {
        q: "Berapa modal jadi reseller SMM?",
        a: "Rp50.000 sekali bayar di Socio.id — termasuk saldo Rp20.000 untuk order pertama. Tanpa biaya bulanan lain.",
      },
      {
        q: "Untung berapa persen jadi reseller SMM?",
        a: "Margin ditentukan harga jualmu. Contoh real: IG Followers reseller Rp6.902/1k, harga pasar jasa Rp50-100 ribu/1k — margin bisa 5-10x modal layanan.",
      },
      {
        q: "Apakah ada API untuk reseller?",
        a: "Ada. REST API lengkap (order, status, saldo, daftar layanan) — integrasi ke toko online, bot Telegram, atau web sendiri.",
      },
      {
        q: "Reseller bisa jual semua layanan?",
        a: "Ya — semua 8.270 layanan semua platform, dari Instagram sampai Spotify, dengan harga reseller seragam lebih murah.",
      },
    ],
    crossSell: [
      "smm-panel-api",
      "beli-followers-instagram",
      "beli-views-tiktok",
    ],
  },
  {
    slug: "smm-panel-api",
    keyword: "SMM Panel API — Dokumentasi & Integrasi Gratis",
    title: "SMM Panel API: Dokumentasi & Integrasi Order Otomatis | Socio.id",
    description:
      "API SMM panel Socio.id: order, cek status, saldo, dan katalog 8.270 layanan via REST. Daftar gratis, dokumentasi lengkap, rate-limit wajar.",
    heroSub:
      "REST API untuk semua proses: order, status, saldo, katalog 8.270 layanan — daftar gratis, langsung dapat API key.",
    serviceMatch: "Instagram Likes",
    platform: "Instagram",
    reasons: [
      "Endpoint lengkap: order, cek status multi, refill, saldo, katalog live — semua yang panel punya, API bisa.",
      "Gratis daftar & dapat key — tanpa syarat volume, cocok dari bot kecil sampai kiosk besar.",
      "Respon JSON konsisten + rate-limit wajar 10 request concurrent — stabil untuk produksi.",
    ],
    faq: [
      {
        q: "Apa itu SMM panel API?",
        a: "REST API yang memungkinkan sistemmu (web toko, bot, app) mengirim order layanan sosmed langsung ke Socio.id tanpa buka dashboard manual.",
      },
      {
        q: "Bagaimana cara dapat API key?",
        a: "Daftar gratis di app.socio.id, API key langsung tersedia di halaman profil. Tidak ada syarat volume minimal.",
      },
      {
        q: "Berapa biaya pakai API?",
        a: "Gratis. Kamu hanya bayar layanan yang di-order via saldo — tidak ada biaya bulanan atau per-request.",
      },
      {
        q: "Rate limit API-nya berapa?",
        a: "Maksimal 10 request concurrent per key — cukup untuk produksi. Lebih dari itu, antri otomatis.",
      },
      {
        q: "Bahasa apa saja yang bisa integrasi?",
        a: "Semua yang bisa kirim HTTP request + JSON — PHP, Node.js, Python, Go, bahkan Google Apps Script.",
      },
    ],
    crossSell: [
      "smm-panel-reseller",
      "beli-views-tiktok",
      "beli-likes-instagram",
    ],
  },
];

export const beliBySlug = new Map(beliPages.map((p) => [p.slug, p]));
