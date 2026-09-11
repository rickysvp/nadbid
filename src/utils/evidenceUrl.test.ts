import { describe, expect, it } from 'vitest';
import { safeEvidenceUrl } from './evidenceUrl';

describe('safeEvidenceUrl', () => {
  it('accepts x.com https URL', () => {
    expect(safeEvidenceUrl('https://x.com/user/status/123')).toBe(
      'https://x.com/user/status/123',
    );
  });

  it('accepts twitter.com https URL', () => {
    expect(safeEvidenceUrl('https://twitter.com/user/status/123')).toBe(
      'https://twitter.com/user/status/123',
    );
  });

  it('accepts subdomain of x.com', () => {
    expect(safeEvidenceUrl('https://www.x.com/user/status/123')).toBeTruthy();
  });

  it('rejects javascript: protocol', () => {
    expect(safeEvidenceUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: protocol', () => {
    expect(safeEvidenceUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('rejects http: protocol', () => {
    expect(safeEvidenceUrl('http://x.com/user/status/123')).toBeNull();
  });

  it('rejects non-allowed host', () => {
    expect(safeEvidenceUrl('https://evil.com/phish')).toBeNull();
    expect(safeEvidenceUrl('https://x.com.evil.com/phish')).toBeNull();
  });

  it('rejects malformed URL', () => {
    expect(safeEvidenceUrl('not a url')).toBeNull();
    expect(safeEvidenceUrl('://missing')).toBeNull();
  });

  it('handles empty / null / undefined', () => {
    expect(safeEvidenceUrl('')).toBeNull();
    expect(safeEvidenceUrl(null)).toBeNull();
    expect(safeEvidenceUrl(undefined)).toBeNull();
  });

  it('trims whitespace', () => {
    expect(safeEvidenceUrl('  https://x.com/user/status/123  ')).toBe(
      'https://x.com/user/status/123',
    );
  });
});
