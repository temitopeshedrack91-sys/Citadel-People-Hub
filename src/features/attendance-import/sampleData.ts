/**
 * Sample Biometric Export Data
 * Citadel People Hub
 *
 * Provides realistic ZKTeco / biometric hardware device export data
 * for demonstrating and verifying the idempotent import and daily summary pipeline.
 */

export const SAMPLE_BIOMETRIC_EXPORT_CSV = `Staff ID,Timestamp,Punch Direction
0004,2026-10-29 07:48:12,IN
0004,2026-10-29 12:30:45,OUT
0004,2026-10-29 13:15:10,IN
0004,2026-10-29 17:06:33,OUT
CGCC-001,2026-10-29 08:02:15,IN
CGCC-001,2026-10-29 17:35:40,OUT
CGCC-002,2026-10-29 07:55:00,IN
CGCC-002,2026-10-29 18:10:22,OUT
CGCC-008,2026-10-29 08:12:00,IN
CGCC-008,2026-10-29 16:55:10,OUT
CGCC-031,2026-10-29 08:05:44,IN
CGCC-031,2026-10-29 17:15:00,OUT
CGCC-072,2026-10-29 08:22:10,IN
CGCC-072,2026-10-29 17:40:00,OUT
0004,2026-10-28 07:50:00,IN
0004,2026-10-28 17:02:10,OUT
CGCC-001,2026-10-28 08:10:00,IN
CGCC-001,2026-10-28 17:20:00,OUT
CGCC-002,2026-10-28 08:00:15,IN
CGCC-002,2026-10-28 18:05:30,OUT
`;

/**
 * Initiates a browser download of the sample ZKTeco biometric export file.
 */
export function downloadSampleBiometricCsv(): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([SAMPLE_BIOMETRIC_EXPORT_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'citadel_zkteco_sample_export.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
