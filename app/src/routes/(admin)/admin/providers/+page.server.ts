import { db } from "@socio/db";
import { provider, services } from "@socio/db/schema";
import { sql, eq } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import { env } from "$env/dynamic/private";
import { triggerProviderSync } from "$lib/server/cron";
import { encryptSecret, decryptSecret, isEncrypted } from "$lib/server/crypto";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  // db.execute() returns [rows, fields] tuple — rows are RowDataPacket
  // instances SvelteKit cannot serialise. JSON round-trip yields plain POJOs.
  const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  // List semua provider + jumlah service yang pakai
  const rows = await db.execute(sql`
    SELECT p.id, p.name, p.api_url_order, p.api_url_status,
      SUBSTRING(p.api_key, 1, 6) AS api_key_prefix,
      LENGTH(p.api_key) AS api_key_len,
      p.balance_provider,
      (SELECT COUNT(*) FROM services WHERE provider_id = p.id) AS services_count
    FROM provider p
    ORDER BY p.id ASC
  `);
  const providers = plain((rows as any)[0] ?? []).map((p: any) => ({
    ...p,
    balanceProvider: Number(p.balance_provider ?? 0),
    encrypted: String(p.api_key_prefix ?? "").startsWith("enc:"),
  }));

  // Last sync log per provider (kalau ada tabel)
  const syncLogs = await db
    .execute(
      sql`
    SELECT provider_id, status, fetched, changed, error, created_at
    FROM provider_sync_log
    WHERE id IN (SELECT MAX(id) FROM provider_sync_log GROUP BY provider_id)
    ORDER BY created_at DESC
  `,
    )
    .catch(() => [[]] as any);

  return {
    providers,
    syncLogs: plain((syncLogs as any)[0] ?? []),
    hasSmmturkKey: !!env.SOCIO_SMMTURK_KEY,
    hasSmmturkProvider: providers.some((p: any) =>
      String(p.name ?? "")
        .toLowerCase()
        .includes("smmturk"),
    ),
    plainKeyCount: providers.filter((p: any) => Number(p.api_key_len ?? 0) > 0 && !p.encrypted)
      .length,
  };
};

