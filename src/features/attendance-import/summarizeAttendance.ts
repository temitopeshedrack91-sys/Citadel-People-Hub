/**
 * Daily attendance summary
 * Citadel People Hub
 *
 * Punches are grouped by local calendar date, not by shift. A night shift that
 * starts on 18 September and ends on 19 September therefore produces two daily
 * rows, each with its own first and last punch.
 */

import {
  DailyAttendanceSummary,
  MatchedPunch,
} from './types';
import { countPunchDirections } from './staffMatcher';

export function summarizeDailyAttendance(
  matchedPunches: MatchedPunch[]
): DailyAttendanceSummary[] {
  const groups = new Map<string, MatchedPunch[]>();

  for (const punch of matchedPunches) {
    const key = `${punch.employeeId}|${punch.date}`;
    const group = groups.get(key);
    if (group) group.push(punch);
    else groups.set(key, [punch]);
  }

  const summaries: DailyAttendanceSummary[] = [];

  groups.forEach((punches, key) => {
    const ordered = [...punches].sort((a, b) => {
      const byTimestamp = a.timestamp.localeCompare(b.timestamp);
      if (byTimestamp !== 0) return byTimestamp;
      return a.direction.localeCompare(b.direction);
    });

    const first = ordered[0];
    const last = ordered[ordered.length - 1];

    summaries.push({
      id: key,
      employeeId: first.employeeId,
      employeeStaffId: first.employeeStaffId,
      employeeName: first.employeeName,
      entityName: first.entityName,
      departmentName: first.departmentName,
      date: first.date,
      clockInTime: first.time,
      clockOutTime: last.time,
      firstPunchAt: first.timestamp,
      lastPunchAt: last.timestamp,
      punchCount: ordered.length,
      punchDirections: countPunchDirections(ordered),
      punches: ordered,
    });
  });

  return summaries.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return a.employeeName.localeCompare(b.employeeName);
  });
}

export const summarizeAttendance = summarizeDailyAttendance;
