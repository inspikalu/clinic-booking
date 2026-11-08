import { Pool } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

// Load .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...values] = trimmed.split("=");
    if (key && values.length > 0) {
      const val = values.join("=").trim().replace(/^["']|["']$/g, "");
      process.env[key.trim()] = val;
    }
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL is not set in environment or .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString });

function makeSlot(daysOffset, hour, minute, id, provider) {
  const start = new Date();
  start.setDate(start.getDate() + daysOffset);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(start.getMinutes() + 30);

  return {
    id,
    provider,
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function seed() {
  console.log("Connecting to Neon PostgreSQL database...");
  const client = await pool.connect();

  try {
    console.log("Wiping existing slots and bookings (Level 1 reset)...");
    await client.query("BEGIN");
    await client.query("DELETE FROM bookings");
    await client.query("DELETE FROM slots");
    await client.query("DELETE FROM idempotency_keys");
    await client.query("DELETE FROM rate_limits");

    // Upcoming slots for tomorrow and subsequent days
    const sampleSlots = [
      makeSlot(1, 9, 0, "slot_ade_01", "Dr. Ade"),
      makeSlot(1, 9, 30, "slot_ade_02", "Dr. Ade"),
      makeSlot(1, 10, 0, "slot_ade_03", "Dr. Ade"),
      makeSlot(1, 11, 0, "slot_ade_04", "Dr. Ade"),
      makeSlot(1, 14, 0, "slot_chioma_01", "Dr. Chioma"),
      makeSlot(1, 14, 30, "slot_chioma_02", "Dr. Chioma"),
      makeSlot(1, 15, 0, "slot_chioma_03", "Dr. Chioma"),
      makeSlot(2, 9, 0, "slot_ibrahim_01", "Dr. Ibrahim"),
      makeSlot(2, 9, 30, "slot_ibrahim_02", "Dr. Ibrahim"),
      makeSlot(2, 10, 30, "slot_ibrahim_03", "Dr. Ibrahim"),
      makeSlot(2, 14, 0, "slot_chioma_04", "Dr. Chioma"),
      makeSlot(3, 9, 0, "slot_ade_05", "Dr. Ade"),
    ];

    for (const slot of sampleSlots) {
      await client.query(
        `INSERT INTO slots (id, provider, start, "end") VALUES ($1, $2, $3, $4)`,
        [slot.id, slot.provider, slot.start, slot.end]
      );
    }

    await client.query("COMMIT");
    console.log(`Successfully seeded ${sampleSlots.length} appointment slots across 3 doctors.`);
    console.log("Doctors: Dr. Ade, Dr. Chioma, Dr. Ibrahim");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seeding failed:", err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