export const actions: Actions = {
  /**
   * Tambah SMMturk dengan key dari env (SOCIO_SMMTURK_KEY) — provider utama.
   * Idempotent: skip kalau sudah ada.
   */
  addSmmturk: async ({ locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate(
      "provider-add-smmturk",
      (locals as any).ip ?? "0.0.0.0",
      5,
      60,
    );
    if (_rate) return _rate;
    if (!env.SOCIO_SMMTURK_KEY)
      return fail(500, { error: "SOCIO_SMMTURK_KEY belum diset di env." });
    const [existing] = await db
      .select({ id: provider.id })
      .from(provider)
      .where(eq(provider.name, "SMMturk"))
      .limit(1);
    if (existing) return fail(409, { error: "Provider SMMturk sudah ada." });
    await db.insert(provider).values({
      name: "SMMturk",
      apiUrlOrder: "https://smmturk.org/api/v2",
      apiUrlStatus: "https://smmturk.org/api/v2",
      apiKey: encryptSecret(env.SOCIO_SMMTURK_KEY),
    });
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "add_provider",
      entity: "provider",
      detail: { name: "SMMturk", source: "env" },
      ip: (locals as any).ip,
    });
    return { success: "Provider SMMturk ditambahkan (key dari env)." };
  },

  add: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("provider-add", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const apiUrlOrder = String(form.get("apiUrlOrder") ?? "").trim();
    const apiUrlStatus = String(form.get("apiUrlStatus") ?? "").trim();
    const apiKey = String(form.get("apiKey") ?? "").trim();
    if (!name) return fail(400, { error: "Nama provider wajib." });
    if (!apiUrlOrder || !apiUrlStatus) return fail(400, { error: "URL order & status wajib." });
    if (!apiKey) return fail(400, { error: "API key wajib." });

    await db
      .insert(provider)
      .values({ name, apiUrlOrder, apiUrlStatus, apiKey: encryptSecret(apiKey) });
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "add_provider",
      entity: "provider",
      detail: { name },
      ip: (locals as any).ip,
    });
    return { success: `Provider ${name} ditambah.` };
  },

  edit: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("provider-edit", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    const name = String(form.get("name") ?? "").trim();
    const apiUrlOrder = String(form.get("apiUrlOrder") ?? "").trim();
    const apiUrlStatus = String(form.get("apiUrlStatus") ?? "").trim();
    if (!id || !name) return fail(400, { error: "Data tidak lengkap." });

    await db.update(provider).set({ name, apiUrlOrder, apiUrlStatus }).where(eq(provider.id, id));

    // Update API key hanya kalau diisi (biar gak ke-reset)
    const apiKey = String(form.get("apiKey") ?? "").trim();
    if (apiKey) {
      await db
        .update(provider)
        .set({ apiKey: encryptSecret(apiKey) })
        .where(eq(provider.id, id));
    }
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "edit_provider",
      entity: "provider",
      entityId: id,
      detail: { name },
      ip: (locals as any).ip,
    });
    return { success: `Provider ${name} diperbarui.` };
  },

  delete: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("provider-delete", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID wajib." });

    // Block kalau masih dipakai services
    const used = await db
      .select({ c: sql<number>`count(*)` })
      .from(services)
      .where(eq(services.providerId, id));
    if (Number(used[0]?.c ?? 0) > 0) {
      return fail(409, {
        error: `Provider dipakai ${used[0]?.c} layanan. Pindahin dulu sebelum hapus.`,
      });
    }
    await db.delete(provider).where(eq(provider.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "delete_provider",
      entity: "provider",
      entityId: id,
      ip: (locals as any).ip,
    });
    return { success: `Provider #${id} dihapus.` };
  },

  /**
   * Encrypt at rest semua API key provider yang masih plain text (G5).
   * Idempotent: key yang sudah ter-encrypt (prefix "enc:") di-skip.
   */
  encryptAll: async ({ locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate(
      "provider-encrypt-all",
      (locals as any).ip ?? "0.0.0.0",
      3,
      60,
    );
    if (_rate) return _rate;
    try {
      const rows = await db
        .select({ id: provider.id, name: provider.name, apiKey: provider.apiKey })
        .from(provider);
      let count = 0;
      for (const p of rows) {
        if (!p.apiKey || isEncrypted(p.apiKey)) continue;
        await db
          .update(provider)
          .set({ apiKey: encryptSecret(p.apiKey) })
          .where(eq(provider.id, p.id));
        count++;
      }
      await logAudit({
        adminId: Number(locals.user!.id),
        action: "encrypt_provider_keys",
        entity: "provider",
        detail: { encrypted_count: count },
        ip: (locals as any).ip,
      });
      return { success: `${count} API key provider di-encrypt at rest.` };
    } catch (e: any) {
      return fail(500, { error: `Encrypt gagal: ${e.message ?? String(e)}` });
    }
  },

  /** Sync katalog provider sekarang (manual trigger dari UI). */
  sync: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("provider-sync", (locals as any).ip ?? "0.0.0.0", 5, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID wajib." });
    try {
      await triggerProviderSync(id);
      await logAudit({
        adminId: Number(locals.user!.id),
        action: "sync_provider",
        entity: "provider",
        entityId: id,
        ip: (locals as any).ip,
      });
      return { success: "Sync provider dimulai. Cek log sync di bawah." };
    } catch (e: any) {
      return fail(502, { error: `Sync gagal: ${e.message ?? String(e)}` });
    }
  },

  /** Test koneksi provider — fetch balance via API key + URL-nya */
  testConnection: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("provider-test", (locals as any).ip ?? "0.0.0.0", 5, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID wajib." });

    const [row] = await db.select().from(provider).where(eq(provider.id, id)).limit(1);
    if (!row) return fail(404, { error: "Provider tidak ditemukan." });

    try {
      const body = new URLSearchParams({ key: decryptSecret(row.apiKey), action: "balance" });
      const res = await fetch(row.apiUrlOrder, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON: ${text.slice(0, 100)}`);
      }
      if (json.error) throw new Error(String(json.error));
      const balance = Number(json.balance ?? json.remained ?? 0);
      await logAudit({
        adminId: Number(locals.user!.id),
        action: "test_provider",
        entity: "provider",
        entityId: id,
        detail: { balance },
        ip: (locals as any).ip,
      });
      return { success: `Koneksi OK. Balance: ${balance.toLocaleString("id-ID")}` };
    } catch (e: any) {
      return fail(502, { error: `Gagal: ${e.message ?? String(e)}` });
    }
  },
};
