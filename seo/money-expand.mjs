#!/usr/bin/env node
/**
 * seo/money-expand.mjs — generator deterministik money pages tambahan.
 * Output: landing/src/data/beli-pages.generated.ts (di-merge beli-pages.ts).
 *
 * Prinsip anti-thin: tiap halaman punya angle unik per layanan (why/how/risk
 * + 1 FAQ unik), harga 100% dari prices.json via template (tidak hardcode Rp),
 * mesh otomatis (crossSell seplatform + RelatedArticles platform).
 * Title ≤70, desc ≤160 — generator THROW kalau jebol (fail loudly).
 *
 * Usage: node seo/money-expand.mjs [--dry]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'landing', 'src', 'data', 'beli-pages.generated.ts');
const DRY = process.argv.includes('--dry');

// svc = nama layanan ID natural. unit = satuan ("followers"), target = yang ditempel.
// match = serviceMatch persis di prices.json top[] (fallback platform di template).
const SERVICES = [
  // ---- Instagram (ada: followers, likes) ----
  { slug: 'beli-views-instagram', svc: 'Views Instagram', plat: 'Instagram', unit: 'views', target: 'link postingan, Reels, atau video', match: 'Instagram Video Views',
    why: 'Views adalah bahan bakar distribusi Reels — konten yang views-nya naik cepat di jam pertama jauh lebih gampang kebawa algoritma ke Explore.',
    how: 'Tempel link kontennya, pilih jumlah, order jalan. Satu link = satu konten; untuk push banyak konten, order per link.',
    risk: 'Views tidak menambah followers — gabungkan dengan order followers kalau tujuannya profil kelihatan besar.',
    qx: 'Apakah views Instagram masuk ke Reels juga?', ax: 'Iya. Cukup tempel link Reels-nya — views dihitung sama seperti video feed biasa.' },
  { slug: 'beli-komentar-instagram', svc: 'Komentar Instagram', plat: 'Instagram', unit: 'komentar', target: 'link postingan yang mau dikomentari', match: 'Instagram Video Views',
    why: 'Kolom komentar yang hidup bikin profil kelihatan dikelola serius — calon buyer jauh lebih berani DM kalau lihat diskusi, bukan kolom kosong.',
    how: 'Tulis sendiri daftar komentar custom (nama + kalimat) atau pakai random dari sistem. Komentar custom jauh lebih natural.',
    risk: 'Komentar random bot gampang dikenali (emoji acak, username aneh). Untuk akun brand, selalu pakai custom.',
    qx: 'Bisa request isi komentar sendiri?', ax: 'Bisa. Siapkan daftar komentarnya, satu baris satu komentar, lalu pilih layanan custom comments di katalog.' },
  { slug: 'beli-story-views-instagram', svc: 'Story Views Instagram', plat: 'Instagram', unit: 'story views', target: 'link story / username yang story-nya aktif', match: 'Instagram Video Views',
    why: 'Story views tinggi bikin story kamu nangkring di urutan depan — penting buat yang jualan via story tiap hari.',
    how: 'Order saat story masih tayang (umur < 24 jam). Views masuk bertahap mengikuti sisa umur story.',
    risk: 'Story kedaluwarsa dalam 24 jam — jangan order story views untuk story yang sudah mau habis.',
    qx: 'Kenapa harus order saat story masih aktif?', ax: 'Karena story hilang setelah 24 jam. Order di jam-jam awal story tayang supaya views keburu masuk maksimal.' },
  { slug: 'beli-reels-instagram', svc: 'Reels Instagram', plat: 'Instagram', unit: 'reels views', target: 'link Reels yang mau di-push', match: 'Instagram Video Views',
    why: 'Reels adalah format dengan distribusi organik terbesar di Instagram — views awal yang kuat sering jadi pemicu masuk FYP Reels.',
    how: 'Order dalam 1-2 jam setelah upload. Kombinasikan views + likes di Reels yang sama untuk sinyal engagement penuh.',
    risk: 'Reels yang isinya memang lemah tetap tidak akan viral walau views-nya dibantu — konten tetap raja.',
    qx: 'Bedanya order views Reels vs views video biasa?', ax: 'Sama-sama views, bedanya cuma link targetnya. Tempel link Reels (format /reel/) supaya tidak salah kirim.' },
  { slug: 'beli-saves-instagram', svc: 'Saves Instagram', plat: 'Instagram', unit: 'saves', target: 'link postingan yang mau di-save', match: 'Instagram Video Views',
    why: 'Save adalah sinyal kualitas terkuat di mata algoritma — konten yang banyak di-save dianggap bermanfaat dan didorong lebih luas.',
    how: 'Cukup link postingan. Saves cocok untuk konten edukasi, tutorial, dan infografis yang memang layak disimpan.',
    risk: 'Saves tidak terlihat publik seperti likes — fungsinya murni sinyal algoritma, bukan social proof.',
    qx: 'Apakah saves terlihat oleh orang lain?', ax: 'Tidak. Jumlah saves hanya terlihat oleh pemilik akun di insight — tapi algoritma membacanya sebagai sinyal kualitas.' },
  { slug: 'beli-shares-instagram', svc: 'Shares Instagram', plat: 'Instagram', unit: 'shares', target: 'link postingan yang mau di-share', match: 'Instagram Video Views',
    why: 'Share ke DM/story memperluas jangkauan organik ke audiens baru — sinyal distribusi yang disukai algoritma.',
    how: 'Tempel link postingan. Shares paling efektif untuk konten giveaway, info promo, dan konten relatable.',
    risk: 'Shares bot tidak menghasilkan klik nyata — pakai sebagai pendorong awal, bukan satu-satunya strategi.',
    qx: 'Share-nya masuk ke mana?', ax: 'Share tercatat sebagai metrik di insight postingan kamu. Akun-akun sistem membagikan via DM/story mereka.' },
  // ---- TikTok (ada: views, followers) ----
  { slug: 'beli-likes-tiktok', svc: 'Likes TikTok', plat: 'TikTok', unit: 'likes', target: 'link video TikTok', match: 'TikTok Video Views',
    why: 'Rasio likes-to-views menentukan apakah video didorong ke batch FYP berikutnya — likes awal yang kuat memperpanjang umur distribusi video.',
    how: 'Order maksimal 1-2 jam setelah upload. Jumlah likes ideal 5-10% dari target views.',
    risk: 'Likes tanpa views yang seimbang kelihatan aneh (likes > views = red flag). Selalu imbangi dengan order views.',
    qx: 'Berapa likes ideal per video?', ax: 'Patokan aman 5-10% dari views. Video 100 ribu views wajar punya 5-10 ribu likes.' },
  { slug: 'beli-komentar-tiktok', svc: 'Komentar TikTok', plat: 'TikTok', unit: 'komentar', target: 'link video TikTok', match: 'TikTok Video Views',
    why: 'Komentar memicu reply dan perdebatan — algoritma TikTok membaca kolom komentar aktif sebagai konten yang engaging.',
    how: 'Pakai custom comments (pertanyaan atau opini) supaya mengundang balasan penonton asli.',
    risk: 'Komentar spam generik ("nice video", emoji acak) justru nurunin kredibilitas. Custom selalu menang.',
    qx: 'Komentar custom vs random, mana yang aman?', ax: 'Custom jauh lebih aman dan efektif. Tulis 10-30 variasi kalimat natural, hindari pengulangan kata yang sama.' },
  { slug: 'beli-share-tiktok', svc: 'Share TikTok', plat: 'TikTok', unit: 'shares', target: 'link video TikTok', match: 'TikTok Video Views',
    why: 'Share adalah metrik distribusi langsung — tiap share membuka peluang penonton baru di luar followers kamu.',
    how: 'Cukup link video. Shares cocok digabung dengan views + likes sebagai paket push video baru.',
    risk: 'Share bot tidak membawa penonton nyata — fungsinya murni metrik, bukan traffic.',
    qx: 'Apakah share menambah views juga?', ax: 'Tidak langsung. Share menaikkan metrik share yang membantu algoritma, tapi views-nya perlu order terpisah.' },
  { slug: 'beli-live-tiktok', svc: 'Live Viewers TikTok', plat: 'TikTok', unit: 'live viewers', target: 'username yang sedang LIVE', match: 'TikTok Video Views',
    why: 'Penonton live yang ramai bikin live nongol di feed LIVE dan menarik penonton organik — efeknya compounding selama live berjalan.',
    how: 'Order HANYA saat live sedang berjalan. Tentukan durasi (15/30/60 menit) — viewers dijaga stabil selama durasi itu.',
    risk: 'Kalau live berhenti mendadak, sisa durasi hangus. Pastikan koneksi stabil sebelum order.',
    qx: 'Kapan waktu order live viewers yang tepat?', ax: 'Begitu live dimulai dan stabil (2-3 menit pertama). Jangan order sebelum live jalan — sistem tidak bisa menemukan sesinya.' },
  { slug: 'beli-saves-tiktok', svc: 'Saves TikTok', plat: 'TikTok', unit: 'saves', target: 'link video TikTok', match: 'TikTok Video Views',
    why: 'Save + favorit adalah sinyal niat terdalam di TikTok — video yang banyak di-save dianggap valuable dan didorong ke FYP lebih lama.',
    how: 'Cocok untuk konten tutorial, resep, dan tips. Cukup link video, saves masuk bertahap.',
    risk: 'Seperti saves IG, metrik ini tidak terlihat publik — murni bahan bakar algoritma.',
    qx: 'Bedanya saves dan favorit di TikTok?', ax: 'Keduanya sinyal koleksi. Beberapa layanan menghitungnya terpisah — cek deskripsi layanan di katalog sebelum order.' },
  // ---- YouTube (ada: subscribers, views) ----
  { slug: 'beli-likes-youtube', svc: 'Likes YouTube', plat: 'YouTube', unit: 'likes', target: 'link video YouTube', match: 'Youtube Subscriber',
    why: 'Like ratio memengaruhi ranking pencarian YouTube — video dengan likes sehat lebih gampang nongol di hasil cari keyword-nya.',
    how: 'Tempel link video (bukan channel). Likes ideal 1-3% dari views untuk rasio natural.',
    risk: 'Likes YouTube diaudit ketat — pilih layanan gradual, hindari yang mengklaim masuk ribuan dalam sejam.',
    qx: 'Apakah likes YouTube bisa hilang kena audit?', ax: 'Bisa, YouTube rutin bersih-bersih engagement. Layanan refill menutup risiko ini selama masa garansi.' },
  { slug: 'beli-komentar-youtube', svc: 'Komentar YouTube', plat: 'YouTube', unit: 'komentar', target: 'link video YouTube', match: 'Youtube Subscriber',
    why: 'Komentar menaikkan watch engagement dan memberi konteks keyword ke algoritma — video yang didiskusikan dianggap relevan.',
    how: 'Wajib custom untuk YouTube — filter spam YouTube agresif terhadap komentar generik.',
    risk: 'Komentar spam bisa dihapus otomatis oleh YouTube (held for review). Custom yang natural lolos jauh lebih sering.',
    qx: 'Kenapa komentar YouTube harus custom?', ax: 'Filter spam YouTube menahan komentar pendek/generik. Komentar 1-2 kalimat yang relevan dengan isi video lolos dan bertahan.' },
  { slug: 'beli-live-youtube', svc: 'Live Views YouTube', plat: 'YouTube', unit: 'live viewers', target: 'link live streaming yang sedang berjalan', match: 'Youtube Live Stream Views + likes',
    why: 'Concurrent viewers tinggi menaikkan ranking live di hasil pencarian dan tab Live — krusial untuk event, launching, dan webinar.',
    how: 'Order saat live berjalan, pilih jumlah concurrent + durasi. Jangan lupa siapkan juga likes live-nya.',
    risk: 'Viewer YouTube dihitung per 30 detik watch — koneksi live yang putus-putus bikin angka concurrent goyang.',
    qx: 'Apakah concurrent viewers memengaruhi replay?', ax: 'Tidak langsung, tapi live yang ramai cenderung dapat ranking replay lebih baik plus social proof saat ditonton ulang.' },
  { slug: 'beli-jam-tayang-youtube', svc: 'Jam Tayang YouTube', plat: 'YouTube', unit: 'jam tayang', target: 'link video / playlist channel', match: 'Youtube Live Stream Views + likes',
    why: '4.000 jam tayang adalah syarat monetisasi — layanan ini mempercepat channel memenuhi ambang tanpa nunggu setahun.',
    how: 'Butuh video berdurasi cukup (makin panjang makin cepat akumulasi). Order bertahap, bukan sekaligus.',
    risk: 'YouTube memverifikasi jam tayang saat review monetisasi — jam dari traffic tidak natural bisa dicoret. Pilih layanan yang menyebut retention.',
    qx: 'Apakah jam tayang dari panel lolos review monetisasi?', ax: 'Tergantung kualitas retention layanannya. Pilih yang menyebut high-retention, dan pastikan 1.000 subscribers juga terpenuhi.' },
  // ---- Telegram (ada: members) ----
  { slug: 'beli-views-telegram', svc: 'Views Telegram', plat: 'Telegram', unit: 'post views', target: 'link postingan channel', match: 'Telegram Post Views',
    why: 'Angka views di tiap post adalah etalase channel — channel 50 ribu member tapi views 20 per post langsung ketahuan sepi.',
    how: 'Bisa per post (tempel link post) atau auto-views untuk post-post berikutnya. Auto jauh lebih hemat untuk channel aktif.',
    risk: 'Views Telegram murni angka — tidak menambah member. Imbangi dengan order members berkala.',
    qx: 'Apa itu auto-views Telegram?', ax: 'Langganan views otomatis: setiap post baru di channel langsung dapat views sesuai paket, tanpa order manual tiap kali.' },
  { slug: 'beli-reactions-telegram', svc: 'Reactions Telegram', plat: 'Telegram', unit: 'reactions', target: 'link postingan channel', match: 'Telegram Post Views',
    why: 'Reactions (emoji) bikin channel kelihatan hidup dan interaktif — penting untuk channel jualan dan komunitas.',
    how: 'Pilih paket emoji (positif/random). Bisa per post atau auto seperti views.',
    risk: 'Reactions negatif/tidak nyambung merusak kesan — pilih paket emoji positif untuk channel brand.',
    qx: 'Bisa pilih emoji reactions-nya?', ax: 'Bisa di sebagian layanan — pilih paket positive reactions (like, fire, heart) untuk kesan yang aman.' },
  { slug: 'beli-komentar-telegram', svc: 'Komentar Telegram', plat: 'Telegram', unit: 'komentar', target: 'link postingan channel (discussion on)', match: 'Telegram Post Views',
    why: 'Postingan channel yang ada diskusinya terlihat dikelola aktif — bagus untuk channel edukasi dan sinyal.',
    how: 'Pastikan discussion group channel aktif. Custom comments jauh lebih natural daripada random.',
    risk: 'Komentar hanya muncul kalau discussion group terhubung — tanpa itu, order tidak bisa diproses.',
    qx: 'Syarat order komentar Telegram apa?', ax: 'Channel harus punya discussion group yang terhubung dan tidak terkunci. Cek ikon balon komentar di bawah post.' },
  // ---- Facebook (ada: followers) ----
  { slug: 'beli-likes-facebook', svc: 'Likes Facebook', plat: 'Facebook', unit: 'page likes / post likes', target: 'link halaman atau postingan', match: 'Facebook Video/Reel Views',
    why: 'Page likes adalah social proof halaman bisnis — calon buyer menilai keseriusan usaha dari angkanya sebelum chat.',
    how: 'Untuk halaman: tempel link page. Untuk postingan: tempel link post. Keduanya tersedia di katalog.',
    risk: 'Page likes tidak sama dengan jangkauan — reach tetap ditentukan konten + iklan. Likes = etalase.',
    qx: 'Bedanya page likes dan post likes?', ax: 'Page likes menempel di halaman (akumulasi), post likes menempel di satu postingan. Tentukan dulu tujuannya sebelum order.' },
  { slug: 'beli-views-facebook', svc: 'Views Facebook', plat: 'Facebook', unit: 'video views', target: 'link video / Reels Facebook', match: 'Facebook Video/Reel Views',
    why: 'Video dan Reels FB yang views-nya jalan lebih berani di-boost (ads) — metrik awal yang bagus nurunin biaya per hasil.',
    how: 'Tempel link video/Reels publik. Views masuk bertahap natural.',
    risk: 'Video harus publik — video dengan privasi teman/tertentu tidak bisa diproses.',
    qx: 'Apakah views Facebook aman untuk video iklan?', ax: 'Aman untuk metrik organik. Untuk video yang sedang jalan ads, konsultasikan dulu — campur paid + panel butuh timing.' },
  { slug: 'beli-share-facebook', svc: 'Shares Facebook', plat: 'Facebook', unit: 'shares', target: 'link postingan publik', match: 'Facebook Video/Reel Views',
    why: 'Share memperluas jangkauan ke lingkaran pertemanan baru — cara termurah bikin postingan keluar dari echo chamber followers sendiri.',
    how: 'Postingan harus publik. Shares cocok untuk info promo, lowongan, dan pengumuman.',
    risk: 'Share bot tidak membawa klik nyata — ukur hasilnya dari reach insight, bukan cuma angka share.',
    qx: 'Postingan seperti apa yang boleh di-share?', ax: 'Hanya yang privasinya publik. Postingan grup tertutup atau teman saja tidak bisa diproses sistem.' },
  { slug: 'beli-komentar-facebook', svc: 'Komentar Facebook', plat: 'Facebook', unit: 'komentar', target: 'link postingan publik', match: 'Facebook Video/Reel Views',
    why: 'Postingan jualan yang ada tanya-jawab di komentarnya terlihat laris — efeknya langsung ke kepercayaan calon buyer.',
    how: 'Custom comments disarankan (tanya harga, testimoni, tanya stok) — jauh lebih meyakinkan daripada random.',
    risk: 'Komentar yang tidak dibalas admin terlihat aneh — siapkan balasan untuk tiap komentar custom yang diorder.',
    qx: 'Komentar custom seperti apa yang bagus untuk jualan?', ax: 'Pola tanya-jawab: "Harganya berapa kak?", "Sudah order, recommended!" — lalu balas semuanya dari akun admin.' },
  // ---- X/Twitter ----
  { slug: 'beli-followers-twitter', svc: 'Followers Twitter', plat: 'X/Twitter', unit: 'followers', target: 'link profil / username X', match: 'Twitter Tweet Views',
    why: 'Followers adalah kredibilitas utama di X — akun 10 ribu followers opininya didengar, akun 50 tidak.',
    how: 'Cukup username. Order gradual disarankan karena audit X cukup aktif terhadap lonjakan.',
    risk: 'X rutin suspend bot — pilih layanan refill supaya angka yang turun terisi lagi otomatis.',
    qx: 'Apakah followers X aman dari suspend?', ax: 'Akun kamu aman (tidak perlu password). Yang berisiko adalah akun-akun follower-nya — makanya pilih layanan refill.' },
  { slug: 'beli-likes-twitter', svc: 'Likes Twitter', plat: 'X/Twitter', unit: 'likes', target: 'link tweet (cuitan)', match: 'Twitter Tweet Views',
    why: 'Likes mendorong tweet ke tab trending topik dan For You — penting untuk campaign, launching, dan klarifikasi.',
    how: 'Tempel link tweet-nya (klik tanggal tweet untuk dapat link). Likes masuk cepat, cocok untuk momen.',
    risk: 'Likes > impressions kelihatan aneh — imbangi dengan tweet views di tweet yang sama.',
    qx: 'Likes atau views dulu untuk tweet baru?', ax: 'Views dulu sebagai fondasi, likes menyusul. Paket ideal: views 10x dari likes.' },
  { slug: 'beli-retweet-twitter', svc: 'Retweet Twitter', plat: 'X/Twitter', unit: 'retweets', target: 'link tweet (cuitan)', match: 'Twitter Tweet Views',
    why: 'Retweet = distribusi ke timeline followers orang lain — satu-satunya metrik X yang benar-benar memperluas jangkauan.',
    how: 'Cukup link tweet. Retweet + likes + views dalam satu tweet = paket push lengkap.',
    risk: 'Retweet bot tidak membawa klik profil nyata — ukur dari impressions, bukan cuma angka RT.',
    qx: 'Retweet atau quote tweet, mana yang didukung?', ax: 'Mayoritas layanan = retweet polos. Quote tweet butuh layanan khusus — cek katalog, tidak semua provider punya.' },
  { slug: 'beli-views-twitter', svc: 'Views Twitter', plat: 'X/Twitter', unit: 'tweet views', target: 'link tweet (cuitan)', match: 'Twitter Tweet Views',
    why: 'Impressions adalah fondasi semua metrik tweet — tanpa views, likes dan RT tidak punya dasar yang wajar.',
    how: 'Termurah di antara semua metrik X. Order views dulu sebagai fondasi, baru likes/RT menyusul.',
    risk: 'Views X dihitung longgar oleh sistem — angkanya naik cepat, jangan kaget kalau terasa "terlalu mudah".',
    qx: 'Berapa views wajar untuk akun kecil?', ax: 'Mulai 1.000-5.000 per tweet penting. Naikkan bertahap mengikuti pertumbuhan followers asli.' },
  // ---- Spotify ----
  { slug: 'beli-plays-spotify', svc: 'Plays Spotify', plat: 'Spotify', unit: 'plays', target: 'link lagu / album Spotify', match: 'Spotify Plays',
    why: 'Play count adalah CV musisi — label, playlist curator, dan EO menilai keseriusan dari angkanya sebelum dengar lagunya.',
    how: 'Tempel link track/album. Plays masuk bertahap harian — pilih paket sesuai target (1k/10k/100k).',
    risk: 'Spotify mendeteksi streaming tidak wajar — pilih layanan yang menyebut premium/real plays dan hindari yang janji instan.',
    qx: 'Apakah plays panel aman untuk akun artis?', ax: 'Pilih layanan gradual dari akun premium. Plays yang masuk natural per hari jauh lebih aman daripada spike sekaligus.' },
  { slug: 'beli-followers-spotify', svc: 'Followers Spotify', plat: 'Spotify', unit: 'followers', target: 'link profil artis Spotify', match: 'Spotify Plays',
    why: 'Followers artis = audiens rilis berikutnya — tiap lagu baru otomatis masuk Release Radar mereka.',
    how: 'Cukup link profil artis. Kombinasikan dengan plays di single terbaru untuk efek ganda.',
    risk: 'Followers tanpa plays kelihatan kosong — pastikan katalog single kamu juga jalan.',
    qx: 'Followers artis gunanya apa?', ax: 'Pengikut dapat notifikasi + Release Radar tiap kamu rilis lagu baru — ini audiens permanen, bukan sekali dengar.' },
  { slug: 'beli-listeners-spotify', svc: 'Listeners Spotify', plat: 'Spotify', unit: 'monthly listeners', target: 'link profil artis Spotify', match: 'Spotify Plays',
    why: 'Monthly listeners adalah metrik yang dilihat industri — angka ini yang tampil besar di profil artis dan jadi bahan negosiasi gig.',
    how: 'Order rutin bulanan karena metrik ini rolling 28 hari — sekali order tanpa lanjutan akan turun lagi.',
    risk: 'Metrik rolling = harus dirawat. Anggap sebagai langganan bulanan, bukan sekali bayar.',
    qx: 'Kenapa monthly listeners bisa turun lagi?', ax: 'Karena dihitung dari 28 hari terakhir bergulir. Rawat dengan order berkala + rilis konten rutin.' },
  // ---- Tambahan dari audit katalog real (69 story TG, 142 reactions FB, 98 live FB, 49 share YT, 79 komentar X) ----
  { slug: 'beli-story-telegram', svc: 'Story Telegram', plat: 'Telegram', unit: 'story views', target: 'link story channel yang sedang tayang', match: 'Telegram Post Views',
    why: 'Story Telegram muncul di bar teratas aplikasi — views story yang ramai bikin channel kelihatan aktif setiap hari.',
    how: 'Order saat story masih tayang. Cocok untuk info promo kilat dan pengumuman yang butuh dilihat cepat.',
    risk: 'Story Telegram juga kedaluwarsa — jangan order untuk story yang sudah mau habis masa tayangnya.',
    qx: 'Apakah story views Telegram menambah member?', ax: 'Tidak langsung. Fungsinya menaikkan visibilitas story — member baru datang dari konten channel yang memang menarik.' },
  { slug: 'beli-reactions-facebook', svc: 'Reactions Facebook', plat: 'Facebook', unit: 'reactions', target: 'link postingan publik', match: 'Facebook Video/Reel Views',
    why: 'Like, Love, dan Wow di postingan bikin konten terlihat disukai — algoritma FB menilai reaksi sebagai sinyal distribusi.',
    how: 'Pilih paket reaksi (like/love/wow). Cocok untuk postingan pengumuman dan konten viral.',
    risk: 'Reaksi yang tidak nyambung dengan isi (mis. Haha di berita duka) merusak citra — pilih paket yang sesuai konteks.',
    qx: 'Bisa pilih jenis reactions-nya?', ax: 'Bisa di sebagian layanan. Untuk postingan serius pilih paket Like/Love, hindari Haha/Angry.' },
  { slug: 'beli-live-facebook', svc: 'Live Viewers Facebook', plat: 'Facebook', unit: 'live viewers', target: 'link video live yang sedang berjalan', match: 'Facebook Video/Reel Views',
    why: 'Live shopping dan live event di FB butuh penonton — live sepi bikin yang mampir langsung pergi.',
    how: 'Order saat live berjalan, tentukan durasi. Bagus digabung dengan komentar live supaya interaksinya hidup.',
    risk: 'Koneksi live yang putus membuat penonton turun mendadak — pastikan stream stabil sebelum order.',
    qx: 'Cocok untuk live shopping?', ax: 'Sangat cocok. Penonton ramai + komentar jalan = social proof yang bikin penonton baru berani checkout.' },
  { slug: 'beli-share-youtube', svc: 'Shares YouTube', plat: 'YouTube', unit: 'shares', target: 'link video YouTube', match: 'Youtube Subscriber',
    why: 'Share video ke komunitas dan forum mendatangkan penonton baru di luar subscriber — sinyal distribusi eksternal yang dibaca algoritma.',
    how: 'Cukup link video. Shares paling efektif untuk video tutorial dan review yang memang layak disebar.',
    risk: 'Share bot tidak menghasilkan watch time — imbangi dengan order views + retention yang baik.',
    qx: 'Apakah share menambah jam tayang?', ax: 'Tidak langsung. Share membuka peluang penonton baru — jam tayang datang kalau mereka benar-benar menonton.' },
  { slug: 'beli-komentar-twitter', svc: 'Komentar Twitter', plat: 'X/Twitter', unit: 'replies', target: 'link tweet (cuitan)', match: 'Twitter Tweet Views',
    why: 'Reply yang ramai mendorong tweet ke percakapan trending — penting untuk thread edukasi dan opini.',
    how: 'Custom replies disarankan supaya nyambung dengan isi tweet. Hindari balasan generik satu kata.',
    risk: 'Reply spam bisa di-filter X — pakai kalimat natural yang relevan dengan topik tweet.',
    qx: 'Replies custom atau random?', ax: 'Custom selalu menang di X. Tulis 10-20 variasi balasan yang nyambung — quotes + pertanyaan pendek performanya bagus.' },
];

// Pool alasan generik per platform (rotasi supaya tidak identik antar halaman).
const PLATFORM_REASONS = {
  default: [
    'Tanpa password. Cukup tempel link — akun kamu tetap full milik kamu.',
    'Layanan refill tersedia — angka yang turun dalam masa garansi diisi ulang otomatis.',
  ],
};

// FAQ generik ber-slot (harga selalu rujuk tabel live — tidak hardcode Rp).
function baseFaq(svc, service, plat, unit, target) {
  return [
    {
      q: `Berapa harga ${service} per 1.000?`,
      a: `Lihat tabel harga real di atas — selalu update mengikuti katalog. Harga reseller lebih murah di semua layanan setelah daftar Rp50.000.`,
    },
    {
      q: `Apakah beli ${service} aman?`,
      a: `Aman selama pilih layanan gradual + refill dan order wajar. Tanpa password, cukup ${target} — akun tetap full milik kamu.`,
    },
    {
      q: `Berapa lama ${service} masuk setelah order?`,
      a: `Pesanan mulai berjalan 1-10 menit setelah saldo dikonfirmasi. Kecepatan penuh tergantung antrean layanan yang dipilih.`,
    },
    {
      q: `Bagaimana kalau ${unit} turun setelah order?`,
      a: `Pilih layanan berlabel refill — pengisian ulang berjalan otomatis selama masa garansi tanpa perlu lapor.`,
    },
    // Dua item ini menutup intent "jasa X" dan "order X" pada halaman yang sama,
    // supaya tidak perlu bikin halaman terpisah per variasi kata kunci.
    {
      q: `Jasa ${service} di sini ready atau perlu negosiasi?`,
      a: `Tidak ada negosiasi. Harga sudah final per unit dan langsung terlihat di tabel. Yang menentukan hanya jenis layanan yang dipilih: gradual, refill, atau super cepat.`,
    },
    {
      q: `Bagaimana cara order ${service} di Socio.id?`,
      a: `Tempel link, pilih nominal, lalu klik order. Saldo terpotong begitu pesanan masuk antrean provider, dan statusnya bisa dipantau langsung dari halaman pesanan tanpa perlu chat.`,
    },
  ];
}

function buildPage(s, siblings, idx) {
  const title = `Beli ${s.svc} Murah, Aman & Proses Cepat | Socio.id`;
  const description =
    `Beli ${s.svc.toLowerCase()} — proses otomatis tanpa password, garansi refill. Cek harga real & order di Socio.id.`;
  if (title.length > 70) throw new Error(`Title kepanjangan (${title.length}): ${s.slug}`);
  if (description.length > 160) throw new Error(`Desc kepanjangan (${description.length}): ${s.slug}`);
  const same = siblings.filter((x) => x.plat === s.plat && x.slug !== s.slug).map((x) => x.slug);
  const crossSell = [...same.slice(0, 2), 'smm-panel-reseller'].slice(0, 3);
  return {
    slug: s.slug,
    keyword: `Beli ${s.svc} Murah & Terpercaya`,
    title,
    description,
    heroSub: `${s.why.split('.')[0]}. Cek harga real per 1.000 di tabel bawah — update otomatis dari katalog.`,
    serviceMatch: s.match,
    platform: s.plat,
    // Tuple 3 (sesuai interface): angle why + how + 1 alasan generik rotasi.
    reasons: [s.why, s.how, PLATFORM_REASONS.default[idx % PLATFORM_REASONS.default.length]],
    faq: [...baseFaq(s.svc, s.svc.toLowerCase(), s.plat, s.unit, s.target), { q: s.qx, a: s.ax }],
    crossSell,
  };
}

function main() {
  const pages = SERVICES.map((s, i) => buildPage(s, SERVICES, i));
  const body = `import type { BeliPageData } from './beli-pages';

// GENERATED by seo/money-expand.mjs — JANGAN edit manual (akan tertimpa).
// ${pages.length} money pages tambahan. Harga 100% dari prices.json via template.

export const generatedPages: BeliPageData[] = ${JSON.stringify(pages, null, 2)};
`;
  if (DRY) {
    console.log(`${pages.length} pages (dry, tidak tulis). Contoh: ${pages[0].slug} | ${pages[0].title.length}ch`);
    return;
  }
  writeFileSync(OUT, body + '\n');
  console.log(`Wrote ${OUT} (${pages.length} pages)`);
}

main();
