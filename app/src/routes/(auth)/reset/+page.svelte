<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "@socio/ui";

  let { data, form } = $props<{ data: typeof data; form: import("./$types").ActionData }>();
  let loading = $state(false);
</script>

<svelte:head><title>Reset password — Socio.id</title></svelte:head>

<div
  class="min-h-screen bg-ink-50 flex flex-col px-5 py-8"
  style="padding-top: max(2rem, env(safe-area-inset-top));"
>
  <div class="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
    <div class="mb-8 text-center">
      <div class="font-display font-extrabold text-3xl text-primary tracking-tight">
        socio<span class="text-accent-500">.id</span>
      </div>
      <p class="text-ink-500 mt-2 text-sm">Buat password baru</p>
    </div>

    {#if form?.error}
      <div
        class="mb-4 rounded-2xl bg-danger-soft text-danger text-sm px-4 py-3 font-medium"
        role="alert"
      >
        {form?.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          await update();
          loading = false;
        };
      }}
      class="bg-white rounded-card shadow-card border border-ink-100 p-6 space-y-4"
    >
      <input type="hidden" name="token" value={data.token} />
      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Password baru</span>
        <input
          type="password"
          name="password"
          required
          autocomplete="new-password"
          class="mt-1.5 w-full rounded-2xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
          placeholder="Minimal 8 karakter"
        />
      </label>
      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Konfirmasi password</span>
        <input
          type="password"
          name="confirm"
          required
          autocomplete="new-password"
          class="mt-1.5 w-full rounded-2xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
          placeholder="Ulangi password"
        />
      </label>
      <Button type="submit" full disabled={loading} onclick={() => (loading = true)}
        >{loading ? "Memproses…" : "Reset password"}</Button
      >
    </form>
  </div>
</div>
