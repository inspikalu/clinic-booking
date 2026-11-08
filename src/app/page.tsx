"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Video,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SlotWithAvailability, Booking } from "@/lib/types";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "koya_cohort4_secret_key";

interface DoctorMeta {
  name: string;
  role: string;
  image: string;
  bio: string;
  duration: string;
  location: string;
}

const DOCTOR_PROFILES: Record<string, DoctorMeta> = {
  "Dr. Ade": {
    name: "Dr. Ade",
    role: "General Practice & Family Medicine",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256&h=256",
    bio: "Specializing in preventive wellness, acute clinical diagnoses, and comprehensive family consultations.",
    duration: "30 mins",
    location: "Main Clinic & Telehealth",
  },
  "Dr. Chioma": {
    name: "Dr. Chioma",
    role: "Internal Medicine & Pediatrics",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256",
    bio: "Senior clinician with extensive experience in pediatric care, routine screenings, and holistic care plans.",
    duration: "30 mins",
    location: "Consultation Wing B",
  },
  "Dr. Ibrahim": {
    name: "Dr. Ibrahim",
    role: "Cardiology & Lifestyle Medicine",
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=256&h=256",
    bio: "Focusing on cardiovascular assessments, blood pressure management, and post-treatment recovery monitoring.",
    duration: "30 mins",
    location: "Cardio Suite 3",
  },
};

