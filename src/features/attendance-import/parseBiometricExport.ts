/**
 * Biometric export parser
 * Citadel People Hub
 *
 * ASSUMPTIONS (adjust this module when a real device export is available):
 * - The export is delimited text: CSV, TSV, semicolon, or pipe separated.
 * - The file has a header row. Headerless files are treated as
 *   [device/staff ID, timestamp, punch direction?].
 * - Device IDs are text. Leading zeros must be preserved by the export.
 * - Timestamps are the local wall-clock time on the device (Africa/Lagos, WAT,
 *   no daylight saving). A timezone suffix is ignored, not converted.
 * - Ambiguous DD/MM vs MM/DD dates are read as day-first (DD/MM/YYYY).
 * - ZKTeco status codes are interpreted as 0/3/4 = in and 1/2/5 = out.
 *   If the export has no direction column every punch gets "unknown".
 */

import {
  BiometricParseResult,
  BiometricPunch,
  PunchDirection,
  SkippedExportRow,
} from './types';

const DELIMITER_CANDIDATES = [',', '\t', ';', '|'];

const STAFF_HEADERS = [
  'staffid',
  'staffcode',
  'staffno',
  'staffnumber',
  'employeeid',
  'employeeno',
  'employeenumber',
  'deviceid',
  'deviceuserid',
  'userid',
  'user',
  'userno',
  'pin',
  'enrollid',
  'enrollno',
  'enrollnumber',
  'personid',
  'acno',
  'acnumber',
  'no',
  'id',
];

const TIMESTAMP_HEADERS = [
  'timestamp',
  'datetime',
  'punchtime',
  'punchdatetime',
  'attendancetime',
  'attendancedatetime',
  'clocktime',
  'logtime',
  'dateandtime',
];

const DATE_HEADERS = ['date', 'punchdate', 'attendancedate', 'logdate', 'day'];
const TIME_HEADERS = ['time', 'clocktime', 'punchtime', 'logtime'];
const DIRECTION_HEADERS = [
  'direction',
  'punchdirection',
  'punchtype',
  'punchstate',
  'inout',
  'state',
  'status',
  'attstate',
  'type',
];

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

function parseTimePart(value: string): { hour: number; minute: number; second: number } | null {
  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([ap]m)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  const meridiem = (match[4] || '').toLowerCase();

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridiem === 'pm' ? 12 : 0);
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    return null;
  }
  return { hour, minute, second };
}

