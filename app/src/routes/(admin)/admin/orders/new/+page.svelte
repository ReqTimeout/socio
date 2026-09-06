<script lang="ts">
  import { enhance } from "$app/forms";
  import { Icon, Button } from "@socio/ui";
  import type { PageData, ActionData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();
  let isManual = $state(true);
  let saving = $state(false);
</script>

<svelte:head>
  <title>Order Manual — Socio Admin</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6 p-4 lg:p-6">
  <div class="flex items-center gap-3">
    <a href="/admin/orders" class="grid h-8 w-8 place-items-center rounded-full hover:bg-ink-100" aria-label="Kembali">←</a>
    <h1 class="font-display text-xl font-extrabold">Order Manual</h1>
    <span class="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">Skip provider API</span>
  </div>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success" role="status">{form.success}</div>
  {/if}

  <form
    method="POST"
    action="?/create"
    use:enhance={() => {
      saving = true;
      return async ({ update }) => {
        await update();
        saving = false;
      };
    }}
    class="space-y-4 rounded-2xl border border-ink-100 bg-surface p-5"
  >
    <label class="flex items-center justify-between rounded-xl border-2 px-4 py-3 {isManual ? 'border-amber-300 bg-amber-50' : 'border-ink-200 bg-ink-50'}">
      <span class="flex items-center gap-2">
        <span class="grid h-8 w-8 place-items-center rounded-lg {isManual ? 'bg-amber-500 text-white' : 'bg-ink-200 text-ink-500'}">
          <Icon name="settings" size={16} />
        </span>
        <span>
          <span class="block text-sm font-bold">Order manual · skip provider API</span>
          <span class="block text-xs text-ink-500">Pakai untuk service custom / offline / request khusus</span>
        </span>
      </span>
      <input type="checkbox" bind:checked={isManual} name="isManual" value="1" class="h-5 w-5 accent-amber-500" />
    </label>

    {#if isManual}
      <div class="space-y-3 border-t border-ink-100 pt-4" style="animation: slide-down 280ms cubic-bezier(0.16,1,0.3,1);">
        <div>
          <label class="mb-1 block text-xs font-bold">Username / User ID *</label>
          <input name="username" placeholder="admin atau 2395" required class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-bold">Nama layanan *</label>
          <input name="serviceName" placeholder="Instagram Likes Custom" required class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-bold">Link *</label>
          <input name="link" placeholder="https://instagram.com/p/xxxxx" required class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-bold">Quantity *</label>
            <input name="quantity" type="number" min="1" required class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-bold">Harga (Rp) *</label>
            <input name="price" type="number" min="0" required class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm" />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-bold">Catatan manual * — kenapa tidak lewat provider</label>
          <textarea name="manualNotes" placeholder="Service custom · request user langsung · offline fulfillment" required rows="3" class="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"></textarea>
        </div>
      </div>
    {/if}

    <Button type="submit" full disabled={saving || !isManual}>
      {#if saving}Memproses…{:else}Buat Order Manual{/if}
    </Button>
  </form>

  <p class="text-center text-xs text-ink-400">Order manual langsung Success tanpa kirim ke provider. Audit log <span class="font-mono">manual_order_created</span> tercatat.</p>
</div>

<style>
  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    div[style*="slide-down"] { animation: none !important; }
  }
</style>
