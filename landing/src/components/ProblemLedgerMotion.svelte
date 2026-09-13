<script>
  import { onMount } from 'svelte';
  // V2 §5.4 MasalahKamu — chat WA yang "hidup": bubble muncul berurutan seperti
  // percakapan asli (indikator mengetik → bubble pop, 650ms + 320ms jeda).
  // Main sekali saat section masuk viewport; reduced-motion → semua langsung.
  const pairs = [
    {
      complaint: 'Order manual terus, klien rewel nanyain progres.',
      answer: 'Order otomatis 24 jam. Klien tanya? Kirim link tracking.',
    },
    {
      complaint: 'Followers drop, klien ngamuk, reputasi taruhannya.',
      answer: 'Layanan refill 30 hari — drop diisi ulang otomatis, kamu tinggal tenang.',
    },
    {
      complaint: 'Harga panel naik-turun, marginku jadi judi.',
      answer: 'Harga grosir transparan di katalog live. Hitung margin sebelum order, bukan sesudah.',
    },
  ];
  const messages = pairs.flatMap((p) => [
    { side: 'them', text: p.complaint },
    { side: 'me', text: p.answer },
  ]);

  let shown = $state(0);
  let typing = $state(false);
  let started = $state(false);
  let timers = [];
  const reduced =
    typeof window !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  function play() {
    if (started) return;
    started = true;
    if (reduced) {
      shown = messages.length;
      return;
    }
    let i = 0;
    const step = () => {
      if (i >= messages.length) {
        typing = false;
        return;
      }
      typing = true;
      timers.push(
        setTimeout(() => {
          typing = false;
          shown = i + 1;
          i += 1;
          timers.push(setTimeout(step, 320));
        }, 650),
      );
    };
    step();
  }

  onMount(() => {
    const sec = document.getElementById('masalah-section');
    if (!sec) {
      shown = messages.length;
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(sec);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  });

  const typingSide = $derived(shown < messages.length ? messages[shown].side : 'them');
</script>

<section id="masalah-section" class="bg-[var(--paper-warm)] py-16 md:py-24" aria-labelledby="problem-title">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <div class="mx-auto max-w-2xl text-center">
      <h2 id="problem-title" class="reveal font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Jualan jasa sosmed itu gampang. <span class="marker-swipe">Panelnya</span> yang kadang bikin elus dada.
      </h2>
      <!-- TODO(foto-asli): ganti avatar inisial D dengan foto asli reseller (minta ke owner).
           Jangan publish foto stok wajah seolah orang beneran — ini ilustrasi persona. -->
      <p class="reveal mt-4 flex items-center justify-center gap-2.5 text-[14px] text-ink-2" style="--d:120ms">
        <span class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[var(--pop-mango-soft)] text-[14px] font-bold text-ink shadow-sm" aria-hidden="true">
          D
          <span class="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true"></span>
        </span>
        <span><strong class="text-ink">Dewi</strong>, reseller Jakarta — dan ribuan lainnya, ceritanya mirip-mirip.</span>
      </p>
    </div>

    <!-- Chat WA: keluhan (putih, kanan) + jawaban Socio (accent-tint, kiri) -->
    <div
      class="mx-auto mt-10 max-w-2xl space-y-4 md:mt-14"
      aria-live="polite"
      aria-label="Simulasi percakapan dengan reseller"
    >
      {#each messages.slice(0, shown) as msg (msg.text)}
        {#if msg.side === 'them'}
          <div class="flex justify-end">
            <p class="chat-in max-w-[85%] rounded-2xl rounded-br-md border border-[var(--hairline-strong)] bg-white px-4 py-3 text-[15px] leading-relaxed text-ink shadow-sm">
              “{msg.text}”
            </p>
          </div>
        {:else}
          <div class="flex justify-start">
            <p class="chat-in max-w-[85%] rounded-2xl rounded-bl-md bg-[var(--accent-tint)] px-4 py-3 text-[15px] leading-relaxed text-ink">
              <span class="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 align-[-4px]" aria-hidden="true">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
              </span>
              {msg.text}
            </p>
          </div>
        {/if}
      {/each}
      {#if typing}
        <div class="flex {typingSide === 'them' ? 'justify-end' : 'justify-start'}">
          <p
            class="chat-in flex items-center gap-1.5 rounded-2xl px-4 py-3.5 {typingSide === 'them' ? 'rounded-br-md border border-[var(--hairline-strong)] bg-white' : 'rounded-bl-md bg-[var(--accent-tint)]'}"
            aria-hidden="true"
          >
            <span class="typing-dot"></span>
            <span class="typing-dot" style="animation-delay: 150ms"></span>
            <span class="typing-dot" style="animation-delay: 300ms"></span>
          </p>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  /* Bubble masuk seperti chat: spring pop (origin ngikutin sisi bubble) */
  .chat-in {
    animation: chat-in 450ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
    transform-origin: bottom right;
  }
  .flex.justify-start .chat-in {
    transform-origin: bottom left;
  }
  @keyframes chat-in {
    from {
      opacity: 0;
      transform: scale(0.85) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  /* Titik-titik mengetik */
  .typing-dot {
    width: 7px;
    height: 7px;
    border-radius: 9999px;
    background: var(--ink-3);
    animation: typing-bounce 900ms ease-in-out infinite;
  }
  @keyframes typing-bounce {
    0%,
    60%,
    100% {
      transform: translateY(0);
      opacity: 0.5;
    }
    30% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .chat-in,
    .typing-dot {
      animation: none;
    }
  }
</style>
