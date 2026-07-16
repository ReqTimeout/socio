<script>
  import { fade, fly } from 'svelte/transition';

  const regBase = 'https://app.socio.id/register';

  const packages = [
    {
      id: 'starter',
      name: 'Starter',
      topup: 50000,
      bonus: 0,
      desc: 'Buat coba-coba & kebutuhan pribadi. Langsung cair.',
      features: ['Saldo Rp50.000', 'Akses 8.185 layanan', 'Status real-time', 'Support chat'],
      isPopular: false,
      colorClass: 'border-ink-100 hover:border-ink-300 hover:shadow-xl',
    },
    {
      id: 'pro',
      name: 'Pro',
      topup: 200000,
      bonus: 10000,
      desc: 'Paling laris buat reseller & UMKM yang serius napak.',
      features: ['Saldo Rp200.000', 'Bonus Rp10.000 🔥', 'Harga grosir per 1k', 'Prioritas antrean', 'Refill otomatis'],
      isPopular: true,
      colorClass: 'border-primary shadow-2xl shadow-primary-500/20 ring-1 ring-primary transform scale-105 z-10',
    },
    {
      id: 'master',
      name: 'Master',
      topup: 500000,
      bonus: 50000,
      desc: 'Buat agen & reseller besar yang butuh volume tinggi.',
      features: ['Saldo Rp500.000', 'Bonus Rp50.000 🔥', 'Harga agen termurah', 'API akses', 'Account manager'],
      isPopular: false,
      colorClass: 'border-accent-200 hover:border-accent-400 bg-accent-50/10',
    },
  ];

  const formatIDR = (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);
</script>

<section class="py-24 bg-white relative overflow-hidden">
  <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
    <div class="absolute top-[10%] right-[5%] w-[500px] h-[500px] bg-primary-50 rounded-full blur-3xl opacity-40 mix-blend-multiply"></div>
    <div class="absolute bottom-[10%] left-[5%] w-[500px] h-[500px] bg-accent-50 rounded-full blur-3xl opacity-40 mix-blend-multiply"></div>
  </div>

  <div class="max-w-7xl mx-auto px-4 relative z-10">
    <div class="text-center max-w-3xl mx-auto mb-16">
      <h2 class="font-display font-black text-3xl md:text-5xl text-ink-900 mb-6">
        Top Up Saldo,<br />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-600">Semakin Besar Semakin Hemat</span>
      </h2>
      <p class="text-ink-500 text-lg">Tidak ada langganan bulanan. Isi saldo sekali, pakai sampai habis. Bonus makin gede di paket besar.</p>
    </div>

    <div class="grid md:grid-cols-3 gap-8 items-start">
      {#each packages as pkg}
        <div id={pkg.id} class="relative bg-white rounded-[2rem] p-8 transition-all duration-500 flex flex-col h-full group border-2 {pkg.colorClass}">
          {#if pkg.isPopular}
            <div
              class="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent-600 text-white px-6 py-1.5 rounded-full text-xs font-bold shadow-lg tracking-wide ring-4 ring-white z-20"
            >
              ✨ PALING LARIS
            </div>
          {/if}

          <div class="text-center mb-6 pt-2">
            <h3 class="font-display font-bold text-2xl text-ink-900 mb-3">{pkg.name}</h3>
            <p class="text-xs text-ink-500 leading-relaxed min-h-[40px] px-2 font-medium">{pkg.desc}</p>
          </div>

          <div class="text-center mb-8 pb-8 border-b border-dashed border-ink-200 relative h-28 flex items-center justify-center">
            <div class="absolute w-full">
              <div class="flex items-start justify-center text-ink-900 font-bold">
                <span class="text-lg mt-2 mr-1 text-ink-400">Rp</span>
                <span class="text-5xl tracking-tight">{formatIDR(pkg.topup)}</span>
              </div>
              <div class="text-xs text-ink-400 mt-2 font-bold uppercase tracking-wider">saldo</div>
              {#if pkg.bonus > 0}
                <div class="mt-2">
                  <span class="text-[10px] text-success font-bold bg-success-soft px-3 py-1 rounded-full">+ Bonus Rp {formatIDR(pkg.bonus)}</span>
                </div>
              {/if}
            </div>
          </div>

          <ul class="space-y-4 mb-10 text-sm text-ink-600 flex-1 px-2">
            {#each pkg.features as feat}
              <li class="flex items-start gap-3 group-hover:text-ink-900 transition-colors">
                <div class="w-5 h-5 rounded-full bg-primary-50 flex-shrink-0 flex items-center justify-center text-primary font-bold text-xs mt-0.5">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <span class="leading-snug">{feat}</span>
              </li>
            {/each}
          </ul>

          <a
            href={regBase}
            class="block w-full text-center py-4 rounded-xl font-bold transition-all duration-300 transform active:scale-[0.98] shadow-sm
              {pkg.isPopular
              ? 'bg-primary text-white shadow-lg shadow-primary-200 hover:bg-primary-700 hover:shadow-primary-300'
              : 'bg-white border-2 border-ink-200 text-ink-600 hover:border-primary hover:text-primary'}"
          >
            Top Up {pkg.name}
          </a>
        </div>
      {/each}
    </div>

    <div class="mt-20 text-center border-t border-ink-100 pt-8">
      <p class="text-ink-500 text-sm">
        Butuh saldo custom / jadi reseller?
        <a href="https://wa.me/62811919328" class="text-primary font-bold hover:text-primary-800 transition-colors ml-1">Chat Tim Socio.id</a>
      </p>
    </div>
  </div>
</section>
