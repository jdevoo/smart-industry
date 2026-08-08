/**
 * Date and Time utilities for IMES Platform
 */

export function isLeapYear(year = new Date().getFullYear()): boolean {
  return year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0);
}

export function dateFromDays(day: number, year = new Date().getFullYear()): string {
  const date = new Date(year, 0); // Initialize at Year-01-01
  date.setDate(day);
  return dateFromTimeStamp(date.getTime());
}

export function dateFromTimeStamp(timestamp: number): string {
  const date = new Date(timestamp);
  let dd: string | number = date.getDate();
  let mm: string | number = date.getMonth() + 1;
  const yyyy = date.getFullYear();
  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;
  return `${yyyy}-${mm}-${dd}`;
}

export function displayDateFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  let dd: string | number = date.getDate();
  let mm: string | number = date.getMonth() + 1;
  const yyyy = date.getFullYear();
  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;
  return `${dd}/${mm}/${yyyy}`;
}

export function daysOfTheYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime() + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Formats seconds into HH:MM:SS format (e.g. 01:15:30)
 */
export function formatDurationHMS(seconds?: number): string {
  if (!seconds || seconds < 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor((seconds % 3600) % 60);
  const pad = (num: number) => ('0' + num).slice(-2);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Formats seconds into h m format (e.g. 1h 15m)
 */
export function formatDurationHM(seconds?: number): string {
  if (!seconds || seconds < 0) return '0h 0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

/**
 * Formats a timestamp (in seconds) to a time string: HH:MM:SS
 */
export function formatTimeOnly(timestampInSeconds?: number): string {
  if (!timestampInSeconds) return 'N/A';
  const date = new Date(timestampInSeconds * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Formats a timestamp (in seconds) to a combined time and date: HH:MM:SS DD/MM/YYYY
 */
export function formatTimeAndDate(timestampInSeconds?: number): string {
  if (!timestampInSeconds) return 'N/A';
  const date = new Date(timestampInSeconds * 1000);
  let dd: string | number = date.getDate();
  let mm: string | number = date.getMonth() + 1;
  const yyyy = date.getFullYear();
  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${timeStr} ${dd}/${mm}/${yyyy}`;
}
