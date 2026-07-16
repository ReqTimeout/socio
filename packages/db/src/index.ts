import type { MySql2Database } from "drizzle-orm/mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema/index.js";

const connectionString =
  process.env.SOCIO_DB_URL ??
  `mysql://${process.env.SOCIO_DB_USER}:${process.env.SOCIO_DB_PASS}@${process.env.SOCIO_DB_HOST}:${process.env.SOCIO_DB_PORT}/${process.env.SOCIO_DB_NAME}`;

const pool = mysql.createPool({
  uri: connectionString,
  connectionLimit: 10,
  charset: "utf8mb4",
});

export const db: MySql2Database<typeof schema> = drizzle(pool, {
  schema,
  mode: "default",
  logger: {
    logQuery: (query: string, params: unknown[]) => {
      if (query.toLowerCase().includes("account")) {
        console.log("[DB] ", query.slice(0, 120), JSON.stringify(params).slice(0, 80));
      }
    },
  },
});

export { pool, schema };
