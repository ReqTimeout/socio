// Local seed: inserts the dev-admin-login whitelist users into the local
// `socio_smm.users` table so /dev-admin-login?as=... works offline.
// Password is a static bcrypt hash (dev-admin-login bypasses password checks).
// Re-runnable via INSERT IGNORE. Uses object-param form to avoid placeholder bugs.

import mysql from "mysql2/promise";
import { randomBytes } from "node:crypto";

const rnd = (n) => randomBytes(n).toString("hex");
// Static valid bcrypt hash of "password" — only needed so the column is non-empty.
const PW_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdWjzUqk6y";

const users = [
  // Admins
  { fullName: "Socio Admin", username: "socioadmin", email: "aramadhi92@gmail.com", level: "Admin" },
  { fullName: "Admin", username: "admin", email: "admin@socio.id", level: "Admin" },
  { fullName: "Diomaulana", username: "diomaulana", email: "diomaulana@socio.id", level: "Admin" },
  // Sample members (dev-admin-login?as=febian etc.)
  { fullName: "Febian", username: "febian", email: "febian@socio.id", level: "Member" },
  { fullName: "Irlan", username: "irlan02", email: "irlan02@socio.id", level: "Member" },
  { fullName: "Kokobee", username: "kokobee", email: "kokobee@socio.id", level: "Member" },
  { fullName: "Sadam", username: "sadamhsn", email: "sadamhsn@socio.id", level: "Member" },
];

const conn = await mysql.createConnection(
  "mysql://socio_app:Jf6axcn2j0mmotaMmX38Vvf3WRdd3ho@127.0.0.1:3306/socio_smm?charset=utf8mb4",
);

let inserted = 0;
for (const u of users) {
  const expire = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  const row = {
    full_name: u.fullName,
    username: u.username,
    email: u.email,
    password: PW_HASH,
    balance: 0,
    pulsa_balance: 0,
    pulsa_balance_used: 0,
    balance_used: 0,
    balance_reff: 0,
    level: u.level,
    created_at: new Date(),
    expire,
    status: "1",
    api_key: rnd(12),
    kodek: "",
    hash: "",
    astatus: "1",
    read_popup: "",
    verify: "",
    token: rnd(8),
    has: "",
    reset_link: "",
    exp_reset: new Date(),
    used_reset: "1",
    reff_kode: rnd(10),
    up_link: "",
    subs: 1,
    sent_mail: 0,
    online: 0,
    token_login: rnd(8),
    theme: "light",
    wa_number: "",
  };
  const [res] = await conn.query("INSERT IGNORE INTO users SET ?", row);
  inserted += res.affectedRows;
}

const [count] = await conn.execute("SELECT COUNT(*) AS c FROM users");
console.log(`[seed] inserted ${inserted} new rows; users total = ${count[0].c}`);
await conn.end();