export default function CalBookingPage() {
  const [slots, setSlots] = useState<SlotWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active doctor
  const [selectedDoctor, setSelectedDoctor] = useState<string>("Dr. Ade");

  // Calendar month state
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Interactive booking step: "slots" | "form" | "confirmation"
  const [activeStep, setActiveStep] = useState<"slots" | "form" | "confirmation">("slots");
  const [selectedSlot, setSelectedSlot] = useState<SlotWithAvailability | null>(null);

  // Form input
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [bookingConfirmation, setBookingConfirmation] = useState<Booking | null>(null);

  // My Bookings Drawer
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [searchingBookings, setSearchingBookings] = useState(false);

  // Fetch slots from API
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

  // Distinct doctors in system
  const availableDoctors = useMemo(() => {
    const fromSlots = Array.from(new Set(slots.map((s) => s.provider)));
    if (fromSlots.length > 0) return fromSlots;
    return ["Dr. Ade", "Dr. Chioma", "Dr. Ibrahim"];
  }, [slots]);

  // Ensure selected doctor exists
  useEffect(() => {
    if (availableDoctors.length > 0 && !availableDoctors.includes(selectedDoctor)) {
      setSelectedDoctor(availableDoctors[0]);
    }
  }, [availableDoctors, selectedDoctor]);

  // Current doctor profile
  const currentDoctor = DOCTOR_PROFILES[selectedDoctor] || {
    name: selectedDoctor,
    role: "Clinical Specialist",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256&h=256",
    bio: "Consulting physician at Koya Care Clinic providing outpatient examinations.",
    duration: "30 mins",
    location: "Main Clinic Wing",
  };

  // Calendar dates with slots for the current doctor
  const datesWithSlots = useMemo(() => {
    const datesMap = new Map<string, number>();
    for (const slot of slots) {
      if (slot.provider === selectedDoctor) {
        const d = new Date(slot.start);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        datesMap.set(key, (datesMap.get(key) || 0) + (slot.available ? 1 : 0));
      }
    }
    return datesMap;
  }, [slots, selectedDoctor]);

  // Auto-select first date that has available slots when switching doctor
  useEffect(() => {
    const doctorSlots = slots.filter((s) => s.provider === selectedDoctor && s.available);
    if (doctorSlots.length > 0) {
      const earliest = new Date(doctorSlots[0].start);
      setSelectedDate(earliest);
      setViewDate(new Date(earliest.getFullYear(), earliest.getMonth(), 1));
    }
  }, [selectedDoctor, slots]);

  // Calendar math for grid
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  const monthName = useMemo(() => {
    return viewDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [viewDate]);

  // Slots for currently selected date and doctor
  const activeDaySlots = useMemo(() => {
    return slots.filter((s) => {
      if (s.provider !== selectedDoctor) return false;
      const d = new Date(s.start);
      return (
        d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate()
      );
    });
  }, [slots, selectedDoctor, selectedDate]);

  // Handle Book submission
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

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
          slot_id: selectedSlot.id,
          name: patientName,
          email: patientEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");

      setBookingConfirmation(data);
      setActiveStep("confirmation");
      setSuccessMsg(`Appointment booked with ${selectedDoctor}!`);
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

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">
                  Koya Care Clinic
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Accepting Patients
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMyBookings(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <Search className="h-3.5 w-3.5 text-slate-500" />
              My Bookings
            </button>
            <button
              onClick={fetchSlots}
              disabled={loading}
              className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Refresh schedule"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Booking Container */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 flex-1 w-full flex flex-col justify-center">
        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm font-medium"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">{error}</div>
              <button onClick={() => setError(null)} className="text-xs font-semibold text-rose-600 hover:underline">
                Dismiss
              </button>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-sm font-medium"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1">{successMsg}</div>
              <button onClick={() => setSuccessMsg(null)} className="text-xs font-semibold text-emerald-600 hover:underline">
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Doctor Switcher Segmented Control */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-2xl border border-slate-300/60 shadow-2xs">
            {availableDoctors.map((doc) => {
              const isSelected = selectedDoctor === doc;
              return (
                <button
                  key={doc}
                  onClick={() => {
                    setSelectedDoctor(doc);
                    setActiveStep("slots");
                    setSelectedSlot(null);
                  }}
                  className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    isSelected ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeDoctorPill"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      className="absolute inset-0 bg-white rounded-xl shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{doc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cal.com 2-Pane Workstation Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
          {/* LEFT PANE: Doctor Info & Calendar Grid */}
          <div className="md:col-span-7 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
            {/* Top: Doctor Metadata */}
            <div>
              <div className="flex items-start gap-4 mb-6">
                <img
                  src={currentDoctor.image}
                  alt={currentDoctor.name}
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-0.5">
                    <span>Clinical Consultation</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {currentDoctor.name}
                  </h2>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">
                    {currentDoctor.role}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-6 pb-6 border-b border-slate-100 font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{currentDoctor.duration}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{currentDoctor.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-slate-400" />
                  <span>In-Person & Telehealth</span>
                </div>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-900">
                  {monthName}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Weekday Headers */}
              <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {/* Empty filler cells before 1st of month */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 w-full" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateObj = new Date(currentYear, currentMonth, dayNum);
                  const dateKey = `${currentYear}-${currentMonth}-${dayNum}`;
                  const hasAvailableSlots = (datesWithSlots.get(dateKey) || 0) > 0;

                  const isSelected =
                    selectedDate.getFullYear() === currentYear &&
                    selectedDate.getMonth() === currentMonth &&
                    selectedDate.getDate() === dayNum;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      onClick={() => {
                        setSelectedDate(dateObj);
                        setActiveStep("slots");
                        setSelectedSlot(null);
                      }}
                      className={`h-10 w-full rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : hasAvailableSlots
                          ? "bg-blue-50/80 text-blue-900 font-bold hover:bg-blue-100"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{dayNum}</span>
                      {hasAvailableSlots && !isSelected && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom: Clinic Trust Badge */}
            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center gap-2 text-xs text-slate-400 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Verified Koya Clinic Physician • Instant Confirmation</span>
            </div>
          </div>

          {/* RIGHT PANE: Time Slots & Booking Workflow */}
          <div className="md:col-span-5 p-6 sm:p-8 bg-slate-50/50 flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {/* STEP 1: Available Time Slots */}
              {activeStep === "slots" && (
                <motion.div
                  key="step-slots"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.18 }}
                  className="h-full flex flex-col"
                >
                  <div className="mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Select Consultation Time
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {formatFullDate(selectedDate)}
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[400px]">
                    {loading ? (
                      <div className="py-20 text-center">
                        <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium">Checking live schedule...</p>
                      </div>
                    ) : activeDaySlots.length === 0 ? (
                      <div className="py-20 text-center px-4">
                        <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No slots available</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Please select another day or choose a different doctor.
                        </p>
                      </div>
                    ) : (
                      activeDaySlots.map((slot) => {
                        const isAvailable = slot.available;
                        return (
                          <motion.button
                            key={slot.id}
                            whileHover={isAvailable ? { scale: 1.015 } : {}}
                            whileTap={isAvailable ? { scale: 0.98 } : {}}
                            disabled={!isAvailable}
                            onClick={() => {
                              setSelectedSlot(slot);
                              setActiveStep("form");
                            }}
                            className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                              isAvailable
                                ? "bg-white border-slate-200/90 hover:border-blue-500 shadow-2xs hover:shadow-xs cursor-pointer group"
                                : "bg-slate-100 border-slate-200/60 opacity-60 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isAvailable ? (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              ) : (
                                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                              )}
                              <span className={`text-sm font-semibold ${isAvailable ? "text-slate-800 group-hover:text-blue-600" : "text-slate-400"}`}>
                                {formatTime(slot.start)} - {formatTime(slot.end)}
                              </span>
                            </div>

                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"
                            }`}>
                              {isAvailable ? "Book" : "Taken"}
                            </span>
                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Patient Booking Form */}
              {activeStep === "form" && selectedSlot && (
                <motion.div
                  key="step-form"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.18 }}
                  className="h-full flex flex-col justify-between"
                >
                  <div>
                    <button
                      onClick={() => setActiveStep("slots")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to time slots
                    </button>

                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      Patient Details
                    </h3>
                    <p className="text-xs text-slate-500 mb-5">
                      Appointment with <span className="font-semibold text-slate-800">{selectedDoctor}</span> on{" "}
                      <span className="font-semibold text-slate-800">{formatFullDate(selectedDate)}</span> at{" "}
                      <span className="font-semibold text-slate-800">{formatTime(selectedSlot.start)}</span>.
                    </p>

                    <form id="booking-form" onSubmit={handleConfirmBooking} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="e.g. Ada Obi"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={patientEmail}
                          onChange={(e) => setPatientEmail(e.target.value)}
                          placeholder="ada@example.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Appointment confirmation and access instructions will be sent here.
                        </p>
                      </div>
                    </form>
                  </div>

                  <div className="pt-4 mt-6 border-t border-slate-200">
                    <button
                      type="submit"
                      form="booking-form"
                      disabled={actionLoading}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Securing Appointment...</span>
                        </>
                      ) : (
                        <span>Confirm Appointment</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Booking Confirmation Receipt */}
              {activeStep === "confirmation" && bookingConfirmation && (
                <motion.div
                  key="step-confirmation"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="h-full flex flex-col justify-between"
                >
                  <div>
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-2xs">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      Appointment Confirmed!
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">
                      A calendar invite has been dispatched to {bookingConfirmation.email}.
                    </p>

                    <div className="bg-white rounded-2xl p-4 space-y-2.5 text-xs border border-slate-200 shadow-2xs">
                      <div className="flex justify-between pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Booking Reference:</span>
                        <span className="font-mono font-bold text-slate-900">{bookingConfirmation.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Physician:</span>
                        <span className="font-semibold text-slate-900">{selectedDoctor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date:</span>
                        <span className="font-medium text-slate-900">{formatFullDate(selectedDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Patient:</span>
                        <span className="font-medium text-slate-900">{bookingConfirmation.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          bookingConfirmation.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}>
                          {bookingConfirmation.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-6">
                    {bookingConfirmation.status === "confirmed" && (
                      <button
                        onClick={() => handleCancelBooking(bookingConfirmation.id)}
                        disabled={actionLoading}
                        className="w-full py-2.5 px-4 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                      >
                        Cancel Appointment
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveStep("slots");
                        setBookingConfirmation(null);
                        setSelectedSlot(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                    >
                      Schedule Another
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Modal: My Bookings Lookup (Level 4 verification) */}
        {showMyBookings && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Search className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Look Up Your Appointments
                  </h3>
                </div>
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
                  placeholder="Enter email (e.g. ada@example.com)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={searchingBookings}
                  className="px-4 py-2.5 bg-blue-600 text-white font-semibold text-xs sm:text-sm rounded-xl hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {searchingBookings ? "Searching..." : "Lookup"}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {myBookings.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">
                    No bookings found. Enter your email above to check your consultation history.
                  </p>
                ) : (
                  myBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {b.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Slot ID: <span className="font-semibold text-slate-900">{b.slot_id}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(b.created_at).toLocaleString()}
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
            </motion.div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 Koya Care Clinic. Secure Patient Appointment Scheduling.</p>
          <div className="flex items-center gap-4">
            <span>Powered by Next.js 16 & Neon PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
