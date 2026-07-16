import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url:
      process.env.SOCIO_DB_URL ??
      `mysql://${process.env.SOCIO_DB_USER}:${process.env.SOCIO_DB_PASS}@${process.env.SOCIO_DB_HOST}:${process.env.SOCIO_DB_PORT}/${process.env.SOCIO_DB_NAME}`,
  },
  verbose: true,
  strict: true,
});
