<script>
    import { onMount } from 'svelte';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import { fade, fly, scale } from 'svelte/transition';

    // --- LOGIKA CALCULATOR ---
    let chatsPerDay = 100;
    
    $: workloadHours = Math.ceil((chatsPerDay * 5) / 60); 
    $: isSafe = workloadHours <= 4;
    $: isWarning = workloadHours > 4 && workloadHours <= 8;
    $: isCritical = workloadHours > 8;

    $: currentEmoji = isSafe ? '🙂' : (isWarning ? '😓' : '🤯');
    $: barColor = isSafe ? 'bg-emerald-500' : (isWarning ? 'bg-orange-500' : 'bg-red-500');

    let pkgThemeClass = '';
    let pkgName = '';
    let pkgPriceMonth = 0;

    $: if (chatsPerDay < 50) {
        pkgName = 'Paket Sapa';
        pkgPriceMonth = 699000;
        pkgThemeClass = 'bg-gradient-to-br from-emerald-600 to-teal-800 shadow-emerald-500/40 border-emerald-400/50'; 
    } else if (chatsPerDay < 500) {
        pkgName = 'Paket Sobat';
        pkgPriceMonth = 1599000;
        pkgThemeClass = 'bg-gradient-to-br from-blue-700 to-indigo-800 shadow-blue-600/40 border-blue-400/50'; 
    } else {
        pkgName = 'Paket Juragan';
        pkgPriceMonth = 3999000;
        pkgThemeClass = 'bg-gradient-to-br from-purple-700 to-violet-900 shadow-purple-600/40 border-purple-400/50'; 
    }

    $: pricePerDay = Math.ceil(pkgPriceMonth / 30);

    const animatedHours = tweened(0, { duration: 500, easing: cubicOut });
    const animatedDaily = tweened(0, { duration: 500, easing: cubicOut });
    
    $: animatedHours.set(workloadHours);
    $: animatedDaily.set(pricePerDay);

    $: recPackageId = chatsPerDay < 50 ? 'haloka_sapa' : (chatsPerDay < 500 ? 'haloka_sobat' : 'haloka_juragan');

    const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);

    function scrollToRecommendation() {
        const targetElement = document.getElementById(recPackageId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetElement.classList.add('highlight-target');
            setTimeout(() => targetElement.classList.remove('highlight-target'), 2000);
        } else {
            window.location.href = '#pricing';
        }
    }

    // --- LOGIKA PAIN POINTS (ANIMASI DRAMA) ---
    let chatStep = 0;
    let moneyStep = 0;
    let nightStep = 0;

    onMount(() => {
        const chatInterval = setInterval(() => { chatStep = (chatStep + 1) % 4; }, 2000);
        const moneyInterval = setInterval(() => { moneyStep = (moneyStep + 1) % 3; }, 1500);
        const nightInterval = setInterval(() => { nightStep = (nightStep + 1) % 3; }, 1800);

        return () => {
            clearInterval(chatInterval);
            clearInterval(moneyInterval);
            clearInterval(nightInterval);
        };
    });
</script>

