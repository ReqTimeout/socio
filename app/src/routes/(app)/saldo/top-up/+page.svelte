<script lang="ts">
  import { Button, toast, EmptyState, Icon, Sheet } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let amount = $state(50000);
  let custom = $state("");
  let method = $state<"manual" | "midtrans">("manual");
  let submitting = $state(false);
  let instructionOpen = $state(false);
  let instrSnapUrl = $state("");
  let instrPostAmount = $state(0);
  let instrInvoiceId = $state("");
  let proofDepositId = $state<number | null>(null);
  let proofOpen = $state(false);

  const chips = [50000, 100000, 200000, 500000];

  function setChip(v: number) {
    haptic(8);
    amount = v;
    custom = "";
  }

  function selectMethod(m: "manual" | "midtrans") {
    haptic(10);
    method = m;
  }

  const suffix = $derived(method === "manual" ? 100 + ((Number(data.balance) * 7) % 900) : 0);
  const totalPay = $derived(method === "manual" ? amount + suffix : amount);

  // Handle form result
  $effect(() => {
    if (form && (form as any).success) {
      const r = form as any;
      if (r.method === "midtrans" && r.snapUrl) {
        window.location.href = r.snapUrl;
      } else if (r.method === "manual") {
        instrPostAmount = r.postAmount;
        instrInvoiceId = r.invoiceId;
        instructionOpen = true;
      }
    }
  });

  function openProofUpload(id: number) {
    proofDepositId = id;
    proofOpen = true;
  }

  let proofFile: File | null = $state(null);

  function copyBca() {
    navigator.clipboard?.writeText(data.bcaNumber);
    haptic(8);
    toast("Nomor BCA disalin", "success");
  }
</script>

