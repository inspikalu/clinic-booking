"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { SlotWithAvailability, Booking } from "@/lib/types";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "koya_cohort4_secret_key";

export default function BookingPage() {
  const [slots, setSlots] = useState<SlotWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter
  const [selectedProvider, setSelectedProvider] = useState<string>("all");

  // Booking Modal
  const [bookingSlot, setBookingSlot] = useState<SlotWithAvailability | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [bookingConfirmation, setBookingConfirmation] = useState<Booking | null>(null);

  // My Bookings Drawer/Modal
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [searchingBookings, setSearchingBookings] = useState(false);

  // Load slots
  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/slots", {
        headers: { "X-API-Key": API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load slots");
      setSlots(data.slots || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  // Unique providers
  const providers = useMemo(() => {
    const list = Array.from(new Set(slots.map((s) => s.provider)));
    return list;
  }, [slots]);

  // Filtered slots
  const filteredSlots = useMemo(() => {
    if (selectedProvider === "all") return slots;
    return slots.filter((s) => s.provider === selectedProvider);
  }, [slots, selectedProvider]);

  // Handle Book appointment
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlot) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({
          slot_id: bookingSlot.id,
          name: patientName,
          email: patientEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");

      setBookingConfirmation(data);
      setSuccessMsg(`Appointment successfully confirmed with ${bookingSlot.provider}!`);
      // Refresh slot list
      await fetchSlots();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking request failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { "X-API-Key": API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed");

      setSuccessMsg("Appointment has been cancelled.");
      if (bookingConfirmation?.id === bookingId) {
        setBookingConfirmation(data);
      }
      // Update my bookings list if open
      setMyBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b))
      );
      await fetchSlots();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Seed sample slots (calls POST /reset)
  const handleSeedDemo = async () => {
    if (!confirm("Reset database with sample upcoming appointment slots?")) return;
    setActionLoading(true);
    setError(null);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const makeSlot = (daysOffset: number, hour: number, id: string, provider: string) => {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        d.setHours(hour, 0, 0, 0);
        const end = new Date(d);
        end.setMinutes(30);
        return {
          id,
          provider,
          start: d.toISOString(),
          end: end.toISOString(),
        };
      };

      const sampleSlots = [
        makeSlot(1, 9, "slot_ade_01", "Dr. Ade"),
        makeSlot(1, 10, "slot_ade_02", "Dr. Ade"),
        makeSlot(1, 11, "slot_ade_03", "Dr. Ade"),
        makeSlot(1, 14, "slot_chioma_01", "Dr. Chioma"),
        makeSlot(1, 15, "slot_chioma_02", "Dr. Chioma"),
        makeSlot(2, 9, "slot_ibrahim_01", "Dr. Ibrahim"),
        makeSlot(2, 11, "slot_ibrahim_02", "Dr. Ibrahim"),
        makeSlot(2, 14, "slot_chioma_03", "Dr. Chioma"),
      ];

      const res = await fetch("/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({ slots: sampleSlots }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reset failed");
      }

      setSuccessMsg("Sample slots seeded successfully!");
      setBookingConfirmation(null);
      await fetchSlots();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to seed demo data");
    } finally {
      setActionLoading(false);
    }
  };

  // Search bookings by email
  const handleSearchBookings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setSearchingBookings(true);
    setError(null);
    try {
      const res = await fetch(`/bookings?email=${encodeURIComponent(searchEmail.trim())}`, {
        headers: { "X-API-Key": API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setMyBookings(data.bookings || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to retrieve bookings");
    } finally {
      setSearchingBookings(false);
    }
  };

  // Helper date formatter
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Koya Care Clinic
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Appointment Booking System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMyBookings(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Search className="h-4 w-4" />
              My Bookings
            </button>
            <button
              onClick={handleSeedDemo}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Sparkles className="h-4 w-4" />
              Seed Demo Slots
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 text-sm font-medium">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 text-sm font-medium">{successMsg}</div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter & Subheader */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Available Appointment Slots
            </h2>
            <p className="text-sm text-slate-500">
              Select a doctor and choose an open slot to schedule your consultation.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">
              Doctor:
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="all">All Doctors</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <button
              onClick={fetchSlots}
              disabled={loading}
              className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition"
              title="Refresh slots"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Slots Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Loading slots from server...</p>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white p-8">
            <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-800">No slots found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              There are currently no slots created. Click the button below to seed demo appointments into your database.
            </p>
            <button
              onClick={handleSeedDemo}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition"
            >
              <Sparkles className="h-4 w-4" />
              Seed Demo Appointments
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSlots.map((slot) => {
              const isAvailable = slot.available;
              return (
                <div
                  key={slot.id}
                  className={`p-5 rounded-2xl border transition bg-white flex flex-col justify-between ${
                    isAvailable
                      ? "border-slate-200 hover:border-blue-400 hover:shadow-md"
                      : "border-slate-200 opacity-60 bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        {slot.id}
                      </span>
                      {isAvailable ? (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Available
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Booked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-lg">
                      <User className="h-5 w-5 text-blue-600" />
                      <span>{slot.provider}</span>
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-600 mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{formatDate(slot.start)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>
                          {formatTime(slot.start)} - {formatTime(slot.end)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!isAvailable}
                    onClick={() => {
                      setBookingSlot(slot);
                      setBookingConfirmation(null);
                      setPatientName("");
                      setPatientEmail("");
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition cursor-pointer ${
                      isAvailable
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {isAvailable ? "Book This Slot" : "Already Booked"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Book Slot */}
        {bookingSlot && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              {bookingConfirmation ? (
                <div>
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-center text-slate-900 mb-1">
                    Booking Confirmed!
                  </h3>
                  <p className="text-sm text-center text-slate-500 mb-6">
                    Your appointment has been registered in the system.
                  </p>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm border border-slate-200 mb-6">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Booking ID:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {bookingConfirmation.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Slot ID:</span>
                      <span className="font-medium text-slate-900">
                        {bookingConfirmation.slot_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Patient:</span>
                      <span className="font-medium text-slate-900">
                        {bookingConfirmation.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-medium text-slate-900">
                        {bookingConfirmation.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {bookingConfirmation.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {bookingConfirmation.status === "confirmed" && (
                      <button
                        onClick={() => handleCancelBooking(bookingConfirmation.id)}
                        disabled={actionLoading}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm font-medium transition cursor-pointer"
                      >
                        Cancel Booking
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setBookingSlot(null);
                        setBookingConfirmation(null);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBook}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Book Appointment
                      </h3>
                      <p className="text-xs text-slate-500">
                        {bookingSlot.provider} • {formatDate(bookingSlot.start)} (
                        {formatTime(bookingSlot.start)})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookingSlot(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g. Ada Obi"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="ada@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Confirmation and booking updates will be sent here.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setBookingSlot(null)}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {actionLoading ? "Processing..." : "Confirm Booking"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal: My Bookings Lookup */}
        {showMyBookings && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  Look Up Your Bookings
                </h3>
                <button
                  onClick={() => setShowMyBookings(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSearchBookings} className="flex gap-2 mb-4">
                <input
                  type="email"
                  required
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Enter your email (e.g. ada@example.com)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={searchingBookings}
                  className="px-4 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-xl hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {searchingBookings ? "Searching..." : "Search"}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {myBookings.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No bookings found. Enter your email above to check your appointments.
                  </p>
                ) : (
                  myBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {b.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              b.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Slot: <span className="font-medium text-slate-800">{b.slot_id}</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          Booked: {new Date(b.created_at).toLocaleString()}
                        </p>
                      </div>

                      {b.status === "confirmed" && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-300 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
