import { describe, it, expect } from 'vitest';

// Pure utility functions extracted from MyTasksTable for isolated unit testing

const computeLocalTime = (timezone: string, now: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);

const computeWorkingStatus = (timezone: string, now: Date): string => {
  const hour =
    parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        hour12: false,
      }).format(now),
      10,
    ) % 24;
  return hour >= 9 && hour < 17 ? 'In-Office' : 'Out-of-Office';
};

const formatDisplayDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00Z');
  const day = d.getUTCDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? 'st' :
    day % 10 === 2 && day !== 12 ? 'nd' :
    day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${day}${suffix} ${month}, ${d.getUTCFullYear()}`;
};

describe('formatDisplayDate', () => {
  it('formats 1st correctly', () => {
    expect(formatDisplayDate('2025-12-01')).toBe('1st December, 2025');
  });

  it('formats 2nd correctly', () => {
    expect(formatDisplayDate('2025-12-02')).toBe('2nd December, 2025');
  });

  it('formats 3rd correctly', () => {
    expect(formatDisplayDate('2025-12-03')).toBe('3rd December, 2025');
  });

  it('formats 11th correctly (special case)', () => {
    expect(formatDisplayDate('2025-12-11')).toBe('11th December, 2025');
  });

  it('formats 12th correctly (special case)', () => {
    expect(formatDisplayDate('2025-12-12')).toBe('12th December, 2025');
  });

  it('formats 13th correctly (special case)', () => {
    expect(formatDisplayDate('2025-12-13')).toBe('13th December, 2025');
  });

  it('formats 21st correctly', () => {
    expect(formatDisplayDate('2025-12-21')).toBe('21st December, 2025');
  });

  it('formats 22nd correctly', () => {
    expect(formatDisplayDate('2025-12-22')).toBe('22nd December, 2025');
  });

  it('formats a date in another month', () => {
    expect(formatDisplayDate('2026-01-05')).toBe('5th January, 2026');
  });
});

describe('computeWorkingStatus', () => {
  const makeDate = (hour: number, timezone: string): Date => {
    // Create a date that lands at exactly the given local hour in the specified timezone
    const utcOffset = getUtcOffsetHours(timezone);
    const utcHour = (hour - utcOffset + 24) % 24;
    const d = new Date();
    d.setUTCHours(utcHour, 0, 0, 0);
    return d;
  };

  const getUtcOffsetHours = (timezone: string): number => {
    // Simple helper: use Intl to find the hour in UTC and compare to local hour
    const now = new Date();
    const localHour = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }).format(now),
      10,
    );
    const utcHour = now.getUTCHours();
    return (localHour - utcHour + 24) % 24;
  };

  it('returns In-Office at 9:00 in UTC', () => {
    const date = new Date();
    date.setUTCHours(9, 0, 0, 0);
    expect(computeWorkingStatus('UTC', date)).toBe('In-Office');
  });

  it('returns In-Office at 16:59 in UTC', () => {
    const date = new Date();
    date.setUTCHours(16, 59, 0, 0);
    expect(computeWorkingStatus('UTC', date)).toBe('In-Office');
  });

  it('returns Out-of-Office at 8:59 in UTC', () => {
    const date = new Date();
    date.setUTCHours(8, 59, 0, 0);
    expect(computeWorkingStatus('UTC', date)).toBe('Out-of-Office');
  });

  it('returns Out-of-Office at 17:00 in UTC', () => {
    const date = new Date();
    date.setUTCHours(17, 0, 0, 0);
    expect(computeWorkingStatus('UTC', date)).toBe('Out-of-Office');
  });

  it('returns Out-of-Office at midnight UTC', () => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    expect(computeWorkingStatus('UTC', date)).toBe('Out-of-Office');
  });
});

describe('computeLocalTime', () => {
  it('returns a time string in AM/PM format', () => {
    const date = new Date();
    date.setUTCHours(12, 0, 0, 0);
    const result = computeLocalTime('UTC', date);
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });

  it('returns noon as 12:00 PM in UTC', () => {
    const date = new Date();
    date.setUTCHours(12, 0, 0, 0);
    expect(computeLocalTime('UTC', date)).toBe('12:00 PM');
  });

  it('returns midnight as 12:00 AM in UTC', () => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    expect(computeLocalTime('UTC', date)).toBe('12:00 AM');
  });
});
