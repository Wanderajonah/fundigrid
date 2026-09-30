const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Applies sql/schema.sql idempotently (create table if not exists / add column if not exists).
async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (see backend/.env)");
    process.exit(1);
  }
  const sqlPath = path.join(__dirname, "..", "..", "sql", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration applied:", sqlPath);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  require("dotenv").config();
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err.message);
      process.exit(1);
    });
}

module.exports = { migrate };
