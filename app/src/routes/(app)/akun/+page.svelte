<script lang="ts">
  import { Avatar, Button, Input, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let name = $state(data.user.name);
  let current = $state("");
  let next = $state("");
  let busy = $state(false);

  function submit(action: string) {
    return async (input: any) => {
      busy = true;
      const r = input.result;
      if (r.type === "failure") toast(r.data?.error ?? "Gagal", "error");
      else {
        toast(r.data?.success ?? "Berhasil", "success");
        if (r.type !== "redirect") await applyAction(r);
      }
      busy = false;
    };
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
    <div class="font-display text-2xl font-extrabold tabular-nums">
      {formatRupiah(data.user.balance)}
    </div>
  </div>

  <!-- Profile -->
  <form
    method="POST"
    action="?/profile"
    use:enhance={submit("profile")}
    class="space-y-2 rounded-2xl border border-ink-100 bg-surface p-4"
  >
    <h2 class="text-sm font-semibold">Profil</h2>
    <Input name="name" bind:value={name} placeholder="Nama lengkap" />
    <Button type="submit" size="sm">Simpan Profil</Button>
  </form>

  <!-- Password -->
  <form
    method="POST"
    action="?/password"
    use:enhance={submit("password")}
    class="space-y-2 rounded-2xl border border-ink-100 bg-surface p-4"
  >
    <h2 class="text-sm font-semibold">Ganti Password</h2>
    <Input name="current" type="password" bind:value={current} placeholder="Password saat ini" />
    <Input name="next" type="password" bind:value={next} placeholder="Password baru (min 8)" />
    <Button type="submit" size="sm" variant="accent">Ubah Password</Button>
  </form>

  <!-- Theme -->
  <form
    method="POST"
    action="?/theme"
    use:enhance={submit("theme")}
    class="flex items-center justify-between rounded-2xl border border-ink-100 bg-surface p-4"
  >
    <span class="text-sm font-semibold">Tema</span>
    <div class="flex gap-2">
      <button
        type="submit"
        name="theme"
        value="light"
        onclick={() => haptic()}
        class="rounded-full px-3 py-1.5 text-xs font-semibold {data.user.theme === 'light'
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100'}">Light</button
      >
      <button
        type="submit"
        name="theme"
        value="dark"
        onclick={() => haptic()}
        class="rounded-full px-3 py-1.5 text-xs font-semibold {data.user.theme === 'dark'
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100'}">Dark</button
      >
    </div>
  </form>

  <div class="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-surface">
    <a
      href="/saldo/top-up"
      class="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-50"
    >
      <span>Top Up Saldo</span><span class="text-ink-400">›</span>
    </a>
    <a
      href="/affiliate"
      class="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-50"
    >
      <span>Affiliate</span><span class="text-ink-400">›</span>
    </a>
    <a
      href="/tiket"
      class="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-50"
    >
      <span>Tiket Bantuan</span><span class="text-ink-400">›</span>
    </a>
    <button
      onclick={() => {
        haptic();
        fetch("/api/auth/sign-out", { method: "POST" }).then(() => (location.href = "/login"));
      }}
      class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-danger hover:bg-ink-50"
    >
      <span>Keluar</span><span>›</span>
    </button>
  </div>
</section>
