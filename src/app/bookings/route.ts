import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { checkApiKey } from "@/lib/auth";
import { getPool, initDb } from "@/lib/db";
import { Booking } from "@/lib/types";

// Helper to hash request body for idempotency comparison
function hashBody(body: string): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

// Simple email validation regex
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// -------------------------------------------------------------
// POST /bookings 
// -------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authError = checkApiKey(request);
  if (authError) return authError;

  try {
    await initDb();
    const pool = getPool();

    // 1. Raw body for Idempotency handling
    const rawBody = await request.text();
    const idempotencyKey =
      request.headers.get("idempotency-key") ||
      request.headers.get("Idempotency-Key");

    const currentHash = hashBody(rawBody);

    // Level 4: Check existing idempotency key
    if (idempotencyKey) {
      const existingKey = await pool.query(
        `SELECT request_hash, status_code, response_body FROM idempotency_keys WHERE key = $1`,
        [idempotencyKey]
      );

      if (existingKey.rows.length > 0) {
        const stored = existingKey.rows[0];
        if (stored.request_hash !== currentHash) {
          return NextResponse.json(
            { error: "Idempotency-Key reused with a different body" },
            { status: 422 }
          );
        }
        return NextResponse.json(stored.response_body, {
          status: stored.status_code,
        });
      }
    }

    // Parse JSON
    let bodyJson: Record<string, unknown>;
    try {
      bodyJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const slot_id = typeof bodyJson.slot_id === "string" ? bodyJson.slot_id.trim() : "";
    const name = typeof bodyJson.name === "string" ? bodyJson.name.trim() : "";
    const rawEmail = typeof bodyJson.email === "string" ? bodyJson.email.trim() : "";
    const email = rawEmail.toLowerCase();

    // Level 5: Rate Limiting (5 attempts per email per minute, failed attempts included)
    if (email) {
      const rateCheck = await pool.query(
        `SELECT attempted_at FROM rate_limits 
         WHERE email = $1 AND attempted_at >= NOW() - INTERVAL '60 seconds'
         ORDER BY attempted_at ASC`,
        [email]
      );

      if (rateCheck.rows.length >= 5) {
        // Record this blocked attempt as well
        await pool.query(
          `INSERT INTO rate_limits (email, attempted_at) VALUES ($1, NOW())`,
          [email]
        );

        // Find the attempt that needs to roll off so count < 5
        const indexToRollOff = rateCheck.rows.length - 5;
        const targetAttempt = new Date(rateCheck.rows[indexToRollOff].attempted_at).getTime();
        const now = Date.now();
        const retryAfterSeconds = Math.max(1, Math.ceil((targetAttempt + 60000 - now) / 1000));

        const rateLimitResponse = { error: "Too many attempts for this email" };

        if (idempotencyKey) {
          await pool.query(
            `INSERT INTO idempotency_keys (key, request_hash, status_code, response_body)
             VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING`,
            [idempotencyKey, currentHash, 429, JSON.stringify(rateLimitResponse)]
          );
        }

        return NextResponse.json(rateLimitResponse, {
          status: 429,
          headers: {
            "Retry-After": retryAfterSeconds.toString(),
          },
        });
      }

      // Log this attempt
      await pool.query(
        `INSERT INTO rate_limits (email, attempted_at) VALUES ($1, NOW())`,
        [email]
      );
    }

    // Level 2 Validation: slot_id, name, email
    if (!slot_id || !name || !email) {
      return NextResponse.json(
        { error: "slot_id, name, and email are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    // Atomic booking with concurrency locking
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify slot exists and has not started
      const slotResult = await client.query(
        `SELECT id, start, "end" FROM slots WHERE id = $1 FOR UPDATE`,
        [slot_id]
      );

      if (slotResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Slot not found" }, { status: 404 });
      }

      const slot = slotResult.rows[0];
      const slotStartTime = new Date(slot.start).getTime();
      if (slotStartTime <= Date.now()) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Slot has already started" },
          { status: 400 }
        );
      }

      // Level 3: Check if slot already has a confirmed booking
      const existingBooking = await client.query(
        `SELECT id FROM bookings WHERE slot_id = $1 AND status = 'confirmed'`,
        [slot_id]
      );

      if (existingBooking.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Slot already booked" },
          { status: 409 }
        );
      }

      // Generate unique booking ID
      const bookingId = `b_${nanoid(12)}`;

      const insertResult = await client.query(
        `INSERT INTO bookings (id, slot_id, name, email, status, created_at)
         VALUES ($1, $2, $3, $4, 'confirmed', NOW())
         RETURNING id, slot_id, name, email, status, created_at`,
        [bookingId, slot_id, name, email]
      );

      await client.query("COMMIT");

      const createdRow = insertResult.rows[0];
      const newBooking: Booking = {
        id: createdRow.id,
        slot_id: createdRow.slot_id,
        name: createdRow.name,
        email: createdRow.email,
        status: createdRow.status,
        created_at: new Date(createdRow.created_at).toISOString(),
      };

      // Save idempotency key if provided
      if (idempotencyKey) {
        await pool.query(
          `INSERT INTO idempotency_keys (key, request_hash, status_code, response_body)
           VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING`,
          [idempotencyKey, currentHash, 201, JSON.stringify(newBooking)]
        );
      }

      return NextResponse.json(newBooking, { status: 201 });
    } catch (err: unknown) {
      await client.query("ROLLBACK");
      // Handle PostgreSQL unique constraint violation (error 23505)
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        return NextResponse.json(
          { error: "Slot already booked" },
          { status: 409 }
        );
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// -------------------------------------------------------------
// GET /bookings 
// -------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authError = checkApiKey(request);
  if (authError) return authError;

  try {
    await initDb();
    const { searchParams } = new URL(request.url);

    const email = searchParams.get("email");
    if (!email) {
      return NextResponse.json(
        { error: "email query parameter is required" },
        { status: 400 }
      );
    }

    const limitParam = searchParams.get("limit");
    let limit = 10;
    if (limitParam !== null) {
      const parsedLimit = parseInt(limitParam, 10);
      if (
        isNaN(parsedLimit) ||
        parsedLimit <= 0 ||
        parsedLimit.toString() !== limitParam.trim()
      ) {
        return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
      }
      limit = parsedLimit;
    }

    const cursor = searchParams.get("cursor");
    const pool = getPool();

    let query = `
      SELECT id, slot_id, name, email, status, created_at
      FROM bookings
      WHERE LOWER(email) = LOWER($1)
    `;
    const params: unknown[] = [email.trim()];

    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, "base64url").toString("utf-8")
        );
        if (!decoded.created_at || !decoded.id) {
          return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
        }
        params.push(decoded.created_at, decoded.id);
        query += ` AND (created_at > $2 OR (created_at = $2 AND id > $3))`;
      } catch {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      }
    }

    params.push(limit + 1);
    query += ` ORDER BY created_at ASC, id ASC LIMIT $${params.length}`;

    const result = await pool.query(query, params);

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

    let next_cursor: string | null = null;
    if (hasMore && rows.length > 0) {
      const lastItem = rows[rows.length - 1];
      next_cursor = Buffer.from(
        JSON.stringify({
          created_at: new Date(lastItem.created_at).toISOString(),
          id: lastItem.id,
        })
      ).toString("base64url");
    }

    const bookings: Booking[] = rows.map((r) => ({
      id: r.id,
      slot_id: r.slot_id,
      name: r.name,
      email: r.email,
      status: r.status,
      created_at: new Date(r.created_at).toISOString(),
    }));

    return NextResponse.json({ bookings, next_cursor }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
