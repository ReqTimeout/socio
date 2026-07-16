<script>
    import { onMount } from "svelte";
    
    let isScrolled = false;
    let isMenuOpen = false;

    // Login Link dari Anda
    const loginLink = "https://platform.haloka.id/login";

    onMount(() => {
        const handleScroll = () => {
            isScrolled = window.scrollY > 20;
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    });
</script>

<nav class="fixed w-full z-50 transition-all duration-300 {isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}">
    <div class="container mx-auto px-6 flex justify-between items-center">
        <a href="/" class="block w-32 md:w-36">
            <img src="/logo.png" alt="Haloka" class="w-full h-auto" />
        </a>

        <div class="hidden md:flex gap-8 text-sm font-semibold text-primary items-center">
            <a href="#solusi" class="hover:text-green transition">Solusi</a>
            <a href="#fitur" class="hover:text-green transition">Fitur</a>
            <a href="#harga" class="hover:text-green transition">Harga</a>
            
            <a href={loginLink} class="text-primary hover:text-green font-bold px-4">Masuk</a>
            <a href="https://platform.haloka.id/register?billing_type=monthly&package=" class="bg-primary text-white px-6 py-2.5 rounded-full hover:bg-green transition-all shadow-lg hover:shadow-green/50">
                Daftar Gratis
            </a>
        </div>

        <button class="md:hidden text-2xl text-primary" on:click={() => isMenuOpen = !isMenuOpen}>
            {isMenuOpen ? '✕' : '☰'}
        </button>
    </div>

    {#if isMenuOpen}
        <div class="absolute top-full left-0 w-full bg-white shadow-xl border-t border-gray-100 p-6 flex flex-col gap-4 md:hidden">
            <a href="#solusi" class="text-lg font-semibold text-gray-700" on:click={() => isMenuOpen = false}>Solusi</a>
            <a href="#fitur" class="text-lg font-semibold text-gray-700" on:click={() => isMenuOpen = false}>Fitur</a>
            <a href="#harga" class="text-lg font-semibold text-gray-700" on:click={() => isMenuOpen = false}>Harga</a>
            <hr class="border-gray-100">
            <a href={loginLink} class="text-center py-3 font-bold text-primary bg-gray-50 rounded-lg">Masuk Member</a>
        </div>
    {/if}
</nav>