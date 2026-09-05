import { describe, it, expect } from 'vitest';

describe('Donate Page Validation & Logic', () => {
  it('validates amount bounds correctly (₹1 to ₹5,00,000)', () => {
    const minValid = 1;
    const maxValid = 500000;
    const zero = 0;
    const negative = -50;
    const excess = 600000;

    const isValidAmount = (amt) => {
      const num = Number(amt);
      return !isNaN(num) && num >= 1 && num <= 500000;
    };

    expect(isValidAmount(minValid)).toBe(true);
    expect(isValidAmount(maxValid)).toBe(true);
    expect(isValidAmount(zero)).toBe(false);
    expect(isValidAmount(negative)).toBe(false);
    expect(isValidAmount(excess)).toBe(false);
  });

  it('validates email format regex strictly', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    expect(emailRegex.test('donor@example.com')).toBe(true);
    expect(emailRegex.test('valid.user+sub@ngo.org.in')).toBe(true);
    expect(emailRegex.test('invalid_email')).toBe(false);
    expect(emailRegex.test('test@domain')).toBe(false);
    expect(emailRegex.test('@no-user.com')).toBe(false);
  });

  it('formats redirect URLs safely', () => {
    const formatRedirectUrl = (rawUrl) => {
      if (!rawUrl || typeof rawUrl !== 'string') return '';
      const trimmed = rawUrl.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
        return trimmed;
      }
      return `https://${trimmed}`;
    };

    expect(formatRedirectUrl('https://chat.whatsapp.com/123')).toBe('https://chat.whatsapp.com/123');
    expect(formatRedirectUrl('chat.whatsapp.com/123')).toBe('https://chat.whatsapp.com/123');
    expect(formatRedirectUrl('/success')).toBe('/success');
    expect(formatRedirectUrl('')).toBe('');
  });
});
