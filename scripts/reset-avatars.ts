import "./_env";

import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Set it in .env.local.");
  }

  console.log("Clearing user.image…");
  const cleared = await db.update(user).set({ image: null }).returning({ id: user.id });
  console.log(`  ✓ cleared image on ${cleared.length} users`);

  console.log("Dropping settings table if it exists…");
  await db.execute(sql`DROP TABLE IF EXISTS settings`);
  console.log("  ✓ done");

  console.log("\nNext steps:");
  console.log("  1. Clear cookies for localhost:3000 in your browser");
  console.log("  2. Restart the dev server");
  console.log("  3. Sign in again — the new session cookie will be small");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
