import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActor } from "@/hooks/useActor";
import {
  calculateTravelFee,
  estimateDistance,
  getZoneLabel,
} from "@/utils/travelFeeEngine";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  InfoIcon,
  Loader2,
  MapPin,
  Timer,
  Video,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const RON_ACT_FEE = 25;
const RON_PLATFORM_FEE = 25;
const MOBILE_ACT_FEE = 10;
const DEFAULT_BASE_ADDRESS = "123 Central Dispatch Ave, Miami, FL 33101";
const LS_KEY_BASE_ADDR = "notaryBaseAddress";
const MOCK_DOCUMENTS = [
  "W9 - John Smith",
  "I-9 Employment Form",
  "Lease Agreement",
  "Power of Attorney",
  "Affidavit of Residency",
];

// ─── Availability Configuration ──────────────────────────────────────────────
// All hours in Eastern Time (ET)
const WEEKDAY_START_ET = 18; // 6:00 PM
const WEEKDAY_END_ET = 22; // 10:00 PM (last slot at 9:45 PM)
const WEEKEND_START_ET = 9; // 9:00 AM
const WEEKEND_END_ET = 21; // 9:00 PM (last slot at 8:45 PM)
const LEAD_TIME_MINUTES = 120; // 2-hour minimum lead time
const SLOT_DURATION_MINUTES = 15;

type NotaryType = "ron" | "mobile" | null;
type IdMethod = "Driver's License" | "Passport" | "Credible Witness";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function generateSessionId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── Time slot generation ─────────────────────────────────────────────────────
// Generate all slots from 9 AM to 9:45 PM (covers both weekday & weekend windows)
function buildAllTimeSlots(): string[] {
  const slots: string[] = [];
  // 9 AM (hour=9) to last slot before 10 PM (hour=21, min=45)
  for (let hour = 9; hour <= 21; hour++) {
    for (let min = 0; min < 60; min += SLOT_DURATION_MINUTES) {
      // Stop at 9:45 PM (21:45)
      if (hour === 21 && min > 45) break;
      const h = hour % 12 === 0 ? 12 : hour % 12;
      const ampm = hour < 12 ? "AM" : "PM";
      slots.push(`${h}:${pad(min)} ${ampm}`);
    }
  }
  return slots;
}

const ALL_TIME_SLOTS = buildAllTimeSlots();

/** Parse a slot label like "6:00 PM" into { hour24, minute } */
function parseSlot(slot: string): { hour24: number; minute: number } {
  const [timePart, ampm] = slot.split(" ");
  const [hStr, mStr] = timePart.split(":");
  let hour = Number.parseInt(hStr, 10);
  const minute = Number.parseInt(mStr, 10);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return { hour24: hour, minute };
}

/** Get ET hour for a given local Date */
function getETHour(date: Date): number {
  const etStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).format(date);
  return Number.parseInt(etStr, 10);
}

/** Check if a specific day (year/month/day) is a weekend */
function isDayWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
}

/**
 * Returns whether a slot is within the notary's availability window (ET).
 * Weekday: 6 PM – 10 PM ET
 * Weekend: 9 AM – 9 PM ET
 */
function isSlotInAvailabilityWindow(
  year: number,
  month: number,
  day: number,
  slot: string,
): boolean {
  const { hour24, minute } = parseSlot(slot);
  // Create a local Date for this slot
  const slotDate = new Date(year, month, day, hour24, minute, 0);

  // Get ET hour for this slot's start time
  const etHourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).format(slotDate);
  const [etH] = etHourStr.split(":").map(Number);

  const isWeekend = isDayWeekend(year, month, day);
  const startET = isWeekend ? WEEKEND_START_ET : WEEKDAY_START_ET;
  const endET = isWeekend ? WEEKEND_END_ET : WEEKDAY_END_ET;

  // Slot start must be >= startET and slot END (start + 15 min) must be <= endET
  const slotEndDate = new Date(
    slotDate.getTime() + SLOT_DURATION_MINUTES * 60000,
  );
  const etEndHourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).format(slotEndDate);
  const [etEndH] = etEndHourStr.split(":").map(Number);

  return etH >= startET && etEndH <= endET;
}

/**
 * Returns whether a slot is within the 2-hour lead time restriction.
 * Returns true if the slot is too soon (should be disabled).
 */
