import crypto from 'crypto';
import { describe, test, expect } from 'vitest';
import { safeCompare, hashPIN, createSaltedHash, verifyCredential } from '../auth.js';

describe('Server Security & Payment Endpoints Logic', () => {
  test('scrypt salted credential creation and verification', () => {
    const saltedHash = createSaltedHash('123456');
    expect(saltedHash).toContain(':');
    expect(verifyCredential('123456', saltedHash)).toBe(true);
    expect(verifyCredential('654321', saltedHash)).toBe(false);
  });

  test('safeCompare from server/auth.js matches identical hashes in constant time', () => {
    const hashA = hashPIN('123456');
    const hashB = hashPIN('123456');
    const hashC = hashPIN('654321');

    expect(safeCompare(hashA, hashB)).toBe(true);
    expect(safeCompare(hashA, hashC)).toBe(false);
    expect(safeCompare(hashA, '')).toBe(false);
  });

  test('HMAC SHA-256 signature calculation and verification', () => {
    const secret = 'test_secret_key_123';
    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';

    const generatedSig = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const bufExpected = Buffer.from(generatedSig, 'utf-8');
    const bufActual = Buffer.from(generatedSig, 'utf-8');
    const bufForged = Buffer.from('forged_signature_hash_value_123456', 'utf-8');

    expect(crypto.timingSafeEqual(bufExpected, bufActual)).toBe(true);
    expect(bufExpected.length === bufForged.length && crypto.timingSafeEqual(bufExpected, bufForged)).toBe(false);
  });

  test('Transaction deduplication logic', () => {
    const existingLogs = [
      { id: 'don_1', transactionRef: 'pay_111', amount: 50 },
      { id: 'don_2', transactionRef: 'pay_222', amount: 100 }
    ];

    const isDuplicate = (ref) => existingLogs.some(log => log.transactionRef === ref);

    expect(isDuplicate('pay_111')).toBe(true);
    expect(isDuplicate('pay_333')).toBe(false);
  });
});
