<script lang="ts">
  import { enhance } from "$app/forms";
  import { Icon, Button } from "@socio/ui";
  import type { PageData, ActionData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();

  let step = $state(1);
  let code = $state("");
  let showSecret = $state(false);
  let backupCodes = $derived((data as any).backupCodes as string[] | null);
  let enabled = $derived((data as any).enabled as boolean);
  let qr = $derived((data as any).qr as string | null);
  let secret = $derived((data as any).secret as string | null);
  let url = $derived((data as any).url as string | null);

  // If already enabled, show backup codes and disable option
  let disablePw = $state("");
  let disableCode = $state("");

  $effect(() => {
    if ((form as any)?.success && (form as any)?.codes) step = 3;
  });
</script>

<svelte:head>
  <title>Setup 2FA — Socio Admin</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6 p-4 lg:p-6">
  <div class="flex items-center gap-3">
    <a href="/admin/settings" class="grid h-8 w-8 place-items-center rounded-full hover:bg-ink-100" aria-label="Kembali">←</a>
    <h1 class="font-display text-xl font-extrabold">2FA — Google Authenticator</h1>
    {#if enabled}
      <span class="ml-auto inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">Aktif</span>
    {:else}
      <span class="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">Belum aktif</span>
    {/if}
  </div>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success" role="status">{form.success}</div>
  {/if}

  {#if enabled}
    <div class="rounded-2xl border border-ink-100 bg-surface p-5">
      <h2 class="font-bold">2FA Aktif</h2>
      <p class="mt-1 text-sm text-ink-500">Akun kamu sudah dilindungi TOTP. Simpan backup code di bawah.</p>
      {#if backupCodes?.length}
        <div class="mt-4 rounded-xl bg-ink-900 p-4 font-mono text-sm text-white">
          <p class="mb-2 text-xs font-bold uppercase tracking-wide text-white/60">Backup codes ({backupCodes.length} tersisa) — simpan sekali</p>
          <div class="grid grid-cols-2 gap-2">
            {#each backupCodes as c}
              <span class="rounded bg-white/10 px-2 py-1 text-center text-xs tracking-widest">{c}</span>
            {/each}
          </div>
        </div>
      {/if}
      <form method="POST" action="?/disable" use:enhance class="mt-6 space-y-3 border-t border-ink-100 pt-4">
        <h3 class="text-sm font-bold">Matikan 2FA</h3>
        <p class="text-xs text-ink-500">Butuh password + kode 2FA (atau backup code) untuk disable.</p>
        <input name="password" type="password" placeholder="Password" required class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm" bind:value={disablePw} />
        <input name="code" placeholder="Kode 2FA / backup code" class="h-10 w-full rounded-xl border border-ink-200 px-3 font-mono text-sm" bind:value={disableCode} />
        <Button type="submit" variant="danger">Matikan 2FA</Button>
      </form>
      <form method="POST" action="?/regenerate" use:enhance class="mt-4">
        <Button type="submit" variant="ghost">Regenerate secret (buat QR baru)</Button>
      </form>
    </div>
  {:else}
    <!-- Step indicator -->
    <div class="flex items-center gap-2 text-xs font-bold">
      <span class="flex items-center gap-1 {step === 1 ? 'text-primary' : 'text-ink-400'}"><span class="grid h-6 w-6 place-items-center rounded-full {step === 1 ? 'bg-primary text-white' : 'bg-ink-100'}">1</span> Scan</span>
      <span class="h-px w-6 bg-ink-200"></span>
      <span class="flex items-center gap-1 {step === 2 ? 'text-primary' : 'text-ink-400'}"><span class="grid h-6 w-6 place-items-center rounded-full {step === 2 ? 'bg-primary text-white' : 'bg-ink-100'}">2</span> Verify</span>
      <span class="h-px w-6 bg-ink-200"></span>
      <span class="flex items-center gap-1 {step === 3 ? 'text-primary' : 'text-ink-400'}"><span class="grid h-6 w-6 place-items-center rounded-full {step === 3 ? 'bg-primary text-white' : 'bg-ink-100'}">3</span> Backup</span>
    </div>

    {#if step === 1}
      <div class="rounded-2xl border border-ink-100 bg-surface p-5">
        <h2 class="font-bold">Scan QR dengan Authenticator</h2>
        <p class="mt-1 text-sm text-ink-500">Buka Google Authenticator / Authy / 1Password → Scan QR.</p>
        {#if qr}
          <div class="mt-4 flex justify-center">
            <img src={qr} alt="QR TOTP" width="260" height="260" class="rounded-xl border border-ink-100" />
          </div>
        {/if}
        <div class="mt-4 rounded-xl bg-ink-50 p-3">
          <p class="text-xs font-bold text-ink-500">Manual key (jika QR gagal):</p>
          <div class="mt-1 flex items-center gap-2">
            <code class="flex-1 break-all rounded bg-white px-2 py-1 font-mono text-xs">{secret}</code>
            <button type="button" onclick={() => (showSecret = !showSecret)} class="text-xs font-bold text-primary">{showSecret ? "Sembunyikan" : "Lihat"}</button>
          </div>
          {#if showSecret}
            <p class="mt-2 break-all font-mono text-xs">{secret}</p>
          {/if}
        </div>
        <Button onclick={() => (step = 2)} class="mt-4 w-full">Lanjut — Verify</Button>
      </div>
    {:else if step === 2}
      <form method="POST" action="?/verify" use:enhance class="rounded-2xl border border-ink-100 bg-surface p-5">
        <h2 class="font-bold">Masukin 6 digit kode</h2>
        <p class="mt-1 text-sm text-ink-500">Buka app authenticator, masukan kode yang muncul untuk akun Socio.id.</p>
        <input
          name="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="123456"
          maxlength="6"
          required
          class="mt-3 h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-center font-mono text-xl tracking-[0.3em]"
          bind:value={code}
        />
        <div class="mt-4 flex gap-2">
          <Button type="button" variant="ghost" onclick={() => (step = 1)}>Kembali</Button>
          <Button type="submit">Verifikasi & Aktifkan</Button>
        </div>
      </form>
    {:else if step === 3}
      <div class="rounded-2xl border border-ink-100 bg-surface p-5">
        <h2 class="font-bold">Simpan 10 backup code</h2>
        <p class="mt-1 text-sm text-ink-500">Kalau HP hilang, pakai salah satu code ini untuk login. Tampil sekali.</p>
        {#if (form as any)?.codes || backupCodes}
          {@const codes = (form as any)?.codes ?? backupCodes ?? []}
          <div class="mt-4 rounded-xl bg-ink-900 p-4 font-mono text-sm text-white">
            <div class="grid grid-cols-2 gap-2">
              {#each codes as c}
                <span class="rounded bg-white/10 px-2 py-1 text-center text-xs tracking-widest">{c}</span>
              {/each}
            </div>
          </div>
        {/if}
        <a href="/admin" class="mt-4 inline-flex w-full justify-center rounded-full bg-ink-900 px-5 py-2.5 text-sm font-bold text-white">Selesai — Ke Dashboard</a>
      </div>
    {/if}
  {/if}
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; }
  }
</style>
