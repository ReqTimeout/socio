<script lang="ts">
  import { Button, Card, StatusBadge, BalancePill, MobileShell } from "@socio/ui";

  const orders = [
    { id: "SOC-88231", service: "IG Followers 1k", status: "proses" as const, qty: "1.000" },
    { id: "SOC-88230", service: "TT Views 5k", status: "selesai" as const, qty: "5.000" },
    { id: "SOC-88229", service: "YT Views 1k", status: "pending" as const, qty: "1.000" },
    { id: "SOC-88228", service: "IG Likes 2k", status: "partial" as const, qty: "2.000" },
    { id: "SOC-88227", service: "FB Post Likes", status: "batal" as const, qty: "500" },
  ];

  const nav = [
    { href: "/", label: "Beranda", icon: "🏠", active: true },
    { href: "/pesan", label: "Pesan", icon: "➕" },
    { href: "/saldo", label: "Saldo", icon: "💳" },
    { href: "/riwayat", label: "Riwayat", icon: "📜" },
    { href: "/akun", label: "Akun", icon: "👤" },
  ];
</script>

<MobileShell items={nav}>
  <header class="flex items-center justify-between mb-5">
    <div>
      <h1 class="font-display font-extrabold text-2xl text-ink-900">Halo, Member 👋</h1>
      <p class="text-ink-400 text-sm">Pantau order & saldo kamu</p>
    </div>
    <BalancePill balance={250000} />
  </header>

  <div class="grid grid-cols-2 gap-3 mb-5">
    <div class="bg-gradient-to-br from-primary to-primary-800 rounded-card p-4 text-white shadow-card">
      <div class="text-[10px] uppercase tracking-wide text-white/70">Total Order</div>
      <div class="font-display font-black text-2xl">37</div>
    </div>
    <div class="bg-gradient-to-br from-accent-500 to-accent-700 rounded-card p-4 text-white shadow-card">
      <div class="text-[10px] uppercase tracking-wide text-white/70">Selesai</div>
      <div class="font-display font-black text-2xl">29</div>
    </div>
  </div>

  <Card title="Order Terbaru">
    <div class="space-y-3">
      {#each orders as o}
        <div class="flex items-center justify-between gap-3 py-2 border-b border-ink-100 last:border-0">
          <div class="min-w-0">
            <div class="font-semibold text-ink-800 text-sm truncate">{o.service}</div>
            <div class="text-xs text-ink-400 font-mono">{o.id} · {o.qty}</div>
          </div>
          <StatusBadge status={o.status} />
        </div>
      {/each}
    </div>
    <Button variant="primary" full class="mt-4">Pesan Layanan Baru</Button>
  </Card>
</MobileShell>