<section class="space-y-5">
  <div class="flex items-center gap-2">
    <a href="/saldo" class="grid h-9 w-9 place-items-center rounded-full hover:bg-ink-100 -ml-1">
      <Icon name="chevron_left" size={20} />
    </a>
    <h1 class="font-display text-lg font-bold tracking-tight">Top Up Saldo</h1>
  </div>

  {#if form?.error}
    <div
      class="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger"
    >
      <Icon name="alert" size={16} />
      {form.error}
    </div>
  {/if}

  <!-- Saldo saat ini -->
  <div class="rounded-2xl border border-ink-100 bg-surface p-4">
    <div class="text-xs font-medium text-ink-500">Saldo saat ini</div>
    <div class="mt-0.5 font-display text-2xl font-extrabold tabular-nums">
      {formatRupiah(Number(data.balance))}
    </div>
  </div>

  <!-- Pilih nominal -->
  <div>
    <label class="mb-2 block text-sm font-bold">Pilih Nominal</label>
    <div class="grid grid-cols-2 gap-3">
      {#each chips as c, i (c)}
        <button
          type="button"
          onclick={() => setChip(c)}
          class="group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-200
            {amount === c && !custom
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-ink-200 hover:border-ink-300'}
            active:scale-[0.97]"
        >
          <div class="font-display text-lg font-extrabold tabular-nums">{formatRupiah(c)}</div>
          {#if i === 1}
            <div class="mt-0.5 text-[10px] font-bold text-primary">Populer</div>
          {/if}
        </button>
      {/each}
    </div>

    <div class="mt-3">
      <label for="custom" class="mb-1.5 block text-xs font-semibold text-ink-600"
        >Nominal lain (min Rp20.000)</label
      >
      <div class="relative">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400"
          >Rp</span
        >
        <input
          id="custom"
          type="number"
          bind:value={custom}
          oninput={() => custom && Number(custom) >= 20000 && (amount = Number(custom))}
          placeholder="50000"
          class="h-11 w-full rounded-xl border border-ink-200 pl-9 pr-3 text-sm font-bold tabular-nums outline-none transition-colors focus:border-primary"
        />
      </div>
    </div>
  </div>

  <!-- Pilih metode -->
  <div>
    <label class="mb-2 block text-sm font-bold">Metode Pembayaran</label>
    <div class="space-y-2.5">
      <!-- Manual BCA -->
      <button
        type="button"
        onclick={() => selectMethod("manual")}
        class="flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 active:scale-[0.99]
          {method === 'manual' ? 'border-primary bg-primary/5' : 'border-ink-200 hover:border-ink-300'}"
      >
        <div
          class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white font-bold text-sm
          bg-gradient-to-br from-blue-600 to-blue-700"
        >
          BCA
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-bold">Transfer Manual BCA</div>
          <div class="text-xs text-ink-500">Gratis · Konfirmasi 1-30 menit</div>
        </div>
        <div
          class="grid h-5 w-5 place-items-center rounded-full border-2 transition-colors
          {method === 'manual' ? 'border-primary bg-primary' : 'border-ink-300'}"
        >
          {#if method === "manual"}
            <Icon name="check" size={12} stroke={3} class="text-white" />
          {/if}
        </div>
      </button>

      <!-- Midtrans -->
      <button
        type="button"
        onclick={() => selectMethod("midtrans")}
        disabled={!data.midtransReady}
        class="flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 active:scale-[0.99] disabled:opacity-40
          {method === 'midtrans' ? 'border-primary bg-primary/5' : 'border-ink-200 hover:border-ink-300'}"
      >
        <div
          class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
        >
          <Icon name="wallet" size={20} />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-bold">Midtrans (VA / QRIS)</div>
          <div class="text-xs text-ink-500">Otomatis · Fee Rp4.000</div>
        </div>
        <div
          class="grid h-5 w-5 place-items-center rounded-full border-2 transition-colors
          {method === 'midtrans' ? 'border-primary bg-primary' : 'border-ink-300'}"
        >
          {#if method === "midtrans"}
            <Icon name="check" size={12} stroke={3} class="text-white" />
          {/if}
        </div>
      </button>
    </div>
  </div>

  <!-- Ringkasan -->
  <div class="rounded-2xl bg-ink-900 p-4 text-white">
    <div class="flex items-center justify-between text-sm">
      <span class="text-ink-300">Nominal top up</span>
      <span class="tabular-nums">{formatRupiah(amount)}</span>
    </div>
    {#if method === "manual"}
      <div class="mt-1 flex items-center justify-between text-sm">
        <span class="text-ink-300">Kode unik (anti-salah)</span>
        <span class="tabular-nums text-accent-300">+{suffix}</span>
      </div>
      <div class="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
        <span class="text-sm font-semibold">Total transfer</span>
        <span class="font-display text-lg font-extrabold tabular-nums">{formatRupiah(totalPay)}</span>
      </div>
    {:else}
      <div class="mt-1 flex items-center justify-between text-sm">
        <span class="text-ink-300">Biaya admin</span>
        <span class="tabular-nums">Rp4.000</span>
      </div>
      <div class="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
        <span class="text-sm font-semibold">Total bayar</span>
        <span class="font-display text-lg font-extrabold tabular-nums"
          >{formatRupiah(amount + 4000)}</span
        >
      </div>
    {/if}
  </div>

  <!-- Submit -->
  <form
    method="POST"
    action="?/topup"
    use:enhance={() => {
      submitting = true;
      return async ({ result }) => {
        submitting = false;
        if (result.type === "failure") {
          toast((result.data as any)?.error ?? "Gagal membuat deposit", "error");
        } else if (result.type === "success") {
          // $effect handles redirect/sheet
          await applyAction(result);
        }
      };
    }}
  >
    <input type="hidden" name="amount" value={amount} />
    <input type="hidden" name="method" value={method} />
    <Button type="submit" disabled={submitting} full size="lg">
      {#if submitting}
        <Icon name="refresh" size={16} class="animate-spin" />
        Memproses…
      {:else}
        Buat Invoice · {formatRupiah(method === "manual" ? totalPay : amount + 4000)}
      {/if}
    </Button>
  </form>

  <!-- Riwayat -->
  <div>
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-sm font-bold">Riwayat Top Up</h2>
      <a href="/saldo/riwayat" class="flex items-center gap-0.5 text-xs font-bold text-primary">
        Semua <Icon name="chevron_right" size={14} />
      </a>
    </div>
    {#if data.history.length === 0}
      <div
        class="rounded-2xl border border-dashed border-ink-200 bg-surface p-6 text-center text-sm text-ink-500"
      >
        Belum ada riwayat top up.
      </div>
    {:else}
      <ul class="space-y-2">
        {#each data.history as h (h.id)}
          <li
            class="flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface px-4 py-3"
          >
            <div
              class="grid h-9 w-9 shrink-0 place-items-center rounded-lg
              {h.status === 'Success'
                ? 'bg-success/10 text-success'
                : h.status === 'Canceled'
                  ? 'bg-danger/10 text-danger'
                  : 'bg-amber-100 text-amber-700'}"
            >
              <Icon
                name={h.status === "Success" ? "check" : h.status === "Canceled" ? "x" : "clock"}
                size={18}
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-bold tabular-nums">{formatRupiah(Number(h.amount))}</div>
              <div class="truncate text-xs text-ink-500">
                {h.methodName}
                {#if h.status === "Pending" && !h.img}
                  · <button
                    type="button"
                    onclick={() => openProofUpload(h.id)}
                    class="font-semibold text-primary hover:underline">Upload Bukti</button
                  >
                {/if}
              </div>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold
              {h.status === 'Success'
                ? 'bg-success/10 text-success'
                : h.status === 'Canceled'
                  ? 'bg-danger/10 text-danger'
                  : 'bg-amber-100 text-amber-700'}"
              >{h.status}</span
            >
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<!-- Instruksi Manual BCA Sheet -->
<Sheet bind:open={instructionOpen} title="Instruksi Pembayaran">
  <div class="space-y-4">
    <div class="rounded-2xl bg-success/10 p-4 text-center">
      <div class="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-success/20 text-success">
        <Icon name="check" size={24} stroke={2.5} />
      </div>
      <div class="text-sm font-bold text-success">Invoice Dibuat</div>
      <div class="text-xs text-ink-600">Transfer dalam 24 jam agar tidak kedaluwarsa</div>
    </div>

    <div class="rounded-2xl border border-ink-200 p-4">
      <div class="text-xs font-semibold text-ink-500">Transfer ke rekening BCA</div>
      <div class="mt-2 flex items-center justify-between">
        <div>
          <div class="font-display text-xl font-extrabold tabular-nums">{data.bcaNumber}</div>
          <div class="text-xs text-ink-600">{data.bcaName}</div>
        </div>
        <button
          type="button"
          onclick={copyBca}
          class="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition active:scale-90 hover:bg-primary/20"
          aria-label="Salin nomor"
        >
          <Icon name="copy" size={18} />
        </button>
      </div>
      <!-- QR scan (manual/QR) -->
      <div class="mt-3 flex flex-col items-center rounded-xl bg-white p-3">
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data={encodeURIComponent(
            `BCA ${data.bcaNumber} ${instrPostAmount}`,
          )}"
          alt="QR pembayaran BCA"
          width="180"
          height="180"
          class="h-40 w-40 rounded-lg"
          loading="lazy"
        />
        <div class="mt-2 text-[10px] text-ink-400">Scan QR di mBanking BCA</div>
      </div>
    </div>

    <div class="rounded-2xl bg-ink-900 p-4 text-center text-white">
      <div class="text-xs text-ink-300">Jumlah yang harus ditransfer</div>
      <div class="mt-1 font-display text-3xl font-extrabold tabular-nums"
        >{formatRupiah(instrPostAmount)}</div
      >
      <div class="mt-1 text-[10px] text-accent-300"
        >Termasuk kode unik untuk pencocokan otomatis</div
      >
    </div>

    <div class="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
      <strong>Penting:</strong> Transfer sesuai jumlah di atas (termasuk 3 digit terakhir). Setelah
      transfer, upload bukti di halaman riwayat top up untuk konfirmasi cepat.
    </div>

    <Button onclick={() => goto("/saldo/top-up")} class="w-full" variant="ghost">
      Tutup
    </Button>
  </div>
</Sheet>

<!-- Upload Bukti Sheet -->
<Sheet bind:open={proofOpen} title="Upload Bukti Transfer">
  <form
    method="POST"
    action="?/uploadProof"
    enctype="multipart/form-data"
    use:enhance={() => {
      return async ({ result }) => {
        if (result.type === "failure") {
          toast((result.data as any)?.error ?? "Gagal upload", "error");
        } else {
          toast("Bukti diupload", "success");
          proofDepositId = null;
          await goto("/saldo/top-up");
        }
      };
    }}
    class="space-y-4"
  >
    <input type="hidden" name="id" value={proofDepositId ?? ""} />
    <div>
      <label class="mb-2 block text-sm font-bold">Foto bukti transfer</label>
      <label
        class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 p-8 transition-colors hover:border-primary hover:bg-primary/5"
      >
        <Icon name="image" size={32} class="text-ink-400" />
        <div class="mt-2 text-sm font-semibold">Tap untuk pilih foto</div>
        <div class="text-xs text-ink-500">JPG/PNG/WebP · Max 2MB</div>
        <input
          type="file"
          name="proof"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          onchange={(e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) proofFile = f;
          }}
        />
      </label>
      {#if proofFile}
        <div class="mt-2 text-xs text-success">✓ {proofFile.name}</div>
      {/if}
    </div>
    <Button type="submit" class="w-full" disabled={!proofFile}>Upload Bukti</Button>
  </form>
</Sheet>
