import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { SlotWithAvailability } from "@/lib/types";

export async function GET(request: NextRequest) {
  const authError = checkApiKey(request);
  if (authError) return authError;

  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    const pool = getPool();

    let query = `
      SELECT 
        s.id,
        s.provider,
        s.start,
        s."end",
        CASE 
          WHEN b.id IS NOT NULL THEN false 
          ELSE true 
        END AS available
      FROM slots s
      LEFT JOIN bookings b ON s.id = b.slot_id AND b.status = 'confirmed'
    `;
    const params: unknown[] = [];

    if (provider) {
      params.push(provider);
      query += ` WHERE s.provider = $1`;
    }

    query += ` ORDER BY s.start ASC`;

    const result = await pool.query(query, params);

    const slots: SlotWithAvailability[] = result.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      start: new Date(row.start).toISOString(),
      end: new Date(row.end).toISOString(),
      available: Boolean(row.available),
    }));

    return NextResponse.json({ slots }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
