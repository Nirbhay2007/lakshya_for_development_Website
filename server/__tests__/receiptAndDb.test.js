import path from 'path';
import fs from 'fs';
import { describe, test, expect } from 'vitest';
import receiptGen from '../receiptGenerator.js';
const { numberToIndianWords, generate80GReceiptPDF } = receiptGen;
import auth from '../auth.js';
const { signToken, verifyToken, ROLE_PERMISSIONS } = auth;
import db from '../db.js';

describe('80G Receipt PDF & Indian Number to Words Generator', () => {
  test('converts numbers to Indian English currency words accurately', () => {
    expect(numberToIndianWords(0)).toBe('Zero Rupees Only');
    expect(numberToIndianWords(500)).toBe('Rupees Five Hundred Only');
    expect(numberToIndianWords(2500)).toBe('Rupees Two Thousand Five Hundred Only');
    expect(numberToIndianWords(125000)).toBe('Rupees One Lakh Twenty Five Thousand Only');
    expect(numberToIndianWords(10000000)).toBe('Rupees One Crore Only');
  });

  test('generates valid 80G tax exemption PDF buffer', async () => {
    const sampleDonation = {
      id: 'don_test_999',
      receiptNumber: 'LAK/2025-26/00999',
      amount: 5000,
      currency: 'INR',
      donorName: 'Rahul Sharma',
      donorEmail: 'rahul.sharma@example.com',
      donorPhone: '+91 98765 43210',
      donorPan: 'ABCDE1234F',
      donorAddress: '123 Green Park, New Delhi 110016',
      purpose: 'Education for Underprivileged Children',
      frequency: 'one-time',
      is80gClaimed: 1,
      paymentMethod: 'Razorpay',
      transactionRef: 'pay_test_xyz123',
      timestamp: new Date().toISOString()
    };

    const pdfBuffer = await generate80GReceiptPDF(sampleDonation, {
      siteName: 'LAKSHYA FOUNDATION',
      contactEmail: 'contact@lakshyango.org'
    });

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF files start with magic bytes %PDF
    expect(pdfBuffer.toString('utf-8', 0, 4)).toBe('%PDF');
  });
});

describe('Role-Based Access Control (RBAC) Token Logic', () => {
  test('signs and verifies role-scoped session tokens', () => {
    const token = auth.issueSessionToken('finance', { username: 'finance_officer' });
    const decoded = auth.verifySessionToken(token);
    expect(decoded).toBeTruthy();
    expect(decoded.role).toBe('finance');
    expect(decoded.username).toBe('finance_officer');
  });

  test('superadmin session token resolves properly', () => {
    const adminToken = auth.issueSessionToken('superadmin', { username: 'admin' });
    const decoded = auth.verifySessionToken(adminToken);
    expect(decoded).toBeTruthy();
    expect(decoded.role).toBe('superadmin');
  });

  test('returns roles status with editor and finance configurations', () => {
    let responseData = null;
    const res = {
      json: (data) => { responseData = data; return data; }
    };
    auth.getRolesStatus({}, res);
    expect(responseData).toBeTruthy();
    expect(responseData.success).toBe(true);
    expect(responseData.roles.length).toBe(2);
    expect(responseData.roles.find(r => r.role === 'editor')).toBeTruthy();
    expect(responseData.roles.find(r => r.role === 'finance')).toBeTruthy();
  });

  test('changes role pin and supports reset to default', () => {
    let changeRes = null;
    const res = {
      json: (data) => { changeRes = data; return data; },
      status: () => res
    };

    // Change editor PIN
    auth.changeRolePin({ body: { role: 'editor', newPin: '889900' } }, res);
    expect(changeRes.success).toBe(true);
    expect(changeRes.isDefault).toBe(false);

    // Reset editor PIN back to default
    auth.changeRolePin({ body: { role: 'editor', resetToDefault: true } }, res);
    expect(changeRes.success).toBe(true);
    expect(changeRes.isDefault).toBe(true);
  });

  test('strictly rejects duplicate or colliding PINs between roles and master key', () => {
    let changeRes = null;
    let statusCode = 200;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { changeRes = data; return data; }
    };

    // Attempt to set Editor PIN to Superadmin PIN (123456)
    auth.changeRolePin({ body: { role: 'editor', newPin: '123456' } }, res);
    expect(statusCode).toBe(400);
    expect(changeRes.success).toBe(false);
    expect(changeRes.message).toContain('Super Admin PIN');

    // Attempt to set Editor PIN to Finance PIN (345678)
    auth.changeRolePin({ body: { role: 'editor', newPin: '345678' } }, res);
    expect(statusCode).toBe(400);
    expect(changeRes.success).toBe(false);
    expect(changeRes.message).toContain('Finance Officer PIN');

    // Attempt to set Finance PIN to Editor PIN (234567)
    auth.changeRolePin({ body: { role: 'finance', newPin: '234567' } }, res);
    expect(statusCode).toBe(400);
    expect(changeRes.success).toBe(false);
    expect(changeRes.message).toContain('Content Editor PIN');
  });
});

