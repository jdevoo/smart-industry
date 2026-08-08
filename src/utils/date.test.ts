import { describe, it, expect } from 'vitest';
import {
  isLeapYear,
  dateFromDays,
  dateFromTimeStamp,
  displayDateFromTimestamp,
  daysOfTheYear,
  formatDurationHMS,
  formatDurationHM,
  formatTimeOnly,
  formatTimeAndDate
} from './date.js';

describe('Date & Time Utilities', () => {
  describe('isLeapYear', () => {
    it('should correctly identify leap years', () => {
      expect(isLeapYear(2020)).toBe(true);
      expect(isLeapYear(2024)).toBe(true);
    });

    it('should correctly identify non-leap years', () => {
      expect(isLeapYear(2018)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(1900)).toBe(false); // Divisible by 100 but not 400
    });

    it('should default to the current year', () => {
      const currentYear = new Date().getFullYear();
      expect(isLeapYear()).toBe(isLeapYear(currentYear));
    });
  });

  describe('dateFromTimeStamp', () => {
    it('should format a timestamp into YYYY-MM-DD', () => {
      const ts = new Date(2026, 7, 8).getTime(); // August 8, 2026
      expect(dateFromTimeStamp(ts)).toBe('2026-08-08');
    });

    it('should pad single digits with leading zeros', () => {
      const ts = new Date(2026, 0, 5).getTime(); // Jan 5, 2026
      expect(dateFromTimeStamp(ts)).toBe('2026-01-05');
    });
  });

  describe('dateFromDays', () => {
    it('should calculate the calendar date string from day of year index', () => {
      // Day 1 of 2026
      expect(dateFromDays(1, 2026)).toBe('2026-01-01');
      // Day 32 of 2026 (Feb 1)
      expect(dateFromDays(32, 2026)).toBe('2026-02-01');
    });
  });

  describe('displayDateFromTimestamp', () => {
    it('should format a timestamp into DD/MM/YYYY', () => {
      const ts = new Date(2026, 7, 8).getTime(); // Aug 8, 2026
      expect(displayDateFromTimestamp(ts)).toBe('08/08/2026');
    });
  });

  describe('daysOfTheYear', () => {
    it('should return a number between 1 and 366', () => {
      const days = daysOfTheYear();
      expect(days).toBeGreaterThanOrEqual(1);
      expect(days).toBeLessThanOrEqual(366);
    });
  });

  describe('formatDurationHMS', () => {
    it('should format seconds into HH:MM:SS', () => {
      expect(formatDurationHMS(3665)).toBe('01:01:05'); // 1h 1m 5s
      expect(formatDurationHMS(0)).toBe('00:00:00');
      expect(formatDurationHMS(59)).toBe('00:00:59');
    });

    it('should fallback to 00:00:00 on empty or negative seconds', () => {
      expect(formatDurationHMS(undefined)).toBe('00:00:00');
      expect(formatDurationHMS(-10)).toBe('00:00:00');
    });
  });

  describe('formatDurationHM', () => {
    it('should format seconds into h m', () => {
      expect(formatDurationHM(3665)).toBe('1h 1m');
      expect(formatDurationHM(120)).toBe('0h 2m');
      expect(formatDurationHM(0)).toBe('0h 0m');
    });

    it('should fallback to 0h 0m on negative or empty inputs', () => {
      expect(formatDurationHM(undefined)).toBe('0h 0m');
      expect(formatDurationHM(-500)).toBe('0h 0m');
    });
  });

  describe('formatTimeOnly', () => {
    it('should extract local time formatted as HH:MM:SS', () => {
      const tsInSeconds = Math.round(new Date(2026, 7, 8, 10, 15, 30).getTime() / 1000);
      const formatted = formatTimeOnly(tsInSeconds);
      expect(formatted).toContain('10:15:30');
    });

    it('should return N/A if undefined', () => {
      expect(formatTimeOnly(undefined)).toBe('N/A');
    });
  });

  describe('formatTimeAndDate', () => {
    it('should combine local time with formatted calendar date', () => {
      const tsInSeconds = Math.round(new Date(2026, 7, 8, 10, 15, 30).getTime() / 1000);
      const formatted = formatTimeAndDate(tsInSeconds);
      expect(formatted).toContain('10:15:30');
      expect(formatted).toContain('08/08/2026');
    });

    it('should return N/A if undefined', () => {
      expect(formatTimeAndDate(undefined)).toBe('N/A');
    });
  });
});