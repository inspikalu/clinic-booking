import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { Booking } from "@/lib/types";

// -------------------------------------------------------------
// GET /bookings/{id} (Level 1: Get a booking)
// -------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = checkApiKey(request);
  if (authError) return authError;

  try {
    await initDb();
    const { id } = await params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, slot_id, name, email, status, created_at FROM bookings WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "No booking with that id" },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const booking: Booking = {
      id: row.id,
      slot_id: row.slot_id,
      name: row.name,
      email: row.email,
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
    };

    return NextResponse.json(booking, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// -------------------------------------------------------------
// DELETE /bookings/{id} (Level 3: Cancel a booking)
// -------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = checkApiKey(request);
  if (authError) return authError;

  try {
    await initDb();
    const { id } = await params;
    const pool = getPool();

    // Check if booking exists and current status
    const existing = await pool.query(
      `SELECT id, slot_id, name, email, status, created_at FROM bookings WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "No booking with that id" },
        { status: 404 }
      );
    }

    if (existing.rows[0].status === "cancelled") {
      return NextResponse.json(
        { error: "Booking already cancelled" },
        { status: 409 }
      );
    }

    // Update status to cancelled
    const updateResult = await pool.query(
      `UPDATE bookings 
       SET status = 'cancelled' 
       WHERE id = $1 
       RETURNING id, slot_id, name, email, status, created_at`,
      [id]
    );

    const updatedRow = updateResult.rows[0];
    const cancelledBooking: Booking = {
      id: updatedRow.id,
      slot_id: updatedRow.slot_id,
      name: updatedRow.name,
      email: updatedRow.email,
      status: updatedRow.status,
      created_at: new Date(updatedRow.created_at).toISOString(),
    };

    return NextResponse.json(cancelledBooking, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
