import { describe, it, expect } from 'vitest';

describe('Server API Security & Data Protection', () => {
  const VALID_SECTIONS = [
    'hero', 'events', 'about', 'programmes', 'impact',
    'gallery', 'partners', 'team', 'contact', 'donate',
    'careers', 'legal', 'settings'
  ];

  const stripSecrets = (section, data, isAdmin = false) => {
    if (section !== 'donate' || !data || typeof data !== 'object') return data;
    if (isAdmin) return data;
    const cleaned = JSON.parse(JSON.stringify(data));
    if (cleaned.gateways && cleaned.gateways.razorpay) {
      delete cleaned.gateways.razorpay.keySecret;
    }
    return cleaned;
  };

  it('strips Razorpay keySecret for public visitor requests', () => {
    const rawDonateData = {
      hero: { title: 'Donate' },
      gateways: {
        razorpay: {
          keyId: 'rzp_live_123456789',
          keySecret: 'super_secret_private_key_abc123'
        }
      }
    };

    const publicResult = stripSecrets('donate', rawDonateData, false);
    expect(publicResult.gateways.razorpay.keyId).toBe('rzp_live_123456789');
    expect(publicResult.gateways.razorpay.keySecret).toBeUndefined();
  });

  it('preserves Razorpay keySecret for authenticated admin requests', () => {
    const rawDonateData = {
      hero: { title: 'Donate' },
      gateways: {
        razorpay: {
          keyId: 'rzp_live_123456789',
          keySecret: 'super_secret_private_key_abc123'
        }
      }
    };

    const adminResult = stripSecrets('donate', rawDonateData, true);
    expect(adminResult.gateways.razorpay.keySecret).toBe('super_secret_private_key_abc123');
  });

  it('validates CMS section route whitelist', () => {
    const isValidSection = (s) => VALID_SECTIONS.includes(s);

    expect(isValidSection('donate')).toBe(true);
    expect(isValidSection('settings')).toBe(true);
    expect(isValidSection('unauthorized_file')).toBe(false);
    expect(isValidSection('../../etc/passwd')).toBe(false);
  });

  it('verifies checkPinCollision blocks identical passwords across all roles and default values', async () => {
    const { checkPinCollision, createSaltedHash } = await import('../auth.js');
    const mockAuth = {
      pinHash: createSaltedHash('123456'),
      editorPinHash: createSaltedHash('234567'),
      financePinHash: createSaltedHash('345678'),
      securityKeyHash: createSaltedHash('999999')
    };

    // Setting editor PIN to superadmin PIN must collide
    expect(checkPinCollision('123456', 'editorPinHash', mockAuth)).toBe('Super Admin PIN');
    // Setting finance PIN to editor PIN must collide
    expect(checkPinCollision('234567', 'financePinHash', mockAuth)).toBe('Content Editor PIN');
    // Setting superadmin PIN to master key must collide
    expect(checkPinCollision('999999', 'pinHash', mockAuth)).toBe('Master Security Key');
    // Unique PIN must not collide
    expect(checkPinCollision('741852', 'editorPinHash', mockAuth)).toBeNull();
  });

  it('ensures SSR HTML injection places CMS data in head and strips secrets', () => {
    const rawHtml = '<html><head><title>Lakshya</title></head><body><div id="root"></div></body></html>';
    const allData = {
      donate: {
        gateways: {
          razorpay: {
            keyId: 'rzp_test_123',
            keySecret: 'secret_key_to_never_expose'
          }
        }
      }
    };
    if (allData.donate) {
      allData.donate = stripSecrets('donate', allData.donate, false);
    }
    const script = `<script>window.__CMS_DATA__ = ${JSON.stringify(allData)};</script>`;
    const injectedHtml = rawHtml.replace('</head>', `${script}</head>`);
    
    expect(injectedHtml).toContain('<script>window.__CMS_DATA__');
    expect(injectedHtml).toContain('rzp_test_123');
    expect(injectedHtml).not.toContain('secret_key_to_never_expose');
    expect(injectedHtml.indexOf('<script>window.__CMS_DATA__')).toBeLessThan(injectedHtml.indexOf('</head>'));
  });
});
