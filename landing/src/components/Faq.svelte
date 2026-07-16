<script>
    import { slide } from 'svelte/transition';
    import { cubicOut } from 'svelte/easing';
    
    let activeIndex = 0;
    
    const faqs = [
        { 
            q: "Apakah nomor WhatsApp saya aman dari Banned?", 
            // JAWABAN SESUAI REQUEST ANDA
            a: "Pemblokiran adalah hak mutlak pihak WhatsApp/Meta. Risiko banned tetap ada <strong>HANYA JIKA</strong> Anda melanggar kebijakan Commerce (seperti spamming massal, penipuan, atau menjual barang terlarang). Selama pemakaian wajar untuk membalas chat pelanggan, akun Anda aman." 
        },
        { 
            q: "Apakah HP saya harus nyala terus (Online)?", 
            a: "Tidak perlu! Haloka berbasis Cloud Server. Kaka bisa matikan HP, kehabisan kuota, atau bahkan HP hilang sekalipun, AI Haloka tetap bekerja 24 jam melayani pelanggan tanpa henti." 
        },
        { 
            q: "Saya gaptek, apakah susah settingnya?", 
            a: "Justru Haloka dibuat untuk pebisnis, bukan programmer. Kaka tidak perlu coding sama sekali. Cukup upload file PDF/Word berisi info produk, dan dalam hitungan detik AI langsung 'pintar' dan siap menjawab. Semudah upload foto di sosmed!" 
        },
        { 
            q: "Bagaimana jika AI salah jawab / pelanggan ingin chat orang?", 
            a: "Tenang, kendali tetap di tangan Kaka. Kami punya fitur <strong>'Human Takeover'</strong>. Jika ada pertanyaan rumit atau pelanggan meminta bicara dengan admin, Kaka bisa langsung ambil alih percakapan kapan saja. AI akan otomatis diam (standby) saat manusia mulai mengetik." 
        },
        { 
            q: "Apakah data pelanggan saya aman?", 
            a: "Keamanan adalah prioritas kami #1. Data percakapan dienkripsi (Enterprise Grade Security). Kami tidak menjual data Kaka ke pihak ketiga. Kaka adalah pemilik tunggal data pelanggan Kaka." 
        },
        { 
            q: "Apa bedanya Paket Sapa, Sobat, dan Juragan?", 
            a: "<strong>Paket Sapa:</strong> Untuk pemula (1 nomor WA). <br><strong>Paket Sobat:</strong> Untuk toko berkembang (bisa 3 nomor WA). <br><strong>Paket Juragan:</strong> Best-seller kami dengan kapasitas response AI terbesar dan prioritas server tertinggi untuk brand serius." 
        },
        { 
            q: "Apakah ada kontrak terikat atau biaya tersembunyi?", 
            a: "Tidak ada kontrak jangka panjang yang mengikat. Kaka bebas berhenti berlangganan kapan saja. Kami menyarankan Kaka manfaatkan <strong>Trial Gratis 7 Hari</strong> dulu untuk membuktikan sendiri kecanggihan fitur Haloka sebelum memutuskan lanjut berlangganan." 
        }
    ];

    const toggle = (i) => {
        activeIndex = activeIndex === i ? null : i;
    };
</script>

<div class="relative w-full max-w-4xl mx-auto z-10">
    
    <div class="absolute -top-20 -left-20 w-72 h-72 bg-blue-200/30 rounded-full blur-[80px] animate-pulse"></div>
    <div class="absolute -bottom-20 -right-20 w-72 h-72 bg-green-200/30 rounded-full blur-[80px] animate-pulse delay-700"></div>

    <div class="space-y-4">
        {#each faqs as faq, i}
            <div class="group relative bg-white/80 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden
                {activeIndex === i 
                    ? 'border-green shadow-lg shadow-green/10 scale-[1.01]' 
                    : 'border-gray-200 hover:border-green/50 hover:shadow-md'}">
                
                <button 
                    class="w-full flex justify-between items-center p-6 text-left focus:outline-none cursor-pointer"
                    on:click={() => toggle(i)}
                >
                    <span class="font-display font-bold text-lg transition-colors duration-300 {activeIndex === i ? 'text-green-700' : 'text-gray-700 group-hover:text-primary'}">
                        {faq.q}
                    </span>
                    
                    <span class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 
                        {activeIndex === i ? 'bg-green text-white rotate-180' : 'bg-gray-100 text-gray-500 group-hover:bg-green/10 group-hover:text-green'}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </span>
                </button>

                {#if activeIndex === i}
                    <div 
                        transition:slide={{ duration: 300, easing: cubicOut }}
                        class="px-6 pb-6"
                    >
                        <div class="pt-4 border-t border-dashed border-green/20 text-gray-600 leading-relaxed text-base">
                            {@html faq.a} 
                        </div>
                    </div>
                {/if}
                
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-green transition-all duration-300 {activeIndex === i ? 'opacity-100' : 'opacity-0'}"></div>
            </div>
        {/each}
    </div>

    <div class="mt-12 text-center">
        <p class="text-gray-500 mb-4">Masih ada pertanyaan yang belum terjawab?</p>
        <a href="https://wa.me/6281234567890" target="_blank" class="inline-flex items-center gap-2 text-primary font-bold hover:text-green transition">
            <span>💬</span> Chat Tim Support Kami
        </a>
    </div>
</div>