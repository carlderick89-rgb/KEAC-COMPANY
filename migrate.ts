import Database from "better-sqlite3";
const db = new Database("inventory.db");

try {
  db.exec("ALTER TABLE users ADD COLUMN plan INTEGER DEFAULT 0");
  console.log("Migration successful: Added plan column to users table.");
} catch (e: any) {
  if (e.message.includes("duplicate column name")) {
    console.log("Migration skipped: plan column already exists.");
  } else {
    console.error("Migration failed:", e.message);
  }
}
