import "dotenv/config";
import { db } from "./db";

// One-time migration: adds a per-assignee status column to task_assignments and seeds it from tasks.status.
async function main() {
  // Add status column; IF NOT EXISTS avoids error if already run
  await db.query(`
    ALTER TABLE task_assignments
    ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Active'
  `);

  // Seed it from tasks.status so existing data is preserved
  await db.query(`
    UPDATE task_assignments ta
    JOIN tasks t ON ta.task_id = t.task_id
    SET ta.status = t.status
  `);

  console.log("Migration complete: task_assignments.status added and seeded from tasks.status");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
