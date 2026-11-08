"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Video,
  MapPin,
  Lock,
  Sun,
  Moon,
  ChevronDown,
  Heart,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { SlotWithAvailability, Booking } from "@/lib/types";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "koya_cohort4_secret_key";

interface DoctorMeta {
  name: string;
  role: string;
  specialty: string;
  image: string;
  bio: string;
  duration: string;
  location: string;
}

const DOCTOR_PROFILES: Record<string, DoctorMeta> = {
  "Dr. Ade": {
    name: "Dr. Ade",
    role: "General Practice",
    specialty: "Family & Preventive Medicine",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256&h=256",
    bio: "Focusing on preventive care, routine health screenings, and comprehensive family consultations.",
    duration: "30 mins",
    location: "Main Clinic Suite 1",
  },
  "Dr. Chioma": {
    name: "Dr. Chioma",
    role: "Internal Medicine",
    specialty: "Pediatrics & Primary Care",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256",
    bio: "Senior clinician with extensive experience in pediatric assessments, acute care, and ongoing wellness.",
    duration: "30 mins",
    location: "Consultation Wing B",
  },
  "Dr. Ibrahim": {
    name: "Dr. Ibrahim",
    role: "Cardiovascular Health",
    specialty: "Cardiology & Lifestyle Medicine",
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=256&h=256",
    bio: "Specializing in cardiovascular screenings, hypertension monitoring, and recovery programs.",
    duration: "30 mins",
    location: "Cardio Suite 3",
  },
};

