import { describe, expect, it } from 'vitest';
import { fileType, formatBytes, formatWhen, initials, isTextLike, parseServerDate } from './format';

describe('format helpers', () => {
  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB');
    expect(formatBytes(null)).toBe('—');
  });

  it('detects file kinds from extension, then MIME type', () => {
    expect(fileType('Report.PDF').kind).toBe('pdf');
    expect(fileType('budget.xlsx').kind).toBe('sheet');
    expect(fileType('scan', 'image/png').kind).toBe('image');
    expect(fileType('mystery').kind).toBe('other');
  });

  it('recognises editable text documents', () => {
    expect(isTextLike('text/plain', 'notes.txt')).toBe(true);
    expect(isTextLike('application/json', 'config.json')).toBe(true);
    expect(isTextLike('application/pdf', 'report.pdf')).toBe(false);
  });

  it('parses the backend timestamp format', () => {
    expect(parseServerDate('2026-11-06 01:02:03.456+0000').toISOString()).toBe('2026-11-06T01:02:03.456Z');
    expect(parseServerDate('2026-11-06T01:02:03Z').toISOString()).toBe('2026-11-06T01:02:03.000Z');
  });

  it('describes recent times relatively', () => {
    const now = Date.parse('2026-11-06T12:00:00Z');
    expect(formatWhen('2026-11-06T11:59:50Z', now)).toBe('just now');
    expect(formatWhen('2026-11-06T11:30:00Z', now)).toContain('30');
  });

  it('builds initials from names and emails', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('grace.hopper@navy.mil')).toBe('GH');
    expect(initials(undefined)).toBe('?');
  });
});
