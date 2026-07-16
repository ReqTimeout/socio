<script>
    import { onMount } from 'svelte';
    import { fly, fade } from 'svelte/transition';

    const phoneNumber = '62811919328';
    const defaultMessage = 'Halo Haloka, saya ingin bertanya tentang WhatsApp AI Agent.';
    const waLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

    let visible = false;
    let labelExpanded = true;

    onMount(() => {
        // Tunda sedikit agar tidak ganggu first paint hero
        const t = setTimeout(() => { visible = true; }, 1200);
        // Auto-collapse label di mobile setelah 4 detik agar tidak menutupi konten
        const collapse = setTimeout(() => { labelExpanded = false; }, 4500);
        return () => { clearTimeout(t); clearTimeout(collapse); };
    });
</script>

<a
    href={waLink}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat WhatsApp Haloka"
    class="wa-float group"
    class:visible
>
    {#if labelExpanded}
        <span
            class="wa-label"
            in:fade={{ duration: 250 }}
            out:fade={{ duration: 150 }}
        >
            Chat dengan Kami
        </span>
    {/if}

    <span class="wa-pulse-ring" aria-hidden="true"></span>
    <span class="wa-pulse-ring delay" aria-hidden="true"></span>

    <span class="wa-core" in:fly={{ y: 30, duration: 500 }}>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            class="wa-icon"
            aria-hidden="true"
        >
            <path
                fill="currentColor"
                d="M16.001 3C9.373 3 4 8.373 4 15c0 2.385.696 4.605 1.896 6.482L4 29l7.737-1.852A11.94 11.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3Zm0 21.6c-1.83 0-3.585-.5-5.118-1.448l-.367-.222-3.83.917.957-3.74-.24-.388A9.585 9.585 0 0 1 6.4 15c0-5.302 4.298-9.6 9.6-9.6 5.302 0 9.6 4.298 9.6 9.6 0 5.302-4.298 9.6-9.6 9.6Zm5.302-7.108c-.29-.146-1.72-.85-1.986-.946-.266-.097-.46-.146-.653.146-.193.29-.747.946-.916 1.14-.169.193-.338.218-.628.072-.29-.146-1.224-.451-2.332-1.438-.862-.769-1.444-1.72-1.613-2.01-.169-.29-.018-.447.127-.592.13-.13.29-.338.435-.508.145-.169.193-.29.29-.483.097-.193.048-.363-.024-.508-.072-.146-.653-1.572-.895-2.152-.236-.565-.476-.488-.653-.498-.169-.008-.363-.01-.557-.01-.193 0-.508.072-.774.363-.266.29-1.014.99-1.014 2.414 0 1.424 1.038 2.8 1.182 2.993.145.193 2.04 3.114 4.94 4.367.69.298 1.23.476 1.65.61.693.22 1.324.189 1.823.115.556-.083 1.72-.703 1.962-1.382.242-.678.242-1.26.169-1.382-.072-.121-.266-.193-.557-.339Z"
            />
        </svg>
    </span>
</a>

<style>
    .wa-float {
        position: fixed;
        right: 1.25rem;
        bottom: 5.5rem;
        z-index: 60;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px) scale(0.9);
        transition: opacity 350ms ease, transform 350ms ease;
    }

    .wa-float.visible {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
    }

    /* Di mobile, naikkan posisi di atas sticky CTA horizontal */
    @media (max-width: 768px) {
        .wa-float {
            right: 1rem;
            bottom: 5.75rem;
        }
    }

    /* Pastikan tidak tabrakan dengan StickyCTA (tampil setelah scroll 300px) */
    @media (min-width: 769px) {
        .wa-float {
            bottom: 1.75rem;
        }
    }

    .wa-label {
        background: #ffffff;
        color: #075e54;
        font-weight: 700;
        font-size: 0.8125rem;
        padding: 0.5rem 0.875rem;
        border-radius: 9999px;
        box-shadow:
            0 6px 20px rgba(7, 94, 84, 0.25),
            0 2px 6px rgba(0, 0, 0, 0.08);
        white-space: nowrap;
        border: 1px solid rgba(37, 211, 102, 0.35);
        position: relative;
    }

    .wa-label::after {
        content: '';
        position: absolute;
        right: -6px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-left: 6px solid #ffffff;
    }

    @media (max-width: 480px) {
        .wa-label {
            display: none;
        }
    }

    .wa-core {
        position: relative;
        width: 60px;
        height: 60px;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        background: linear-gradient(135deg, #25d366 0%, #128c7e 60%, #075e54 100%);
        box-shadow:
            0 10px 30px rgba(37, 211, 102, 0.45),
            0 4px 12px rgba(7, 94, 84, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        transition: transform 220ms ease, box-shadow 220ms ease;
    }

    @media (min-width: 769px) {
        .wa-core {
            width: 68px;
            height: 68px;
        }
    }

    .wa-float:hover .wa-core,
    .wa-float:focus-visible .wa-core {
        transform: scale(1.08) rotate(-4deg);
        box-shadow:
            0 14px 38px rgba(37, 211, 102, 0.6),
            0 6px 14px rgba(7, 94, 84, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    .wa-float:active .wa-core {
        transform: scale(0.96);
    }

    .wa-icon {
        width: 30px;
        height: 30px;
    }

    @media (min-width: 769px) {
        .wa-icon {
            width: 34px;
            height: 34px;
        }
    }

    /* Pulse ring animation */
    .wa-pulse-ring {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 60px;
        height: 60px;
        border-radius: 9999px;
        background: rgba(37, 211, 102, 0.45);
        animation: wa-ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
        pointer-events: none;
    }

    @media (min-width: 769px) {
        .wa-pulse-ring {
            width: 68px;
            height: 68px;
        }
    }

    .wa-pulse-ring.delay {
        animation-delay: 1.1s;
    }

    @keyframes wa-ping {
        0% {
            transform: scale(1);
            opacity: 0.6;
        }
        80%, 100% {
            transform: scale(1.9);
            opacity: 0;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .wa-pulse-ring {
            animation: none;
        }
        .wa-float {
            transition: opacity 200ms ease;
        }
    }
</style>