function isSlotTooSoon(
  year: number,
  month: number,
  day: number,
  slot: string,
): boolean {
  const { hour24, minute } = parseSlot(slot);
  const slotDate = new Date(year, month, day, hour24, minute, 0);
  const now = new Date();
  const diffMs = slotDate.getTime() - now.getTime();
  return diffMs < LEAD_TIME_MINUTES * 60000;
}

/** Returns the next available slot datetime in ET, or null if always available */
function getNextAvailableLabel(): string | null {
  const now = new Date();
  // Check today and the next 7 days
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + daysAhead);
    const y = checkDate.getFullYear();
    const mo = checkDate.getMonth();
    const d = checkDate.getDate();
    for (const slot of ALL_TIME_SLOTS) {
      if (
        isSlotInAvailabilityWindow(y, mo, d, slot) &&
        !isSlotTooSoon(y, mo, d, slot)
      ) {
        const { hour24, minute } = parseSlot(slot);
        const slotDate = new Date(y, mo, d, hour24, minute);
        const label = slotDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        return `${label} at ${slot}`;
      }
    }
  }
  return null;
}

/** Get countdown string until next available notary slot */
function getCountdownToNextSlot(): string {
  const now = new Date();
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + daysAhead);
    const y = checkDate.getFullYear();
    const mo = checkDate.getMonth();
    const d = checkDate.getDate();
    for (const slot of ALL_TIME_SLOTS) {
      if (
        isSlotInAvailabilityWindow(y, mo, d, slot) &&
        !isSlotTooSoon(y, mo, d, slot)
      ) {
        const { hour24, minute } = parseSlot(slot);
        const slotDate = new Date(y, mo, d, hour24, minute);
        const diffMs = slotDate.getTime() - now.getTime();
        const diffH = Math.floor(diffMs / 3600000);
        const diffM = Math.floor((diffMs % 3600000) / 60000);
        if (diffH > 0) return `${diffH}h ${diffM}m`;
        return `${diffM}m`;
      }
    }
  }
  return "";
}

// ─── Calendar ────────────────────────────────────────────────────────────────