function buildTimestamp(
  year: number,
  month: number,
  day: number,
  time: { hour: number; minute: number; second: number } | null
): string | null {
  if (!isValidDateParts(year, month, day)) return null;
  const clock = time || { hour: 0, minute: 0, second: 0 };
  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(clock.hour)}:${pad2(clock.minute)}:${pad2(clock.second)}`;
}

/**
 * Parses the wall-clock timestamp exactly as written by the device.
 * Timezone offsets are deliberately ignored so a 23:59 punch stays on that date.
 */
export function parseDeviceTimestamp(rawValue: string): string | null {
  const raw = rawValue
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return null;

  const withoutZone = raw.replace(/\s*(?:Z|[+-]\d{2}:?\d{2})$/i, '').trim();

  const yearFirst = withoutZone.match(
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T]+(.+))?$/
  );
  if (yearFirst) {
    const time = yearFirst[4] ? parseTimePart(yearFirst[4]) : null;
    if (yearFirst[4] && !time) return null;
    return buildTimestamp(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]), time);
  }

  const dayFirst = withoutZone.match(
    /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T]+(.+))?$/
  );
  if (dayFirst) {
    const first = Number(dayFirst[1]);
    const second = Number(dayFirst[2]);
    const year = Number(dayFirst[3]);
    const time = dayFirst[4] ? parseTimePart(dayFirst[4]) : null;
    if (dayFirst[4] && !time) return null;

    let day = first;
    let month = second;
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    }
    return buildTimestamp(year, month, day, time);
  }

  const monthName = withoutZone.match(
    /^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s-]+(\d{4})(?:[ T]+(.+))?$/
  );
  if (monthName) {
    const month = MONTHS[monthName[2].toLowerCase()];
    if (!month) return null;
    const time = monthName[4] ? parseTimePart(monthName[4]) : null;
    if (monthName[4] && !time) return null;
    return buildTimestamp(Number(monthName[3]), month, Number(monthName[1]), time);
  }

  const monthNameFirst = withoutZone.match(
    /^([A-Za-z]{3,9})[\s-]+(\d{1,2}),?[\s-]+(\d{4})(?:[ T]+(.+))?$/
  );
  if (monthNameFirst) {
    const month = MONTHS[monthNameFirst[1].toLowerCase()];
    if (!month) return null;
    const time = monthNameFirst[4] ? parseTimePart(monthNameFirst[4]) : null;
    if (monthNameFirst[4] && !time) return null;
    return buildTimestamp(
      Number(monthNameFirst[3]),
      month,
      Number(monthNameFirst[2]),
      time
    );
  }

  return null;
}

/**
 * Maps a direction cell to in/out. Unknown values are kept as "unknown"
 * rather than dropping the punch, because the timestamp still counts.
 */
export function parsePunchDirection(rawValue?: string): PunchDirection {
  if (!rawValue) return 'unknown';
  const value = rawValue.trim().toLowerCase().replace(/\s+/g, '');
  if (!value) return 'unknown';

  if (
    /^(in|i|0|entry|checkin|check-in|clockin|clock-in|signin|sign-in|breakin|break-in|breakout|break-out|ot-in|otin)$/.test(
      value
    )
  ) {
    return value.includes('breakout') || value.includes('break-out') ? 'out' : 'in';
  }

  if (
    /^(out|o|1|exit|checkout|check-out|clockout|clock-out|signout|sign-out|ot-out|otout)$/.test(
      value
    )
  ) {
    return 'out';
  }

  if (/^\d+$/.test(value)) {
    const code = Number(value);
    if ([0, 3, 4].includes(code)) return 'in';
    if ([1, 2, 5].includes(code)) return 'out';
  }

  return 'unknown';
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) || '';
  let best = ',';
  let bestCount = -1;

  for (const delimiter of DELIMITER_CANDIDATES) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i += 1) {
      const char = firstLine[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === delimiter && !inQuotes) count += 1;
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((value) => value.trim().length > 0));
}

function findIndex(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

function rowToRaw(row: string[]): string {
  return row.join(' | ').trim();
}

export function parseBiometricExport(content: string): BiometricParseResult {
  const text = content.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const rows = parseDelimitedRows(text, delimiter);

  if (rows.length === 0) {
    return { punches: [], skippedRows: [], delimiter, hasHeader: false };
  }

  const headers = rows[0].map(normalizeHeader);
  const headerStaffIndex = findIndex(headers, STAFF_HEADERS);
  const headerTimestampIndex = findIndex(headers, TIMESTAMP_HEADERS);
  const headerDateIndex = findIndex(headers, DATE_HEADERS);
  const headerTimeIndex = findIndex(headers, TIME_HEADERS);
  const headerDirectionIndex = findIndex(headers, DIRECTION_HEADERS);

  const hasHeader =
    headerStaffIndex !== -1 &&
    (headerTimestampIndex !== -1 || headerDateIndex !== -1 || headerTimeIndex !== -1);

  const staffIndex = hasHeader ? headerStaffIndex : 0;
  const timestampIndex = hasHeader ? headerTimestampIndex : 1;
  const dateIndex = hasHeader ? headerDateIndex : -1;
  const timeIndex = hasHeader ? headerTimeIndex : -1;
  const directionIndex = hasHeader ? headerDirectionIndex : 2;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const punches: BiometricPunch[] = [];
  const skippedRows: SkippedExportRow[] = [];

  dataRows.forEach((row, index) => {
    const line = index + (hasHeader ? 2 : 1);
    const deviceId = (row[staffIndex] || '').trim();

    if (!deviceId) {
      skippedRows.push({ line, reason: 'Missing device/staff ID', raw: rowToRaw(row) });
      return;
    }

    let timestampValue = timestampIndex >= 0 ? (row[timestampIndex] || '').trim() : '';
    if (dateIndex >= 0 && timeIndex >= 0) {
      const dateValue = (row[dateIndex] || '').trim();
      const timeValue = (row[timeIndex] || '').trim();
      if (dateValue && timeValue) timestampValue = `${dateValue} ${timeValue}`;
    } else if (!timestampValue && dateIndex >= 0) {
      timestampValue = (row[dateIndex] || '').trim();
    }

    const timestamp = parseDeviceTimestamp(timestampValue);
    if (!timestamp) {
      skippedRows.push({
        line,
        reason: `Unrecognised timestamp "${timestampValue}"`,
        raw: rowToRaw(row),
      });
      return;
    }

    const rawDirection = directionIndex >= 0 ? (row[directionIndex] || '').trim() : undefined;

    punches.push({
      deviceId,
      timestamp,
      date: timestamp.slice(0, 10),
      time: timestamp.slice(11, 19),
      direction: parsePunchDirection(rawDirection),
      rawDirection: rawDirection || undefined,
      sourceLine: line,
    });
  });

  return { punches, skippedRows, delimiter, hasHeader };
}

export const parseAttendanceExport = parseBiometricExport;
