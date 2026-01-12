import type { BinCollection, CalendarOptions } from "../types";

// Bin type to emoji mapping
const BIN_EMOJIS: Record<string, string> = {
  refuse: "🗑️",
  recycling: "♻️",
  garden: "🌿",
  food: "🍎",
  glass: "🫙",
  paper: "📄",
  plastic: "🥤",
  general: "🗑️",
  black: "🗑️",
  green: "🌿",
  blue: "♻️",
  brown: "🍂",
};

function getEmoji(binType: string): string {
  const lower = binType.toLowerCase();
  for (const [key, emoji] of Object.entries(BIN_EMOJIS)) {
    if (lower.includes(key)) {
      return emoji;
    }
  }
  return "🗑️";
}

// Format date as YYYYMMDD for iCal
function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

// Format datetime as YYYYMMDDTHHMMSSZ
function formatDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Generate a unique ID for an event
function generateUID(date: string, binType: string, domain: string): string {
  const hash = binType.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `${date}-${hash}@${domain}`;
}

// Escape special characters in iCal text
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Fold long lines (iCal requires lines < 75 octets)
function foldLine(line: string): string {
  const maxLength = 73; // Allow room for CRLF
  if (line.length <= maxLength) {
    return line;
  }

  const parts: string[] = [];
  let remaining = line;

  while (remaining.length > maxLength) {
    parts.push(remaining.slice(0, maxLength));
    remaining = " " + remaining.slice(maxLength); // Continuation line starts with space
  }
  parts.push(remaining);

  return parts.join("\r\n");
}

interface GroupedCollection {
  date: string;
  bins: string[];
}

function groupByDate(bins: BinCollection[]): GroupedCollection[] {
  const groups: Record<string, string[]> = {};

  for (const bin of bins) {
    if (!groups[bin.date]) {
      groups[bin.date] = [];
    }
    groups[bin.date].push(bin.type);
  }

  return Object.entries(groups)
    .map(([date, bins]) => ({ date, bins }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function generateICal(
  bins: BinCollection[],
  options: CalendarOptions,
  domain: string
): string {
  const now = new Date();
  const dtstamp = formatDateTime(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Bin Collection Service//${domain}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.name)}`,
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:P1D",
  ];

  // Add timezone definition
  lines.push(
    "BEGIN:VTIMEZONE",
    "TZID:Europe/London",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0000",
    "TZOFFSETTO:+0100",
    "TZNAME:BST",
    "DTSTART:19700329T010000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0000",
    "TZNAME:GMT",
    "DTSTART:19701025T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE"
  );

  // Generate events
  if (options.group) {
    // Group same-day collections
    const grouped = groupByDate(bins);

    for (const group of grouped) {
      const emojis = group.bins.map(getEmoji).join(" ");
      const summary = `${emojis} Bin Collection`;
      const description = `Put out: ${group.bins.join(", ")}`;
      const uid = generateUID(group.date, group.bins.join("-"), domain);

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${formatDate(group.date)}`,
        `SUMMARY:${escapeText(summary)}`,
        `DESCRIPTION:${escapeText(description)}`,
        "TRANSP:TRANSPARENT"
      );

      // Add alarm if reminder is set
      if (options.reminder) {
        const [hours, minutes] = options.reminder.split(":").map(Number);
        // Calculate trigger time: day before at specified time
        // TRIGGER is relative to DTSTART, which is midnight
        // So -P0DT${24-hours}H${60-minutes}M means "hours before midnight"
        const triggerHours = 24 - hours;
        const triggerMinutes = 60 - minutes;

        lines.push(
          "BEGIN:VALARM",
          `TRIGGER:-P0DT${triggerHours}H${triggerMinutes}M`,
          "ACTION:DISPLAY",
          `DESCRIPTION:Bin collection tomorrow: ${group.bins.join(", ")}`,
          "END:VALARM"
        );
      }

      lines.push("END:VEVENT");
    }
  } else {
    // Individual events per bin type
    for (const bin of bins) {
      const emoji = getEmoji(bin.type);
      const summary = `${emoji} ${bin.type}`;
      const description = `Put out: ${bin.type}`;
      const uid = generateUID(bin.date, bin.type, domain);

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${formatDate(bin.date)}`,
        `SUMMARY:${escapeText(summary)}`,
        `DESCRIPTION:${escapeText(description)}`,
        "TRANSP:TRANSPARENT"
      );

      if (options.reminder) {
        const [hours, minutes] = options.reminder.split(":").map(Number);
        const triggerHours = 24 - hours;
        const triggerMinutes = 60 - minutes;

        lines.push(
          "BEGIN:VALARM",
          `TRIGGER:-P0DT${triggerHours}H${triggerMinutes}M`,
          "ACTION:DISPLAY",
          `DESCRIPTION:${bin.type} collection tomorrow`,
          "END:VALARM"
        );
      }

      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");

  // Join with CRLF and fold long lines
  return lines.map(foldLine).join("\r\n");
}
