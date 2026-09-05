import { describe, it, expect } from 'vitest';

describe('Optional Email & Phone Validation Logic', () => {
  const isEmailProvided = (email) => Boolean(email && email.trim() && email.includes('@'));
  const isValidPhone = (phone) => {
    if (!phone || typeof phone !== 'string') return false;
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.length >= 10 && digits.length <= 12;
  };

  it('categorizes donors into "with_email" vs "no_email" correctly', () => {
    const donors = [
      { name: 'Nirbhay Garg', email: 'nirbhay@example.com', phone: '9876543210' },
      { name: 'Ramesh Kumar', email: '', phone: '9123456789' },
      { name: 'Sita Devi', email: '   ', phone: '9988776655' },
      { name: 'Anita Sharma', email: 'anita@ngo.org', phone: '' }
    ];

    const withEmail = donors.filter(d => isEmailProvided(d.email));
    const noEmail = donors.filter(d => !isEmailProvided(d.email));

    expect(withEmail.length).toBe(2);
    expect(noEmail.length).toBe(2);
    expect(noEmail[0].name).toBe('Ramesh Kumar');
    expect(noEmail[1].name).toBe('Sita Devi');
  });

  it('validates 10-digit to 12-digit mobile numbers', () => {
    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('+91 98765 43210')).toBe(true);
    expect(isValidPhone('919876543210')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });

  it('sanitizes WhatsApp phone numbers into wa.me URLs cleanly', () => {
    const formatWhatsAppUrl = (phone, donorName, purpose, amount) => {
      const cleanDigits = (phone || '').replace(/[^0-9]/g, '');
      if (!cleanDigits) return '#';
      const text = `Hi ${donorName}, thank you for supporting Lakshya NGO for ${purpose}! We have verified your contribution of ₹${amount}.`;
      return `https://wa.me/91${cleanDigits.slice(-10)}?text=${encodeURIComponent(text)}`;
    };

    const link = formatWhatsAppUrl('+91 98765-43210', 'Nirbhay', 'Childhood Education', 500);
    expect(link).toContain('https://wa.me/919876543210');
    expect(link).toContain('Childhood%20Education');
    expect(link).toContain('500');
  });
});
