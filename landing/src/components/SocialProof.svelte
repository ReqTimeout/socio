<script>
  const testimonials = [
    { name: 'Juragan Fashion', role: 'Owner Toko Online', text: 'Followers IG naik 5rb dalam sejam padahal baru order. Kagum sih, murah lagi! 🤯', type: 'wow', stars: 5 },
    { name: 'Koh Reza', role: 'Content Creator', text: 'Views TikTok aman, gak pernah kena banned. Engagement beneran naik, algoritma suka.', type: 'quality', stars: 5 },
    { name: 'Ibu Ani', role: 'Reseller SMM', text: 'Jadi reseller di Socio.id, marginnya enak banget. Dashboard buat kirim order ke client gampang.', type: 'money', stars: 5 },
    { name: 'Mas Tio', role: 'Jasa SEO', text: 'Layanan SEO + backlink lengkap. Klien puas, ranking naik. Top-up juga kilat.', type: 'feature', stars: 5 },
    { name: 'Toko Mas Berkah', role: 'Pedagang Emas', text: 'Awalnya ragu beli follower, tapi garansinya bikin tenang. Refill jalan otomatis.', type: 'trust', stars: 5 },
    { name: 'Sista Nana', role: 'Reseller Baju Anak', text: 'Mulai Rp10.000 bisa order? Serius min? Ini mah lebih murah dari jajan boba 😂', type: 'price', stars: 5 },
    { name: 'Pak Budi', role: 'Agen Properti', text: 'Status order transparan banget. Gak perlu nanya CS, tinggal lihat dashboard.', type: 'feature', stars: 5 },
    { name: 'Kang Ojol', role: 'Sampingan Jualan', text: 'Gaptek parah tapi gampang banget. Tinggal tempel link, klik, beres. Fix langganan.', type: 'ease', stars: 5 },
    { name: 'Cici Shop', role: 'Importir', text: 'Pas lagi viral malam hari panel tetep jalan. Order tetep masuk, rejeki gak kelewat.', type: 'pain', stars: 5 },
    { name: 'Bang Jago', role: 'Owner Kopi', text: 'Like & review Google Maps dari sini bikin kedai makin dilirik. Mantap Socio.id!', type: 'demand', stars: 5 },
  ];

  function getCardAccents(type) {
    switch (type) {
      case 'wow':
        return 'shadow-primary-100 hover:shadow-primary-200 hover:border-primary-200';
      case 'money':
        return 'shadow-success-soft hover:shadow-success-soft hover:border-success';
      case 'price':
        return 'shadow-warning-soft hover:shadow-warning-soft hover:border-warning';
      case 'pain':
        return 'shadow-danger-soft hover:shadow-danger-soft hover:border-danger';
      default:
        return 'shadow-accent-100 hover:shadow-accent-200 hover:border-accent-200';
    }
  }
</script>

<section class="py-24 bg-ink-50 overflow-hidden relative">
  <div class="container mx-auto px-6 relative z-10">
    <div class="text-center max-w-3xl mx-auto mb-16">
      <span
        class="inline-block py-1 px-3 rounded-full bg-primary-100 text-primary-700 font-bold tracking-widest uppercase text-[10px] mb-4 shadow-sm"
      >
        ✨ Testimoni Member
      </span>
      <h2 class="font-display font-black text-3xl md:text-5xl text-ink-900 mb-6 leading-tight">
        Kenapa Mereka<br />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-600">Pindah ke Socio.id</span>
      </h2>
      <p class="text-ink-500 text-lg">Cerita nyata dari reseller & pemilik bisnis yang sudah merasakannya.</p>
    </div>

    <div
      class="relative h-[650px] overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-48 before:bg-gradient-to-b before:from-ink-50 before:to-transparent before:z-10 after:absolute after:bottom-0 after:left-0 after:w-full after:h-48 after:bg-gradient-to-t after:from-ink-50 after:to-transparent after:z-10"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        <div class="space-y-6 animate-scroll-up hover:pause">
          {#each [...testimonials, ...testimonials] as item}
            <div
              class="group relative bg-white/80 backdrop-blur-sm p-7 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:z-20 {getCardAccents(item.type)}"
            >
              <div class="flex gap-0.5 text-yellow-400 mb-4 text-sm filter drop-shadow-sm">
                {#each Array(item.stars) as _}<span>⭐</span>{/each}
              </div>
              <p class="text-ink-700 leading-relaxed mb-6 font-medium relative z-10">"{item.text}"</p>
              <div class="flex items-center gap-4">
                <div
                  class="w-12 h-12 rounded-full bg-gradient-to-tr from-ink-50 to-white border border-ink-100 shadow-sm flex items-center justify-center text-lg font-bold text-ink-600"
                >
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div class="font-bold text-ink-900 text-[15px]">{item.name}</div>
                  <div class="text-xs text-primary/60 font-bold uppercase tracking-wider mt-0.5">{item.role}</div>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <div class="space-y-6 animate-scroll-down hover:pause hidden md:block" style="animation-duration: 140s;">
          {#each [...testimonials.slice().reverse(), ...testimonials] as item}
            <div
              class="group relative bg-white/80 backdrop-blur-sm p-7 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:z-20 {getCardAccents(item.type)}"
            >
              <div class="flex gap-0.5 text-yellow-400 mb-4 text-sm filter drop-shadow-sm">
                {#each Array(item.stars) as _}<span>⭐</span>{/each}
              </div>
              <p class="text-ink-700 leading-relaxed mb-6 font-medium relative z-10">"{item.text}"</p>
              <div class="flex items-center gap-4">
                <div
                  class="w-12 h-12 rounded-full bg-gradient-to-tr from-ink-50 to-white border border-ink-100 shadow-sm flex items-center justify-center text-lg font-bold text-ink-600"
                >
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div class="font-bold text-ink-900 text-[15px]">{item.name}</div>
                  <div class="text-xs text-primary/60 font-bold uppercase tracking-wider mt-0.5">{item.role}</div>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <div class="space-y-6 animate-scroll-up hover:pause hidden md:block" style="animation-duration: 100s;">
          {#each [...testimonials.slice().sort(() => Math.random() - 0.5), ...testimonials] as item}
            <div
              class="group relative bg-white/80 backdrop-blur-sm p-7 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:z-20 {getCardAccents(item.type)}"
            >
              <div class="flex gap-0.5 text-yellow-400 mb-4 text-sm filter drop-shadow-sm">
                {#each Array(item.stars) as _}<span>⭐</span>{/each}
              </div>
              <p class="text-ink-700 leading-relaxed mb-6 font-medium relative z-10">"{item.text}"</p>
              <div class="flex items-center gap-4">
                <div
                  class="w-12 h-12 rounded-full bg-gradient-to-tr from-ink-50 to-white border border-ink-100 shadow-sm flex items-center justify-center text-lg font-bold text-ink-600"
                >
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div class="font-bold text-ink-900 text-[15px]">{item.name}</div>
                  <div class="text-xs text-primary/60 font-bold uppercase tracking-wider mt-0.5">{item.role}</div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  @keyframes scroll-up {
    0% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(-50%);
    }
  }
  @keyframes scroll-down {
    0% {
      transform: translateY(-50%);
    }
    100% {
      transform: translateY(0);
    }
  }

  .animate-scroll-up {
    animation: scroll-up 120s linear infinite;
  }
  .animate-scroll-down {
    animation: scroll-down 120s linear infinite;
  }

  .hover\:pause:hover {
    animation-play-state: paused;
  }
</style>
