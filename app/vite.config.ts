import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: ["app.socio.id", "localhost", "127.0.0.1"],
  },
  // better-auth lazily imports @opentelemetry/api via a dynamic chunk; when
  // externalized in the SSR build the chunk path breaks and tracing throws.
  // noExternal keeps the import resolvable in the production adapter-node bundle.
  ssr: {
    noExternal: ["better-auth"],
  },
});
