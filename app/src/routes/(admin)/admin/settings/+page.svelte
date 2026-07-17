<script lang="ts">
  import { Button, toast } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<section class="space-y-4">
  <h1 class="font-display text-xl font-bold">Settings</h1>
  {#if form?.success}<div
      class="rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success"
    >
      {form.success}
    </div>{/if}

  <div class="flex items-center justify-between rounded-2xl border border-ink-100 bg-surface p-4">
    <div>
      <div class="text-sm font-semibold">Maintenance Mode</div>
      <div class="text-xs text-ink-500">
        Blokir user order saat deploy/fix. Admin tetap bisa akses.
      </div>
    </div>
    <form
      method="POST"
      action="?/maintenance"
      use:enhance={() =>
        async ({ result }) => {
          if (result.type === "success") toast((result.data as any)?.success ?? "OK", "success");
          await applyAction(result);
        }}
    >
      <input type="hidden" name="on" value={data.maintenance ? "0" : "1"} />
      <Button type="submit" variant={data.maintenance ? "ghost" : "danger"}
        >{data.maintenance ? "Nonaktifkan" : "Aktifkan"}</Button
      >
    </form>
  </div>
</section>