describe('SQLite Embedded Database Store', () => {
  test('records and retrieves donations with 80G flags', () => {
    const testDonation = {
      id: 'don_unit_' + Date.now(),
      receiptNumber: 'LAK/TEST/' + Date.now(),
      amount: 1500,
      currency: 'INR',
      donorName: 'Pooja Verma',
      donorEmail: 'pooja.verma@example.com',
      donorPhone: '+91 99887 76655',
      donorPan: 'PQRST5678G',
      donorAddress: '45 Lake View, Bengaluru',
      purpose: 'Tree Plantation Drive',
      frequency: 'monthly',
      is80gClaimed: 1,
      paymentMethod: 'UPI',
      transactionRef: 'upi_test_' + Date.now(),
      status: 'captured',
      timestamp: new Date().toISOString()
    };

    const saved = db.saveDonation(testDonation);
    expect(saved.id).toBe(testDonation.id);

    const fetched = db.getDonationById(testDonation.id);
    expect(fetched).toBeTruthy();
    expect(fetched.panNumber).toBe('PQRST5678G');
    expect(fetched.claim80g).toBe(true);
    expect(fetched.frequency).toBe('monthly');

    // Clean up test entry
    db.deleteDonation(testDonation.id);
  });

  test('records and updates submission lead lifecycle status and notes', () => {
    const testSub = {
      id: 'sub_unit_' + Date.now(),
      type: 'Volunteer Application',
      name: 'Amit Patel',
      email: 'amit.patel@example.com',
      phone: '+91 91234 56789',
      subject: 'Volunteer for Teaching',
      message: 'I want to volunteer every weekend for maths teaching.',
      status: 'NEW',
      date: new Date().toISOString()
    };

    db.saveSubmission(testSub);
    const fetched = db.getSubmissionById(testSub.id);
    expect(fetched).toBeTruthy();
    expect(fetched.status).toBe('NEW');

    const updated = db.updateSubmissionStatus(testSub.id, 'CONTACTED', 'Called Amit on phone, confirmed orientation for Sunday');
    expect(updated.status).toBe('CONTACTED');
    expect(updated.notes).toContain('orientation for Sunday');

    // Clean up test entry
    db.deleteSubmission(testSub.id);
    expect(db.getSubmissionById(testSub.id)).toBeUndefined();
  });

  test('stores and queries section revisions', () => {
    const revId = 'rev_unit_' + Date.now();
    db.saveRevision('about', { mission: 'Empowering children through quality education' }, 'superadmin', revId);

    const revisions = db.getRevisions('about', 5);
    expect(Array.isArray(revisions)).toBe(true);
    expect(revisions.length).toBeGreaterThan(0);
    expect(revisions[0].section).toBe('about');

    const latest = db.getRevisionById(revId);
    expect(latest).toBeTruthy();
    expect(latest.content.mission).toBe('Empowering children through quality education');
  });

  test('creates point-in-time SQLite database backup and restores correctly', async () => {
    const testTempBackup = path.join(__dirname, `test-backup-${Date.now()}.db`);
    try {
      await db.backupDatabase(testTempBackup);
      expect(fs.existsSync(testTempBackup)).toBe(true);
      expect(fs.statSync(testTempBackup).size).toBeGreaterThan(0);

      // Verify restore from file
      const restored = db.restoreDatabaseFromFile(testTempBackup);
      expect(restored).toBe(true);

      // Query database after restore to verify operations continue seamlessly
      const stats = db.getDonationStats();
      expect(stats).toBeTruthy();
    } finally {
      if (fs.existsSync(testTempBackup)) {
        fs.unlinkSync(testTempBackup);
      }
    }
  });

  test('subscribers management in SQLite database', () => {
    const testEmail = `test.sub.${Date.now()}@example.com`;
    db.addSubscriber(testEmail);
    
    let subs = db.getSubscribers();
    expect(subs.some(s => s.email === testEmail)).toBe(true);

    db.removeSubscriber(testEmail);
    subs = db.getSubscribers();
    expect(subs.some(s => s.email === testEmail)).toBe(false);
  });
});
