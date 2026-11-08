# Clinic Appointment Booking API & Web Client

Built for the **Koya Academy AI Automation Developer (Cohort 4) Assessment**.

A full-stack clinic appointment booking system adhering strictly to the [Koya Assessment OpenAPI Specification](https://koyaacademy.com/assessment-api). Implements all 5 progressive levels, deployed on **Vercel** with a serverless **Neon PostgreSQL** database.

---

## Architecture & Implementation Overview

### 1. Progressive Levels (1 to 5)

* **Level 1 - Core Booking Lifecycle**:
  * `POST /reset`: Atomically clears all existing bookings and replaces all slots with the provided array.
  * `GET /slots`: Lists all slots ordered earliest `start` first. Calculates dynamic `available: true/false` based on existing active bookings. Supports optional `?provider=` filtering.
  * `POST /bookings`: Books an available slot, creating a booking with `status: "confirmed"`.
  * `GET /bookings/{id}`: Looks up a booking by ID.

* **Level 2 - Authentication & Input Sanitization**:
  * Header validation: Every API endpoint enforces `X-API-Key`. A missing or mismatched key immediately rejects with HTTP **401 Unauthorized**.
  * Input validation: Validates `slot_id`, `name`, and `email` (400 if missing or invalid email format).
  * Past slot prevention: Rejects bookings for slots that have already started (`start <= now()`) with HTTP **400**.
  * Sanitization: Names and emails are trimmed; emails are stored in lowercase.
  * Not found: Non-existent slots return HTTP **404**.

* **Level 3 - Concurrency & Atomic Slot Locking**:
  * **Race-Condition Safety**: Double-booking is strictly prohibited even if simultaneous requests hit the server at the exact same millisecond. Powered by PostgreSQL atomic transactions (`SELECT ... FOR UPDATE`) coupled with a database-level partial unique index (`CREATE UNIQUE INDEX unique_confirmed_slot_booking ON bookings (slot_id) WHERE status = 'confirmed'`). Conflicting attempts immediately return HTTP **409 Conflict**.
  * `DELETE /bookings/{id}`: Cancels a booking, transitioning its status to `cancelled` and instantly releasing the slot for new patients. Returns HTTP **409** if the booking was already cancelled.

* **Level 4 - Idempotency & Cursor Pagination**:
  * **Idempotency**: Supports the optional `Idempotency-Key` header on `POST /bookings`. Retried requests with the identical payload return the cached response (same status code, same booking ID) without creating duplicate records. Reusing a key with a different request payload returns HTTP **422 Unprocessable Entity**.
  * **Cursor Pagination**: `GET /bookings?email=...&limit=...&cursor=...` retrieves a patient's bookings in chronological order (`created_at ASC, id ASC`). Employs opaque base64url cursor pagination with `next_cursor: null` on the terminal page. Returns HTTP **400** for invalid limit parameters.

* **Level 5 - Per-Email Rate Limiting**:
  * Rate limits bookings to a maximum of **5 attempts per email per rolling 60-second window** (failed attempts included).
  * The 6th attempt returns HTTP **429 Too Many Requests** accompanied by a precise `Retry-After: <seconds>` header indicating the exact whole number of seconds until the earliest attempt rolls out of the window.
  * Completely isolated per email (does not impact other patients).

---

## Tech Stack

* **Framework**: Next.js 16 (App Router)
* **Language**: TypeScript
* **Database**: Neon (Serverless PostgreSQL) via `@neondatabase/serverless`
* **Styling**: Tailwind CSS v4 + Lucide Icons
* **Deployment**: Vercel

---

## Environment Variables

Create a `.env.local` file (or configure in Vercel project settings):

```env
# Neon Postgres Connection String
DATABASE_URL=postgresql://neondb_owner:password@ep-your-host.eu-central-1.aws.neon.tech/neondb?sslmode=require

# API Key required in X-API-Key header
API_KEY=koya_cohort4_secret_key
NEXT_PUBLIC_API_KEY=koya_cohort4_secret_key
```

---

## Getting Started Locally

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run development server**:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view the booking interface.

