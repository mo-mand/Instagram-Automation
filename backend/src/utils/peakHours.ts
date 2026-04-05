import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Peak posting windows: [start hour, end hour] (24h format)
const PEAK_WINDOWS = [
  [7, 9],   // Morning: 7am - 9am
  [12, 14], // Noon: 12pm - 2pm
  [19, 21], // Evening: 7pm - 9pm
];

/**
 * Generate evenly-spaced posting slots within peak windows for a given day.
 * @param tz IANA timezone string e.g. "America/Toronto"
 * @param date The date to generate slots for (defaults to today)
 * @param count How many slots to generate (default 10)
 */
export function generateDaySlots(tz: string, date?: Date, count: number = 10): Date[] {
  const base = date ? dayjs(date).tz(tz) : dayjs().tz(tz);
  const dayStart = base.startOf('day');

  const allSlots: Date[] = [];

  for (const [startH, endH] of PEAK_WINDOWS) {
    const windowStart = dayStart.hour(startH).minute(0).second(0);
    const windowEnd = dayStart.hour(endH).minute(0).second(0);
    const windowMinutes = (endH - startH) * 60;

    // Place slots evenly within each window (at least 1 per window)
    const slotsPerWindow = Math.max(1, Math.round(count / PEAK_WINDOWS.length));
    const interval = Math.floor(windowMinutes / (slotsPerWindow + 1));

    for (let i = 1; i <= slotsPerWindow; i++) {
      const slot = windowStart.add(interval * i, 'minute');
      if (slot.isBefore(windowEnd)) {
        allSlots.push(slot.toDate());
      }
    }
  }

  return allSlots.slice(0, count);
}

/**
 * Find the next available slot that isn't already occupied.
 * @param occupiedSlots Dates already scheduled for today
 * @param tz Timezone
 * @param maxSlots Max posts per day
 * @returns Next available slot, or null if daily limit reached
 */
export function getNextAvailableSlot(
  occupiedSlots: Date[],
  tz: string,
  maxSlots: number
): Date | null {
  const now = dayjs().tz(tz);
  const slots = generateDaySlots(tz, now.toDate(), maxSlots);

  // Find first slot that isn't occupied AND is in the future
  for (const slot of slots) {
    const slotTime = dayjs(slot).tz(tz);
    if (slotTime.isAfter(now)) {
      const alreadyTaken = occupiedSlots.some(
        (occ) => Math.abs(dayjs(occ).diff(slotTime, 'minute')) < 30
      );
      if (!alreadyTaken) return slot;
    }
  }

  // All today's slots used — return first slot tomorrow
  const tomorrow = now.add(1, 'day');
  const tomorrowSlots = generateDaySlots(tz, tomorrow.toDate(), maxSlots);
  return tomorrowSlots[0] || null;
}