<section class="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white">
    
    <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(#444 1px, transparent 1px); background-size: 30px 30px;"></div>
        <div class="absolute top-0 -left-4 w-96 h-96 bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob"></div>
        <div class="absolute top-1/2 right-0 w-96 h-96 bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-2000"></div>
        <div class="absolute bottom-0 left-20 w-96 h-96 bg-green-200/40 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-4000"></div>
    </div>

    <div class="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>

    <div class="relative z-20 container mx-auto px-4 md:px-8 max-w-7xl">
        
        <div class="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 md:p-10 shadow-2xl border border-white/60 mb-20 md:mb-32">
            
            <div class="text-center mb-8">
                <span class="inline-block py-1 px-3 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold tracking-widest uppercase mb-2 shadow-sm">
                    🔥 Reality Check Bisnis
                </span>
                <h2 class="font-display font-black text-2xl md:text-3xl text-gray-900 mb-2 leading-tight">
                    Seberapa Berat Beban Tim Anda?
                </h2>
                <p class="text-sm text-gray-500 max-w-2xl mx-auto">
                    Geser slider. Bandingkan lelahnya cara manual vs <strong>cepatnya Haloka membereskan chat.</strong>
                </p>
            </div>

            <div class="mb-8 bg-white/50 rounded-2xl p-5 md:p-8 border border-white shadow-sm relative">
                <div class="flex flex-col md:flex-row justify-between items-end mb-4 md:mb-6 gap-2">
                    <label class="font-bold text-gray-700 text-base md:text-lg flex flex-col">
                        <span>Volume Chat Harian</span>
                        <span class="text-xs text-gray-400 font-normal mt-0.5">Total chat masuk ke WA toko</span>
                    </label>
                    <div class="text-4xl md:text-5xl font-display font-black text-gray-800 tracking-tight flex items-baseline">
                        {chatsPerDay}
                        <span class="text-base md:text-lg font-sans text-gray-400 font-bold ml-2">chat</span>
                    </div>
                </div>
                
                <div class="relative w-full h-5 bg-gray-200 rounded-full shadow-inner cursor-pointer group">
                    <input type="range" min="10" max="1000" step="10" bind:value={chatsPerDay} class="absolute w-full h-full opacity-0 cursor-pointer z-20" />
                    <div class="absolute h-full rounded-full z-10 transition-all duration-300 ease-out {barColor}" style="width: {(chatsPerDay/1000)*100}%"></div>
                    <div class="absolute h-8 w-8 bg-white border-[3px] border-gray-100 rounded-full shadow-lg z-10 top-1/2 -translate-y-1/2 transition-all duration-100 ease-out pointer-events-none transform group-hover:scale-110 flex items-center justify-center" style="left: calc({(chatsPerDay/1000)*100}% - 16px)">
                         <div class="w-2.5 h-2.5 rounded-full {barColor}"></div>
                    </div>
                </div>
                <div class="flex justify-between text-[10px] md:text-xs text-gray-400 mt-2 font-mono uppercase tracking-wide font-bold">
                    <span>Sepi (10)</span>
                    <span>Normal (500)</span>
                    <span>Viral (1000)</span>
                </div>
            </div>

            <div class="grid md:grid-cols-2 gap-6 items-stretch">
                <div class="bg-white rounded-2xl p-6 md:p-8 border transition-all duration-500 flex flex-col justify-between shadow-sm {isCritical ? 'border-red-200 ring-2 ring-red-50 shake-hard' : (isWarning ? 'border-orange-200' : 'border-gray-200')}">
                    <div>
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-3xl shadow-sm bg-gray-50 transition-transform duration-300 {isCritical ? 'scale-110' : ''}">{currentEmoji}</div>
                            <div>
                                <h3 class="font-bold text-gray-900 text-lg">Metode Manual</h3>
                                <p class="text-xs text-gray-500">Estimasi Beban Tim</p>
                            </div>
                        </div>
                        <div class="space-y-1 mb-4">
                            <div class="flex justify-between items-end">
                                <span class="text-xs text-gray-500 uppercase font-bold tracking-wide">Jam Kerja Dibutuhkan</span>
                                <span class="font-bold text-2xl md:text-3xl {isCritical ? 'text-red-600' : 'text-gray-800'}">{Math.floor($animatedHours)} Jam</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div class="h-full transition-all duration-500 {barColor} {isCritical ? 'animate-pulse' : ''}" style="width: {Math.min(($animatedHours/24)*100, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="p-3 rounded-lg text-xs leading-relaxed font-medium bg-gray-50 border border-gray-100">
                        {#if isCritical}
                            <span class="text-red-600 font-bold flex items-center gap-2"><span class="text-lg">🔥</span> OVERLOAD</span>
                            <p class="mt-1 text-gray-600">Mustahil dikerjakan 1 orang. Risiko <i>burnout</i> & chat tak terbalas sangat tinggi.</p>
                        {:else if isWarning}
                            <span class="text-orange-600 font-bold flex items-center gap-2"><span class="text-lg">⚠️</span> WARNING</span>
                            <p class="mt-1 text-gray-600">Tim butuh lembur. Fokus mereka habis hanya untuk balas chat.</p>
                        {:else}
                            <span class="text-emerald-600 font-bold flex items-center gap-2"><span class="text-lg">✅</span> AMAN</span>
                            <p class="mt-1 text-gray-600">Beban kerja wajar. Pastikan tetap aman saat orderan naik.</p>
                        {/if}
                    </div>
                </div>

                <div class="rounded-2xl p-6 md:p-8 text-white shadow-xl transition-all duration-500 flex flex-col justify-between relative overflow-hidden group border {pkgThemeClass}">
                    <div class="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:animate-[shimmer_2s_infinite]"></div>
                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/10">🚀</div>
                                <div>
                                    <h3 class="font-bold text-white text-lg">Solusi Haloka</h3>
                                    <p class="text-[10px] text-white/90 uppercase tracking-widest font-semibold">Unlimited 24 Jam</p>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-0.5">
                            <p class="text-xs text-white/80">Rekomendasi Paket Hemat:</p>
                            <h4 class="text-2xl font-bold tracking-tight text-white">{pkgName}</h4>
                        </div>
                    </div>
                    <div class="relative z-10 mt-4 pt-4 border-t border-white/20">
                        <div class="flex items-end gap-1.5 mb-1">
                            <span class="text-sm font-medium text-white/90 mb-1.5">Hanya</span>
                            <span class="text-4xl font-mono font-bold text-white tracking-tighter shadow-sm">Rp {formatRupiah($animatedDaily)}</span>
                            <span class="text-sm font-medium text-white/90 mb-1.5">/hari</span>
                        </div>
                        <p class="text-[10px] text-white/70 mb-4 font-medium">*Total Rp {formatRupiah(pkgPriceMonth)}/bulan</p>
                        <button on:click={scrollToRecommendation} class="w-full py-3 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-50 hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-2 group-hover:shadow-xl">
                            Ambil Paket Ini
                            <svg class="w-3 h-3 text-gray-600 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="text-center max-w-3xl mx-auto mb-12">
            <h2 class="font-display font-bold text-2xl md:text-4xl text-gray-900 mb-4">
                Selain Beban Kerja, <br><span class="text-red-500">3 Masalah Ini</span> Bikin Boncos Diam-Diam
            </h2>
            <p class="text-gray-500 text-sm md:text-base">
                Sering mengalami kejadian di bawah ini? Hati-hati, profit Anda sedang tergerus pelan-pelan.
            </p>
        </div>

        <div class="grid md:grid-cols-3 gap-6 md:gap-8">
            
            <div class="group bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-red-100 transition-all duration-300 border border-gray-100 relative overflow-hidden">
                <div class="h-40 mb-6 bg-gray-50 rounded-2xl p-4 flex flex-col justify-between relative border border-gray-100">
                    <div class="flex items-center gap-2 border-b border-gray-200 pb-2 mb-2">
                        <div class="w-2 h-2 rounded-full bg-red-500"></div>
                        <div class="text-[10px] text-gray-400">Customer Calon Buyer</div>
                    </div>
                    <div class="space-y-2 text-[10px]">
                        {#if chatStep >= 1}
                            <div in:fly={{x: -10}} class="bg-white p-2 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm border border-gray-100 w-fit">"Min, Gamis Maroon ready?"</div>
                        {/if}
                        {#if chatStep === 2}
                            <div in:fade class="flex justify-end">
                                <div class="bg-gray-200 p-2 rounded-tl-xl rounded-bl-xl rounded-br-xl w-fit text-gray-500 italic">Admin is typing...</div>
                            </div>
                        {/if}
                        {#if chatStep === 3}
                            <div in:fly={{x: -10}} class="bg-red-100 text-red-600 p-2 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm w-fit font-bold">"Lama banget. Skip!" 😡</div>
                        {/if}
                    </div>
                </div>
                <h3 class="font-bold text-lg text-gray-900 mb-2 group-hover:text-red-500 transition-colors">Respon Lambat = Batal Beli</h3>
                <p class="text-gray-500 text-xs leading-relaxed">Telat balas 5 menit karena chat numpuk? Customer sudah checkout di toko sebelah yang fast response.</p>
            </div>

            <div class="group bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-orange-100 transition-all duration-300 border border-gray-100 relative overflow-hidden">
                <div class="h-40 mb-6 bg-orange-50/50 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    {#if moneyStep === 0}
                        <div in:scale class="text-center"><div class="text-4xl">💰</div><div class="text-xs font-bold text-gray-600 mt-2">Omzet Masuk</div></div>
                    {:else if moneyStep === 1}
                        <div in:fly={{y: 20}} class="text-center"><div class="text-4xl animate-bounce">💸</div><div class="text-xs font-bold text-red-500 mt-2">- Gaji Admin</div><div class="text-xs font-bold text-red-500">- THR & Bonus</div></div>
                    {:else}
                        <div in:scale class="text-center opacity-50 grayscale"><div class="text-4xl">📉</div><div class="text-xs font-bold text-gray-400 mt-2">Margin Menipis</div></div>
                    {/if}
                </div>
                <h3 class="font-bold text-lg text-gray-900 mb-2 group-hover:text-orange-500 transition-colors">Biaya Admin Membengkak</h3>
                <p class="text-gray-500 text-xs leading-relaxed">Mau scale-up order harus rekrut admin baru? Gaji, training, dan THR akan memakan margin profit Anda.</p>
            </div>

            <div class="group bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-blue-100 transition-all duration-300 border border-gray-100 relative overflow-hidden">
                <div class="h-40 mb-6 bg-[#1e293b] rounded-2xl relative overflow-hidden flex flex-col items-center justify-center">
                    <div class="absolute top-3 right-3 text-2xl opacity-50">🌙</div>
                    {#if nightStep === 0}
                        <div in:fade class="text-blue-200 text-xs text-center"><span class="block text-2xl mb-1">😴</span>Toko Tutup / Istirahat</div>
                    {/if}
                    {#if nightStep >= 1}
                        <div in:fly={{y: 50}} class="absolute bottom-4 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-lg flex items-center gap-2 w-3/4 shadow-lg">
                            <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white">WA</div>
                            <div class="flex-1"><div class="h-1.5 w-12 bg-gray-400 rounded mb-1"></div><div class="h-1.5 w-8 bg-gray-500 rounded"></div></div>
                            {#if nightStep === 2}<span in:scale class="text-red-400 text-xs font-bold">❌ Missed</span>{/if}
                        </div>
                    {/if}
                </div>
                <h3 class="font-bold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Toko Tutup = Rejeki Tutup</h3>
                <p class="text-gray-500 text-xs leading-relaxed">Customer belanja malam hari (insomnia shopping). Chat jam 12 malam tak dibalas? Besok mereka lupa.</p>
            </div>

        </div>

    </div>
</section>

<style>
    @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
    }
    .animate-blob { animation: blob 7s infinite; }
    .animation-delay-2000 { animation-delay: 2s; }
    .animation-delay-4000 { animation-delay: 4s; }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
    }
    .shake-hard { animation: shake 0.5s; animation-iteration-count: 1; }
    
    @keyframes shimmer { 100% { left: 150%; } }
</style>