export default function CalBookingPage() {
  const [slots, setSlots] = useState<SlotWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Theme mode: light or dark
  const [isDark, setIsDark] = useState<boolean>(true);

  // Active doctor
  const [selectedDoctor, setSelectedDoctor] = useState<string>("Dr. Ade");
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState("");

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

  // Modern Cancel Confirmation Dialog State
  const [bookingToCancel, setBookingToCancel] = useState<{
    id: string;
    doctor?: string;
    time?: string;
  } | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (bookingToCancel) {
          setBookingToCancel(null);
        } else if (doctorModalOpen) {
          setDoctorModalOpen(false);
        } else if (showMyBookings) {
          setShowMyBookings(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bookingToCancel, doctorModalOpen, showMyBookings]);

  // Dark mode init
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Fetch slots from API
  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await fetch("/slots", {
        headers: { "X-API-Key": API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load slots");
      setSlots(data.slots || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error connecting to server");
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

  useEffect(() => {
    if (availableDoctors.length > 0 && !availableDoctors.includes(selectedDoctor)) {
      setSelectedDoctor(availableDoctors[0]);
    }
  }, [availableDoctors, selectedDoctor]);

  // Filtered doctors for modal search (Option B)
  const filteredDoctors = useMemo(() => {
    return availableDoctors.filter((docName) => {
      const doc = DOCTOR_PROFILES[docName];
      const term = doctorSearch.toLowerCase();
      if (docName.toLowerCase().includes(term)) return true;
      if (doc?.role.toLowerCase().includes(term)) return true;
      if (doc?.specialty.toLowerCase().includes(term)) return true;
      return false;
    });
  }, [availableDoctors, doctorSearch]);

  // Current doctor profile
  const currentDoctor = DOCTOR_PROFILES[selectedDoctor] || {
    name: selectedDoctor,
    role: "Clinical Specialist",
    specialty: "Outpatient Care",
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

  // Calendar math
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

  // Helper to resolve doctor name from slot_id
  const getDoctorForSlot = (slotId: string) => {
    const matched = slots.find((s) => s.id === slotId);
    if (matched?.provider) return matched.provider;
    if (slotId.toLowerCase().includes("chioma")) return "Dr. Chioma";
    if (slotId.toLowerCase().includes("ibrahim")) return "Dr. Ibrahim";
    return "Dr. Ade";
  };

  // Helper to format slot time nicely
  const getSlotTime = (slotId: string, createdAt: string) => {
    const matched = slots.find((s) => s.id === slotId);
    if (matched) {
      const d = new Date(matched.start);
      const dateFormatted = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return `${dateFormatted} at ${formatTime(matched.start)}`;
    }
    return `Booked on ${new Date(createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  // Handle Book submission
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setActionLoading(true);
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
      toast.success(`Appointment confirmed with ${selectedDoctor}`);
      await fetchSlots();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Booking request failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle confirmed booking cancellation
  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    const bookingId = bookingToCancel.id;

    setActionLoading(true);
    try {
      const res = await fetch(`/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { "X-API-Key": API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed");

      toast.success("Appointment cancelled", {
        description: "Your consultation has been successfully cancelled.",
      });
      if (bookingConfirmation?.id === bookingId) {
        setBookingConfirmation(data);
      }
      setMyBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b))
      );
      setBookingToCancel(null);
      await fetchSlots();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Search bookings by email
  const handleSearchBookings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setSearchingBookings(true);
    try {
      const res = await fetch(`/bookings?email=${encodeURIComponent(searchEmail.trim())}`, {
        headers: { "X-API-Key": API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      const list = data.bookings || [];
      setMyBookings(list);
      if (list.length === 0) {
        toast("No bookings found", {
          description: "No consultations found for this email address.",
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to retrieve bookings");
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#111111] text-slate-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-zinc-800 dark:selection:bg-zinc-200 selection:text-white dark:selection:text-zinc-900 transition-colors duration-200">
      {/* Top Navbar: Cal.com Text Logo & Clean Actions */}
      <header className="border-b border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#111111] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Cal.com style pure text logo */}
          <div className="flex items-center gap-2">
            <span className="font-cal font-bold text-slate-900 dark:text-white text-xl tracking-tight">
              Koya.care
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowMyBookings(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              My Bookings
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={fetchSlots}
              disabled={loading}
              className="p-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Refresh schedule"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Booking Container */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 flex-1 w-full flex flex-col justify-center">
        {/* Cal.com 2-Pane Workstation Card */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
          {/* LEFT PANE: Doctor Info & Calendar Grid */}
          <div className="md:col-span-7 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
            <div>
              {/* Doctor Header with Option B (Change Doctor Selector) */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-3.5">
                  <img
                    src={currentDoctor.image}
                    alt={currentDoctor.name}
                    className="h-14 w-14 rounded-2xl object-cover border border-slate-200 dark:border-zinc-800"
                  />
                  <div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500 font-medium mb-0.5">
                      Consultation
                    </div>
                    <h2 className="text-xl font-cal font-bold text-slate-900 dark:text-white tracking-tight">
                      {currentDoctor.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      {currentDoctor.role} • {currentDoctor.specialty}
                    </p>
                  </div>
                </div>

                {/* Option B: Change Doctor Trigger Button */}
                <button
                  onClick={() => {
                    setDoctorSearch("");
                    setDoctorModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition cursor-pointer shrink-0"
                >
                  <span>Change Doctor</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>

              {/* Consultation details */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-zinc-400 mb-6 pb-6 border-b border-slate-100 dark:border-zinc-800/60 font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                  <span>{currentDoctor.duration}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                  <span>{currentDoctor.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                  <span>In-Person & Telehealth</span>
                </div>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cal font-bold text-sm text-slate-900 dark:text-white">
                  {monthName}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Weekday Headers */}
              <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 dark:text-zinc-500 mb-2 uppercase tracking-wider">
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
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 w-full" />
                ))}

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
                      className={`h-9 w-full rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-950 font-bold"
                          : hasAvailableSlots
                          ? "bg-slate-100 dark:bg-zinc-800/80 text-slate-900 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-zinc-700"
                          : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span>{dayNum}</span>
                      {hasAvailableSlots && !isSelected && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-slate-900 dark:bg-zinc-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANE: Time Slots & Inline Booking Flow */}
          <div className="md:col-span-5 p-6 sm:p-8 bg-slate-50/50 dark:bg-[#141414] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {/* STEP 1: Available Time Slots */}
              {activeStep === "slots" && (
                <motion.div
                  key="step-slots"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.16 }}
                  className="h-full flex flex-col"
                >
                  <div className="mb-4">
                    <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">
                      Available Consultations
                    </span>
                    <h3 className="text-sm font-cal font-bold text-slate-900 dark:text-white">
                      {formatFullDate(selectedDate)}
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[380px]">
                    {loading ? (
                      <div className="py-20 text-center">
                        <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Loading slots...</p>
                      </div>
                    ) : activeDaySlots.length === 0 ? (
                      <div className="py-20 text-center px-4">
                        <CalendarIcon className="h-8 w-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">No open slots</p>
                        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                          Choose another date on the calendar.
                        </p>
                      </div>
                    ) : (
                      activeDaySlots.map((slot) => {
                        const isAvailable = slot.available;
                        return (
                          <button
                            key={slot.id}
                            disabled={!isAvailable}
                            onClick={() => {
                              setSelectedSlot(slot);
                              setActiveStep("form");
                            }}
                            className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                              isAvailable
                                ? "bg-white dark:bg-zinc-900/90 border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600 shadow-2xs cursor-pointer group"
                                : "bg-slate-100/70 dark:bg-zinc-900/40 border-slate-200/50 dark:border-zinc-800/40 opacity-40 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Clock className={`h-4 w-4 ${isAvailable ? "text-slate-700 dark:text-zinc-300" : "text-slate-400 dark:text-zinc-600"}`} />
                              <span className={`text-xs font-semibold ${isAvailable ? "text-slate-900 dark:text-zinc-100" : "text-slate-400 dark:text-zinc-500"}`}>
                                {formatTime(slot.start)} - {formatTime(slot.end)}
                              </span>
                            </div>

                            {/* Only Icons: No Text like "Select" or "Taken" */}
                            <div>
                              {isAvailable ? (
                                <ArrowRight className="h-4 w-4 text-slate-400 dark:text-zinc-500 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-600" />
                              )}
                            </div>
                          </button>
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
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.16 }}
                  className="h-full flex flex-col justify-between"
                >
                  <div>
                    <button
                      onClick={() => setActiveStep("slots")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white mb-3.5 transition cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to times
                    </button>

                    <h3 className="text-sm font-cal font-bold text-slate-900 dark:text-white mb-0.5">
                      Confirm Patient Information
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
                      {selectedDoctor} • {formatFullDate(selectedDate)} at {formatTime(selectedSlot.start)}
                    </p>

                    <form id="booking-form" onSubmit={handleConfirmBooking} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="e.g. Ada Obi"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-zinc-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={patientEmail}
                          onChange={(e) => setPatientEmail(e.target.value)}
                          placeholder="ada@example.com"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-zinc-500"
                        />
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                          Your appointment reference will be sent to this email.
                        </p>
                      </div>
                    </form>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 mt-4">
                    <button
                      type="submit"
                      form="booking-form"
                      disabled={actionLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Securing Appointment...</span>
                        </>
                      ) : (
                        <span>Confirm Booking</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Booking Confirmation Receipt */}
              {activeStep === "confirmation" && bookingConfirmation && (
                <motion.div
                  key="step-confirmation"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="h-full flex flex-col justify-between"
                >
                  <div>
                    {bookingConfirmation.status === "cancelled" ? (
                      <div>
                        {/* Red cancellation badge */}
                        <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mb-3.5 shadow-xs">
                          <X className="h-4 w-4 stroke-[2.5]" />
                        </div>

                        <h3 className="text-base font-cal font-bold text-slate-900 dark:text-white mb-0.5">
                          Consultation cancelled
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
                          This appointment has been cancelled and the slot reopened.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Sleek monochrome checkmark badge */}
                        <div className="h-9 w-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center mb-3.5 shadow-xs">
                          <Check className="h-4 w-4 stroke-[2.5]" />
                        </div>

                        <h3 className="text-base font-cal font-bold text-slate-900 dark:text-white mb-0.5">
                          This consultation is scheduled
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
                          A confirmation has been sent to {bookingConfirmation.email}.
                        </p>
                      </div>
                    )}

                    <div className="bg-slate-50 dark:bg-zinc-900/60 rounded-xl p-3.5 space-y-2.5 text-xs border border-slate-200/80 dark:border-zinc-800">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">Status</span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            bookingConfirmation.status === "confirmed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              bookingConfirmation.status === "confirmed" ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {bookingConfirmation.status === "confirmed" ? "Confirmed" : "Cancelled"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">Physician</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{selectedDoctor}</span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">When</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatFullDate(selectedDate)} at {selectedSlot ? formatTime(selectedSlot.start) : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">Patient</span>
                        <span className="font-medium text-slate-900 dark:text-white">{bookingConfirmation.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 dark:text-zinc-500 font-mono text-[11px]">Booking ID</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 select-all">
                          {bookingConfirmation.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <button
                      onClick={() => {
                        setActiveStep("slots");
                        setBookingConfirmation(null);
                        setSelectedSlot(null);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold transition cursor-pointer"
                    >
                      Done
                    </button>

                    {bookingConfirmation.status === "confirmed" && (
                      <button
                        onClick={() =>
                          setBookingToCancel({
                            id: bookingConfirmation.id,
                            doctor: selectedDoctor,
                            time: selectedSlot
                              ? `${formatFullDate(selectedDate)} at ${formatTime(selectedSlot.start)}`
                              : undefined,
                          })
                        }
                        disabled={actionLoading}
                        className="w-full py-2 px-3 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition cursor-pointer"
                      >
                        Cancel appointment
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Option B: Searchable Doctor Directory Modal (Scales to 20+ Doctors!) */}
        <AnimatePresence>
          {doctorModalOpen && (
            <div
              className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setDoctorModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#18181b] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[85vh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-cal font-bold text-slate-900 dark:text-white">
                    Select Physician
                  </h3>
                  <button
                    onClick={() => setDoctorModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Search input for 20+ doctors */}
                <div className="relative mb-3.5">
                  <Search className="h-4 w-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Search by name, role, or specialty..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-zinc-600"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredDoctors.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 text-center py-8">
                      No doctors match your search.
                    </p>
                  ) : (
                    filteredDoctors.map((docName) => {
                      const doc = DOCTOR_PROFILES[docName] || {
                        name: docName,
                        role: "Physician",
                        specialty: "Outpatient Clinic",
                        image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256&h=256",
                      };
                      const isSelected = selectedDoctor === docName;

                      return (
                        <button
                          key={docName}
                          onClick={() => {
                            setSelectedDoctor(docName);
                            setDoctorModalOpen(false);
                            setActiveStep("slots");
                            setSelectedSlot(null);
                          }}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-zinc-800/60"
                              : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={doc.image}
                              alt={doc.name}
                              className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-zinc-800"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {doc.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                {doc.role} • {doc.specialty}
                              </p>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-slate-900 dark:bg-white" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: My Consultations Lookup */}
        <AnimatePresence>
          {showMyBookings && (
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setShowMyBookings(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#18181b] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[85vh] flex flex-col"
              >
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                  <div>
                    <h3 className="text-base font-cal font-bold text-slate-900 dark:text-white">
                      My Consultations
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Lookup and manage your scheduled appointments.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMyBookings(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSearchBookings} className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="Search by email (e.g. ada@example.com)"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchingBookings}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-zinc-950 font-semibold text-xs rounded-xl hover:bg-black dark:hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {searchingBookings ? "Searching..." : "Search"}
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {myBookings.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <CalendarIcon className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                        No appointments found. Enter your email above to look up your bookings.
                      </p>
                    </div>
                  ) : (
                    myBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex items-center justify-between gap-3 transition hover:border-slate-300 dark:hover:border-zinc-700"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center shrink-0 text-slate-700 dark:text-zinc-300">
                            <CalendarIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {getDoctorForSlot(b.slot_id)} • Consultation
                              </h4>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                                  b.status === "confirmed"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    b.status === "confirmed" ? "bg-emerald-500" : "bg-zinc-400"
                                  }`}
                                />
                                {b.status === "confirmed" ? "Confirmed" : "Cancelled"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                              {getSlotTime(b.slot_id, b.created_at)}
                            </p>
                            <p className="font-mono text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 select-all">
                              Ref: {b.id}
                            </p>
                          </div>
                        </div>

                        {b.status === "confirmed" && (
                          <button
                            onClick={() =>
                              setBookingToCancel({
                                id: b.id,
                                doctor: getDoctorForSlot(b.slot_id),
                                time: getSlotTime(b.slot_id, b.created_at),
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
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
        </AnimatePresence>

        {/* Modern Confirmation Dialog for Appointment Cancellation */}
        <AnimatePresence>
          {bookingToCancel && (
            <div
              className="fixed inset-0 z-60 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => {
                if (!actionLoading) setBookingToCancel(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#18181b] rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3.5">
                  <div className="h-10 w-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <button
                    onClick={() => {
                      if (!actionLoading) setBookingToCancel(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    aria-label="Close dialog"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="text-base font-cal font-bold text-slate-900 dark:text-white mb-1">
                  Cancel Consultation?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed mb-4">
                  Are you sure you want to cancel this appointment? This action cannot be undone and your slot will be reopened for other patients.
                </p>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 space-y-1.5 text-xs mb-4">
                  {bookingToCancel.doctor && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-zinc-400">Physician</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {bookingToCancel.doctor}
                      </span>
                    </div>
                  )}
                  {bookingToCancel.time && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-zinc-400">When</span>
                      <span className="font-medium text-slate-800 dark:text-zinc-200">
                        {bookingToCancel.time}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Reference</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 truncate max-w-[170px] select-all">
                      {bookingToCancel.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setBookingToCancel(null)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/70 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-medium text-xs transition cursor-pointer text-center disabled:opacity-50"
                  >
                    Keep Appointment
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleConfirmCancel}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <span>Yes, Cancel</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#111111] py-4">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-500">
          <p>© 2026 Koya.care. Patient Consultation Scheduling.</p>
          <a
            href="https://x.com/inspikalu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-zinc-300 transition"
          >
            <span>with</span>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
            <span>by inspikalu</span>
          </a>
        </div>
      </footer>

      {/* Modern Sonner Toast Notifications */}
      <Toaster position="bottom-right" richColors theme={isDark ? "dark" : "light"} />
    </div>
  );
}