function MonthCalendar({
  year,
  month,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const today = new Date();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ key: string; day: number | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: `pad-${i}`, day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ key: String(d), day: d });

  const isPast = (day: number) => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date < now;
  };

  /** Check if a day has at least one available slot */
  const hasAvailableSlots = (day: number): boolean => {
    if (isPast(day)) return false;
    return ALL_TIME_SLOTS.some(
      (slot) =>
        isSlotInAvailabilityWindow(year, month, day, slot) &&
        !isSlotTooSoon(year, month, day, slot),
    );
  };

  const isWeekend = (day: number) => {
    const dow = new Date(year, month, day).getDay();
    return dow === 0 || dow === 6;
  };

  const isToday = (day: number) => {
    return (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-foreground">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ key, day }) => {
          if (!day) return <div key={key} />;

          const past = isPast(day);
          const available = !past && hasAvailableSlots(day);
          const selected = selectedDay === day;
          const weekend = isWeekend(day);
          const todayDay = isToday(day);

          return (
            <button
              type="button"
              key={key}
              data-ocid="appointments.toggle"
              disabled={past || !available}
              onClick={() => onSelectDay(day)}
              className={[
                "h-9 w-full rounded-lg text-sm font-medium transition-all",
                selected
                  ? "bg-amber-500 text-white font-bold shadow-sm"
                  : available && weekend
                    ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                    : available
                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      : "text-muted-foreground/40 cursor-not-allowed",
                todayDay && !selected ? "ring-1 ring-primary/40" : "",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500/20" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500" />
          Selected
        </span>
      </div>
    </div>
  );
}

// ─── Confirmation Card ───────────────────────────────────────────────────────

function ConfirmationCard({
  sessionId,
  dateLabel,
  timeSlot,
  address,
  document,
  totalDue,
  notaryType,
}: {
  sessionId: string;
  dateLabel: string;
  timeSlot: string;
  address: string;
  document: string;
  totalDue: number;
  notaryType: NotaryType;
}) {
  const meetingLink = `https://meet.docfill.ai/session/${sessionId}`;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(meetingLink)
      .then(() => toast.success("Meeting link copied!"));
  };

  const sessionLabel =
    notaryType === "ron" ? "Remote Online Session" : "Mobile Notary Session";
  const badgeClass =
    notaryType === "ron"
      ? "bg-violet-500/15 text-violet-600 border border-violet-500/30"
      : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, type: "spring", bounce: 0.3 }}
    >
      <Card className="bento-card border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-emerald-600 text-lg">
                Appointment Confirmed
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Your notary session is booked
              </p>
            </div>
            <span
              className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}
            >
              {sessionLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays size={14} className="text-emerald-500" />
              <span>{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock size={14} className="text-emerald-500" />
              <span>{timeSlot}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin size={14} className="text-emerald-500" />
              <span className="truncate">{address}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Video size={14} className="text-emerald-500" />
              <span className="truncate">{document}</span>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Meeting Link
            </p>
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
              <code className="flex-1 text-xs text-primary font-mono truncate">
                {meetingLink}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Copy meeting link"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="text-foreground">{formatCurrency(totalDue)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Notary Type Selection Cards ─────────────────────────────────────────────

function NotaryTypeSelector({
  onSelect,
}: {
  onSelect: (type: "ron" | "mobile") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-foreground">
          How would you like to meet your notary?
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose the notarization method that works best for you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
        {/* RON Card */}
        <motion.button
          type="button"
          data-ocid="appointments.toggle"
          onClick={() => onSelect("ron")}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="group relative text-left rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-blue-500/5 to-transparent p-6 hover:border-violet-500/60 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] transition-all duration-300 cursor-pointer"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative space-y-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
              <Video size={22} className="text-violet-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-foreground text-lg">
                  Online Notary
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-600 border border-violet-500/30">
                  FASTEST
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Remote Online Notarization
              </p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Notarial Act Fee</span>
                <span className="font-semibold text-foreground">$25.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Platform &amp; ID Verification
                </span>
                <span className="font-semibold text-foreground">$25.00</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-violet-600">
                  $50.00
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-violet-600 font-medium">
              <Video size={12} />
              <span>Secure video session from home</span>
            </div>
          </div>
        </motion.button>

        {/* Mobile Notary Card */}
        <motion.button
          type="button"
          data-ocid="appointments.toggle"
          onClick={() => onSelect("mobile")}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="group relative text-left rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all duration-300 cursor-pointer"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
              <MapPin size={22} className="text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-foreground text-lg">
                  Mobile Notary
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                  IN-PERSON
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Mobile Notary (Concierge Service)
              </p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Notarial Act Fee</span>
                <span className="font-semibold text-foreground">$10.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Travel Surcharge</span>
                <span className="font-semibold text-foreground">+ Dynamic</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-emerald-600">
                  $10 + Travel
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
              <MapPin size={12} />
              <span>Notary comes to your location</span>
            </div>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AppointmentsPage() {
  const { actor } = useActor();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Notary type selection
  const [notaryType, setNotaryType] = useState<NotaryType>(null);

  // Notary base address (persistent)
  const [baseAddress, setBaseAddress] = useState(
    () => localStorage.getItem(LS_KEY_BASE_ADDR) ?? DEFAULT_BASE_ADDRESS,
  );

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Form state
  const [appointmentAddress, setAppointmentAddress] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");
  const [idMethod, setIdMethod] = useState<IdMethod>("Driver's License");
  const [signerName, setSignerName] = useState("");

  // Fee calculation (mobile only)
  const [distance, setDistance] = useState<number | null>(null);
  const travelFee = distance !== null ? calculateTravelFee(distance) : 0;
  const zoneLabel =
    distance !== null
      ? getZoneLabel(distance)
      : "Zone 1 — Local Service (Included)";

  // Computed totals
  const totalDue =
    notaryType === "ron"
      ? RON_ACT_FEE + RON_PLATFORM_FEE
      : MOBILE_ACT_FEE + travelFee;

  // Checkout state
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [confirmedSession, setConfirmedSession] = useState<{
    sessionId: string;
    dateLabel: string;
    timeSlot: string;
    address: string;
    document: string;
    totalDue: number;
    notaryType: NotaryType;
  } | null>(null);

  // Next available slot label (shown when no available slots today)
  const [nextAvailableLabel] = useState(() => getNextAvailableLabel());
  const [countdown, setCountdown] = useState(() => getCountdownToNextSlot());

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdownToNextSlot());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if current time is outside all availability windows
  const isOutsideHours = useMemo(() => {
    const now = new Date();
    const etH = getETHour(now);
    const dow = now.getDay();
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend) return etH < WEEKEND_START_ET || etH >= WEEKEND_END_ET;
    return etH < WEEKDAY_START_ET || etH >= WEEKDAY_END_ET;
  }, []);

  // Handle return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isNotaryReturn = params.get("notary_session") === "true";
    const sessionId = params.get("session_id");

    if (isNotaryReturn && sessionId) {
      window.history.replaceState({}, "", window.location.pathname);
      const pending = localStorage.getItem("pendingNotaryBooking");
      if (pending) {
        try {
          const data = JSON.parse(pending);
          const confirmedData = { ...data, sessionId: generateSessionId() };
          setConfirmedSession(confirmedData);
          localStorage.removeItem("pendingNotaryBooking");

          // Auto-journal entry
          const entry = {
            id: crypto.randomUUID(),
            name: data.signerName || "N/A",
            date: new Date().toISOString(),
            actType: data.notaryType === "ron" ? "RON" : "Mobile Notary",
            idMethod: data.idMethod ?? "Driver's License",
            fee: data.totalDue,
          };
          const existing = JSON.parse(
            localStorage.getItem("docfill_journal_entries") ?? "[]",
          );
          existing.push(entry);
          localStorage.setItem(
            "docfill_journal_entries",
            JSON.stringify(existing),
          );

          toast.success("Notary session confirmed and paid!");
        } catch {
          toast.success("Payment received! Your session is confirmed.");
        }
      } else {
        toast.success("Payment received! Your session is confirmed.");
      }
    }
  }, []);

  const handleBaseAddressChange = (val: string) => {
    setBaseAddress(val);
    localStorage.setItem(LS_KEY_BASE_ADDR, val);
    if (appointmentAddress.trim()) {
      const d = estimateDistance(val, appointmentAddress);
      setDistance(d);
    }
  };

  const handleAppointmentAddressBlur = useCallback(() => {
    if (appointmentAddress.trim()) {
      const d = estimateDistance(baseAddress, appointmentAddress);
      setDistance(d);
    } else {
      setDistance(null);
    }
  }, [appointmentAddress, baseAddress]);

  const handleAppointmentAddressChange = (val: string) => {
    setAppointmentAddress(val);
    if (val.trim().length > 5) {
      const d = estimateDistance(baseAddress, val);
      setDistance(d);
    } else {
      setDistance(null);
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  const dateLabel = useMemo(() => {
    if (!selectedDay) return "";
    const d = new Date(calYear, calMonth, selectedDay);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [calYear, calMonth, selectedDay]);

  // Slots filtered for the selected day's availability window
  const availableSlotsForDay = useMemo(() => {
    if (selectedDay === null) return [];
    return ALL_TIME_SLOTS.filter((slot) =>
      isSlotInAvailabilityWindow(calYear, calMonth, selectedDay, slot),
    );
  }, [calYear, calMonth, selectedDay]);

  const canCheckout =
    notaryType === "ron"
      ? selectedDay !== null && selectedSlot !== null && selectedDocument !== ""
      : selectedDay !== null &&
        selectedSlot !== null &&
        appointmentAddress.trim().length > 0 &&
        selectedDocument !== "";

  const handleCheckout = async () => {
    if (!actor || !canCheckout) return;
    setIsCheckingOut(true);

    const pending = {
      dateLabel,
      timeSlot: `${selectedSlot} (${userTimezone})`,
      address:
        notaryType === "ron" ? "Remote Online Session" : appointmentAddress,
      document: selectedDocument,
      totalDue,
      notaryType,
      signerName,
      idMethod,
    };
    localStorage.setItem("pendingNotaryBooking", JSON.stringify(pending));

    let items: Array<{
      productName: string;
      currency: string;
      quantity: bigint;
      priceInCents: bigint;
      productDescription: string;
    }>;

    if (notaryType === "ron") {
      items = [
        {
          productName: "Notarial Act (Remote)",
          currency: "usd",
          quantity: 1n,
          priceInCents: BigInt(RON_ACT_FEE * 100),
          productDescription:
            "State-mandated Notarial Act fee (FL Stat. §117.05)",
        },
        {
          productName: "Digital Platform & Identity Verification Fee",
          currency: "usd",
          quantity: 1n,
          priceInCents: BigInt(RON_PLATFORM_FEE * 100),
          productDescription: "Secure video hosting and credential analysis",
        },
      ];
    } else {
      items = [
        {
          productName: "Notarial Act (Mobile)",
          currency: "usd",
          quantity: 1n,
          priceInCents: BigInt(MOBILE_ACT_FEE * 100),
          productDescription:
            "State-mandated Notarial Act fee (FL Stat. §117.05)",
        },
      ];
      if (travelFee > 0) {
        items.push({
          productName: "Travel & Convenience Surcharge",
          currency: "usd",
          quantity: 1n,
          priceInCents: BigInt(Math.round(travelFee * 100)),
          productDescription: `Mobile notary travel fee (${distance ?? 0} mi — ${zoneLabel})`,
        });
      }
    }

    try {
      const successUrl = `${window.location.href}${window.location.search ? "&" : "?"}notary_session=true`;
      const cancelUrl = window.location.href;
      const url = await actor.createCheckoutSession(
        items,
        successUrl,
        cancelUrl,
      );
      window.location.href = url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setIsCheckingOut(false);
      localStorage.removeItem("pendingNotaryBooking");
    }
  };

  const subtitleText =
    notaryType === "ron"
      ? "Remote Online Notarization"
      : notaryType === "mobile"
        ? "Mobile Notary (Concierge Service)"
        : "Schedule a Notary Session";

  const subtitleColor =
    notaryType === "ron"
      ? "text-violet-500"
      : notaryType === "mobile"
        ? "text-emerald-500"
        : "text-muted-foreground";

  // Availability info for selected day
  const selectedDayIsWeekend =
    selectedDay !== null && isDayWeekend(calYear, calMonth, selectedDay);
  const availabilityHoursLabel = selectedDayIsWeekend
    ? "Available 9:00 AM – 9:00 PM ET"
    : "Available 6:00 PM – 10:00 PM ET";

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  Appointments
                </h1>
                {notaryType && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      notaryType === "ron"
                        ? "bg-violet-500/15 text-violet-600 border-violet-500/30"
                        : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                    }`}
                  >
                    {notaryType === "ron" ? "Online" : "Mobile"}
                  </motion.span>
                )}
              </div>
              <p className={`text-sm font-medium ${subtitleColor}`}>
                {subtitleText}
              </p>
            </div>

            {/* Change type button */}
            {notaryType && (
              <motion.button
                type="button"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                data-ocid="appointments.secondary_button"
                onClick={() => {
                  setNotaryType(null);
                  setSelectedDay(null);
                  setSelectedSlot(null);
                  setAppointmentAddress("");
                  setSelectedDocument("");
                  setDistance(null);
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent"
              >
                <ChevronLeft size={14} />
                Change
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Next Available Banner — shown when outside notary hours */}
        {isOutsideHours && !confirmedSession && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <Timer size={16} className="text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-600">
                Notary currently unavailable
              </p>
              {nextAvailableLabel && (
                <p className="text-xs text-muted-foreground">
                  Next available: <strong>{nextAvailableLabel}</strong> (in{" "}
                  {countdown})
                </p>
              )}
            </div>
            <AlertCircle size={14} className="text-amber-500/60 shrink-0" />
          </motion.div>
        )}

        {/* Confirmation card (post-Stripe return) */}
        <AnimatePresence>
          {confirmedSession && (
            <ConfirmationCard
              sessionId={confirmedSession.sessionId}
              dateLabel={confirmedSession.dateLabel}
              timeSlot={confirmedSession.timeSlot}
              address={confirmedSession.address}
              document={confirmedSession.document}
              totalDue={confirmedSession.totalDue}
              notaryType={confirmedSession.notaryType}
            />
          )}
        </AnimatePresence>

        {/* Type selector or booking flow */}
        <AnimatePresence mode="wait">
          {notaryType === null ? (
            <NotaryTypeSelector key="selector" onSelect={setNotaryType} />
          ) : (
            <motion.div
              key="booking"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Dispatch Settings (mobile only) */}
                  {notaryType === "mobile" && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                    >
                      <Card className="bento-card">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <MapPin size={15} className="text-primary" />
                            Notary Dispatch Address
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Input
                            data-ocid="appointments.input"
                            value={baseAddress}
                            onChange={(e) =>
                              handleBaseAddressChange(e.target.value)
                            }
                            placeholder="Enter notary base address…"
                            className="text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Travel fees are calculated from this address.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Calendar */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="bento-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <CalendarDays size={15} className="text-primary" />
                          Select a Date
                          <span className="ml-auto text-xs text-muted-foreground font-normal">
                            Mon–Fri: 6–10 PM ET · Sat–Sun: 9 AM–9 PM ET
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MonthCalendar
                          year={calYear}
                          month={calMonth}
                          selectedDay={selectedDay}
                          onSelectDay={(day) => {
                            setSelectedDay(day);
                            setSelectedSlot(null);
                          }}
                          onPrevMonth={prevMonth}
                          onNextMonth={nextMonth}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Time Slots */}
                  <AnimatePresence>
                    {selectedDay !== null && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="bento-card">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Clock size={15} className="text-primary" />
                              Select a Time Slot
                              <span className="ml-auto text-xs text-muted-foreground font-normal">
                                {availabilityHoursLabel}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {availableSlotsForDay.length === 0 ? (
                              <p
                                data-ocid="appointments.empty_state"
                                className="text-sm text-muted-foreground text-center py-4"
                              >
                                No available slots for this date.
                              </p>
                            ) : (
                              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                {availableSlotsForDay.map((slot) => {
                                  const tooSoon = isSlotTooSoon(
                                    calYear,
                                    calMonth,
                                    selectedDay,
                                    slot,
                                  );
                                  const isSelected = selectedSlot === slot;
                                  return (
                                    <button
                                      type="button"
                                      key={slot}
                                      data-ocid="appointments.toggle"
                                      disabled={tooSoon}
                                      onClick={() =>
                                        !tooSoon && setSelectedSlot(slot)
                                      }
                                      className={[
                                        "px-2 py-2 rounded-lg text-xs font-medium transition-all border",
                                        isSelected
                                          ? "bg-amber-500 text-white border-amber-500 shadow-sm font-bold"
                                          : tooSoon
                                            ? "bg-muted/50 text-muted-foreground/40 border-border/50 cursor-not-allowed line-through"
                                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20",
                                      ].join(" ")}
                                    >
                                      {slot}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {/* Lead-time disclaimer */}
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                              <InfoIcon size={11} className="text-amber-500" />
                              To ensure a high-quality experience, all
                              appointments require a 2-hour advance booking.
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Appointment Details */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Card className="bento-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">
                          Appointment Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Appointment address (mobile only) */}
                        {notaryType === "mobile" && (
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="appt-address"
                              className="text-xs font-medium"
                            >
                              Your Appointment Address
                            </Label>
                            <Input
                              id="appt-address"
                              data-ocid="appointments.input"
                              value={appointmentAddress}
                              onChange={(e) =>
                                handleAppointmentAddressChange(e.target.value)
                              }
                              onBlur={handleAppointmentAddressBlur}
                              placeholder="e.g. 456 Main St, Miami, FL 33101"
                              className="text-sm"
                            />
                            {distance !== null && (
                              <p className="text-xs text-muted-foreground">
                                Estimated distance:{" "}
                                <strong className="text-foreground">
                                  {distance} miles
                                </strong>
                              </p>
                            )}
                          </div>
                        )}

                        {/* RON info panel */}
                        {notaryType === "ron" && (
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                            <Video
                              size={16}
                              className="text-violet-500 mt-0.5 shrink-0"
                            />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Your session will take place via secure video
                              call. A unique meeting link will be generated
                              after payment and sent to your profile email.
                            </p>
                          </div>
                        )}

                        {/* Signer name */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="signer-name"
                            className="text-xs font-medium"
                          >
                            Signer Full Name
                          </Label>
                          <Input
                            id="signer-name"
                            data-ocid="appointments.input"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            placeholder="Full legal name of the signer"
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Select Document to Notarize
                          </Label>
                          <Select
                            value={selectedDocument}
                            onValueChange={setSelectedDocument}
                          >
                            <SelectTrigger
                              data-ocid="appointments.select"
                              className="text-sm"
                            >
                              <SelectValue placeholder="Choose a document…" />
                            </SelectTrigger>
                            <SelectContent>
                              {MOCK_DOCUMENTS.map((doc) => (
                                <SelectItem key={doc} value={doc}>
                                  {doc}
                                </SelectItem>
                              ))}
                              <SelectItem value="__upload__">
                                📎 Upload a document
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* ID Method selector */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Identification Method
                          </Label>
                          <Select
                            value={idMethod}
                            onValueChange={(v) => setIdMethod(v as IdMethod)}
                          >
                            <SelectTrigger
                              data-ocid="appointments.id_method.select"
                              className="text-sm"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Driver's License">
                                Driver&apos;s License
                              </SelectItem>
                              <SelectItem value="Passport">Passport</SelectItem>
                              <SelectItem value="Credible Witness">
                                Credible Witness
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-muted-foreground">
                            How the signer&apos;s identity will be verified
                            during the session.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Right column: Fee Breakdown + Pay Button */}
                <div className="space-y-5">
                  {/* Booking Summary */}
                  {(selectedDay || selectedSlot) && (
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="bento-card">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">
                            Booking Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {selectedDay && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CalendarDays
                                size={13}
                                className="text-emerald-500"
                              />
                              <span>{dateLabel}</span>
                            </div>
                          )}
                          {selectedSlot && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock size={13} className="text-amber-500" />
                              <span>
                                {selectedSlot} ({userTimezone})
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Fee Breakdown */}
                  <motion.div
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card
                      className={`bento-card ${
                        notaryType === "ron"
                          ? "border-violet-500/20"
                          : "border-emerald-500/20"
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">
                          Fee Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {notaryType === "ron" ? (
                          <>
                            {/* RON fees */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="space-y-0.5">
                                <span className="text-muted-foreground">
                                  Notarial Act Fee
                                </span>
                                <p className="text-[10px] text-muted-foreground/70">
                                  FL Stat. §117.05
                                </p>
                              </div>
                              <span className="font-medium text-foreground">
                                {formatCurrency(RON_ACT_FEE)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Digital Platform &amp; Identity Verification Fee
                              </span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(RON_PLATFORM_FEE)}
                              </span>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                Total Due
                              </span>
                              <span className="text-lg font-bold text-violet-600">
                                {formatCurrency(RON_ACT_FEE + RON_PLATFORM_FEE)}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
                              State law limits the notary fee to $25; additional
                              costs cover secure video hosting and credential
                              analysis.
                            </p>
                          </>
                        ) : (
                          <>
                            {/* Mobile fees */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="space-y-0.5">
                                <span className="text-muted-foreground">
                                  Notarial Act Fee
                                </span>
                                <p className="text-[10px] text-muted-foreground/70">
                                  FL Stat. §117.05
                                </p>
                              </div>
                              <span className="font-medium text-foreground">
                                {formatCurrency(MOBILE_ACT_FEE)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">
                                  Travel &amp; Convenience Surcharge
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                      aria-label="Travel fee info"
                                    >
                                      <InfoIcon size={13} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="left"
                                    className="max-w-[220px] text-xs"
                                  >
                                    This fee covers fuel, vehicle wear, and the
                                    notary&apos;s transit time to ensure a
                                    prompt mobile service.
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <span
                                className={
                                  travelFee > 0
                                    ? "font-medium text-amber-600"
                                    : "text-muted-foreground"
                                }
                              >
                                {travelFee > 0
                                  ? formatCurrency(travelFee)
                                  : "Included"}
                              </span>
                            </div>

                            <div className="rounded-lg bg-muted/50 px-3 py-2">
                              <p className="text-xs text-muted-foreground">
                                {zoneLabel}
                              </p>
                              {distance !== null && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {distance} miles estimated
                                </p>
                              )}
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                Total Due
                              </span>
                              <span className="text-lg font-bold text-foreground">
                                {formatCurrency(MOBILE_ACT_FEE + travelFee)}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
                              Total includes a state-mandated Notarial Act fee
                              and a separate Travel &amp; Convenience surcharge.
                              Travel fees are calculated based on the distance
                              from our central dispatch to your location.
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Pay Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      data-ocid="appointments.primary_button"
                      className={`w-full gap-2 text-primary-foreground shadow-primary-glow py-6 text-base font-semibold ${
                        notaryType === "ron"
                          ? "bg-violet-600 hover:bg-violet-700"
                          : "bg-primary hover:bg-primary/90"
                      }`}
                      disabled={!canCheckout || isCheckingOut || !actor}
                      onClick={handleCheckout}
                    >
                      {isCheckingOut ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Redirecting to Stripe…
                        </>
                      ) : (
                        <>Confirm &amp; Pay — {formatCurrency(totalDue)}</>
                      )}
                    </Button>
                    {!canCheckout && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {notaryType === "ron"
                          ? "Select a date, time & document to continue"
                          : "Select a date, time, address & document to continue"}
                      </p>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
