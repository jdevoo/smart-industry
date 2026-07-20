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
