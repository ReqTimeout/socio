<script lang="ts">
  import { Button, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import type { PageData } from "./$types";

  let { data } = $props();

  async function share() {
    haptic();
    if (navigator.share) {
      await navigator.share({
        title: "Socio.id",
        text: "Bergabung lewat referral saya",
        url: data.refLink,
      });
    } else {
      navigator.clipboard?.writeText(data.refLink);
      toast("Link referral disalin", "success");
    }
  }
</script>

<section class="space-y-4">
  <h1 class="font-display text-lg font-bold">Affiliate</h1>

  <div class="rounded-2xl bg-ink-900 p-4 text-white">
    <div class="text-xs text-ink-300">Total Komisi</div>
    <div class="font-display text-2xl font-extrabold tabular-nums">
      {formatRupiah(data.commission)}
    </div>
    <p class="mt-1 text-xs text-ink-400">{data.downline} downline · kode {data.code}</p>
  </div>

  <div class="rounded-2xl border border-ink-100 bg-surface p-4">
    <label class="mb-1 block text-sm font-semibold">Link Referral</label>
    <div class="flex gap-2">
      <input
        readonly
        value={data.refLink}
        class="h-10 flex-1 rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm"
      />
      <Button onclick={share} size="sm">Bagikan</Button>
    </div>
  </div>

  <div class="flex flex-col items-center rounded-2xl border border-ink-100 bg-surface p-4">
    <span class="mb-2 text-xs font-semibold text-ink-500">Scan untuk daftar</span>
    <img src={data.qr} alt="QR referral" class="h-40 w-40 rounded-xl" />
  </div>

  <p class="text-center text-xs text-ink-400">
    Ajak teman daftar lewat link kamu & dapat komisi dari setiap pembelian mereka.
  </p>
</section>
