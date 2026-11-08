import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { Slot } from "@/lib/types";

export async function POST(request: NextRequest) {
  const authError = checkApiKey(request);
  if (authError) return authError;

  try {
    await initDb();
    const body = await request.json().catch(() => null);

    if (!body || !Array.isArray(body.slots)) {
      return NextResponse.json(
        { error: "Invalid body: 'slots' array is required" },
        { status: 400 }
      );
    }

    const slots: Slot[] = body.slots;
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM bookings");
      await client.query("DELETE FROM slots");
      await client.query("DELETE FROM idempotency_keys");
      await client.query("DELETE FROM rate_limits");

      for (const slot of slots) {
        if (!slot.id || !slot.provider || !slot.start || !slot.end) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Each slot must have id, provider, start, and end" },
            { status: 400 }
          );
        }
        await client.query(
          `INSERT INTO slots (id, provider, start, "end") VALUES ($1, $2, $3, $4)`,
          [slot.id, slot.provider, slot.start, slot.end]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
