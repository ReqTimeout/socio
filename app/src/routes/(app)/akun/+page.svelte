<script lang="ts">
  import { Avatar, Button, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import type { PageData } from "./$types";

  let { data } = $props();

  function copyApiKey() {
    haptic();
    navigator.clipboard?.writeText(data.user.apiKey);
    toast("API key disalin", "success");
  }

  async function logout() {
    haptic();
    await fetch("/api/auth/sign-out", { method: "POST" });
    location.href = "/login";
  }
</script>

<section class="space-y-5">
  <div class="flex items-center gap-4 rounded-2xl border border-ink-100 bg-surface p-4">
    <Avatar name={data.user.name} size="lg" />
    <div>
      <div class="font-display text-lg font-bold">{data.user.name}</div>
      <div class="text-sm text-ink-500">@{data.user.username} · {data.user.level}</div>
    </div>
  </div>

  <div class="rounded-2xl bg-ink-900 p-4 text-white">
    <div class="text-xs text-ink-300">Saldo</div>
    <div class="font-display text-2xl font-extrabold tabular-nums">{formatRupiah(data.user.balance)}</div>
  </div>

  <div class="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-surface">
    <a href="/saldo/top-up" class="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-50">
      <span>Top Up Saldo</span><span class="text-ink-400">›</span>
    </a>
    <a href="/affiliate" class="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-50">
      <span>Affiliate</span><span class="text-ink-400">›</span>
    </a>
    <a href="/tiket" class="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-50">
      <span>Tiket Bantuan</span><span class="text-ink-400">›</span>
    </a>
    <button onclick={copyApiKey} class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-ink-50">
      <span>API Key</span><span class="text-ink-400">{data.user.apiKey ? "Salin ›" : "—"}</span>
    </button>
    <button onclick={logout} class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-danger hover:bg-ink-50">
      <span>Keluar</span><span>›</span>
    </button>
  </div>
</section>
