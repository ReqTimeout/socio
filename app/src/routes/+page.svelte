<script lang="ts">
  let email: string = $state("");
  let password: string = $state("");
  let msg: string = $state("");

  async function login(): Promise<void> {
    msg = "loading...";
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    msg = r.ok
      ? "LOGIN OK: " + JSON.stringify(d.user?.email ?? "")
      : "FAIL: " + (d.error ?? "unknown");
  }
</script>

<main style="font-family:sans-serif;padding:2rem;max-width:400px;margin:auto">
  <h1>Socio.id — Login Test (M1)</h1>
  <input bind:value={email} placeholder="email" style="display:block;width:100%;margin:8px 0;padding:8px" />
  <input bind:value={password} type="password" placeholder="password" style="display:block;width:100%;margin:8px 0;padding:8px" />
  <button onclick={login} style="padding:8px 16px">Login</button>
  <p>{msg}</p>
</main>
