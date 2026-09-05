import { describe, it, expect } from 'vitest';

describe('CSV Export & Report Generation Logic', () => {
  const formatCSVContent = (donors) => {
    const headers = ['Donor Name', 'Email Address', 'Mobile Phone', 'Donation Purpose', 'Amount (INR)', 'Payment Status', 'Date & Time'];
    const rows = donors.map((d) => [
      `"${(d.name || '').replace(/"/g, '""')}"`,
      `"${(d.email || '').replace(/"/g, '""')}"`,
      `"${(d.phone || '').replace(/"/g, '""')}"`,
      `"${(d.purpose || '').replace(/"/g, '""')}"`,
      d.amount || 0,
      `"${d.status || 'SUCCESS'}"`,
      `"${d.date ? new Date(d.date).toISOString() : ''}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  it('generates valid CSV header row', () => {
    const csv = formatCSVContent([]);
    expect(csv).toBe('Donor Name,Email Address,Mobile Phone,Donation Purpose,Amount (INR),Payment Status,Date & Time');
  });

  it('escapes quotes and handles special characters in CSV donor records', () => {
    const donors = [
      {
        name: 'Rahul "Roy" Sharma',
        email: 'rahul@example.com',
        phone: '9876543210',
        purpose: 'Education, Kits & Books',
        amount: 1000,
        status: 'SUCCESS',
        date: '2026-07-24T20:00:00.000Z'
      }
    ];

    const csv = formatCSVContent(donors);
    expect(csv).toContain('"Rahul ""Roy"" Sharma"');
    expect(csv).toContain('"Education, Kits & Books"');
    expect(csv).toContain('1000');
  });

  it('handles phone-only (no email) donors gracefully in CSV', () => {
    const donors = [
      {
        name: 'Sunita Devi',
        email: '',
        phone: '9123456789',
        purpose: 'Tree Plantation Drive',
        amount: 250,
        status: 'SUCCESS',
        date: '2026-07-24T20:00:00.000Z'
      }
    ];

    const csv = formatCSVContent(donors);
    expect(csv).toContain('"Sunita Devi","","9123456789"');
    expect(csv).toContain('250');
  });
});
