require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const { verifyPin, verifySecurityKey, changeSecurityKey, changePin, requireAuth, enforceNonDefaultCredentials, verifySecurityHeader, hashPIN, readAuth, writeAuth } = require('./auth');
const AdmZip = require('adm-zip');
const nodemailer = require('nodemailer');
const sanitizeHtml = require('sanitize-html');

// Timing-safe string comparison to prevent timing attacks
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const tempDir = path.join(__dirname, '..', 'shared', 'data', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer upload settings: 10MB limit and only accept image MIME types
const upload = multer({
  dest: tempDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

// Multer settings for PDF newsletters (up to 25MB)
const pdfUpload = multer({
  dest: tempDir,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed.'));
    }
  }
});

const app = express();
app.set('trust proxy', 1);

// Security Headers Middleware (Helmet-like protection)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
});

app.use(compression({ level: 6, threshold: 256 }));
const PORT = process.env.PORT || 3000;

// --- Data directory paths ---
const SHARED_DATA_DIR = path.join(__dirname, '..', 'shared', 'data');
const MEDIA_DIR = path.join(SHARED_DATA_DIR, 'media');
const BLURHASHES_FILE = path.join(SHARED_DATA_DIR, 'blurhashes.json');
const PUBLIC_DIST = path.join(__dirname, '..', 'public-site', 'dist');
const ADMIN_DIST = path.join(__dirname, '..', 'admin', 'dist');
const BACKUPS_DIR = path.join(__dirname, 'backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Valid CMS section keys (whitelist to prevent path traversal)
const VALID_SECTIONS = [
  'hero', 'events', 'about', 'programmes', 'impact',
  'gallery', 'partners', 'team', 'contact', 'donate', 'settings', 'mediaFiles', 'careers', 'legal'
];

const SUBMISSIONS_FILE = path.join(__dirname, 'data', 'submissions.json');

function saveSubmission(submission) {
  let list = [];
  const dir = path.dirname(SUBMISSIONS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    try {
      list = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
      if (!Array.isArray(list)) list = [];
    } catch (e) {
      console.error('[Submissions] Failed to parse submissions log:', e.message);
    }
  }
  list.push(submission);
  if (list.length > 1000) {
    list = list.slice(list.length - 1000);
  }
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

const DONATIONS_FILE = path.join(__dirname, 'data', 'donations.json');
const NEWSLETTER_FILE = path.join(SHARED_DATA_DIR, 'newsletter.json');

function addNewsletterSubscriber(email, typeTag = 'General Updates') {
  if (!email || typeof email !== 'string' || !email.trim()) return;
  const emailNormalized = email.trim().toLowerCase();
  let list = [];
  if (fs.existsSync(NEWSLETTER_FILE)) {
    try {
      const raw = fs.readFileSync(NEWSLETTER_FILE, 'utf-8');
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
    } catch (e) {
      list = [];
    }
  }

  const tagToUse = typeTag || 'General Updates';
  const existingIndex = list.findIndex(s => s.email === emailNormalized);
  if (existingIndex >= 0) {
    let sub = list[existingIndex];
    let types = Array.isArray(sub.types) ? [...sub.types] : (sub.type ? [sub.type] : ['General Updates']);
    if (!types.includes(tagToUse)) {
      types.push(tagToUse);
    }
    list[existingIndex] = { ...sub, types };
  } else {
    list.push({
      email: emailNormalized,
      date: new Date().toISOString(),
      types: [tagToUse]
    });
  }

  if (!fs.existsSync(SHARED_DATA_DIR)) {
    fs.mkdirSync(SHARED_DATA_DIR, { recursive: true });
  }
  safeWriteFileSync(NEWSLETTER_FILE, list);
}

function saveDonation(donation) {
  let list = [];
  const dir = path.dirname(DONATIONS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(DONATIONS_FILE)) {
    try {
      list = JSON.parse(fs.readFileSync(DONATIONS_FILE, 'utf-8'));
      if (!Array.isArray(list)) list = [];
    } catch (e) {
      console.error('[Donations] Failed to parse donations log:', e.message);
    }
  }
  // Deduplicate transactionRef to prevent race condition duplicate logs
  if (donation.transactionRef) {
    const exists = list.some(d => d.transactionRef === donation.transactionRef);
    if (exists) {
      console.warn(`[Donations] Transaction ${donation.transactionRef} already recorded. Skipping duplicate.`);
      return;
    }
  }
  list.push(donation);
  if (list.length > 1000) {
    list = list.slice(list.length - 1000);
  }
  safeWriteFileSync(DONATIONS_FILE, JSON.stringify(list, null, 2));

  // Auto-subscribe donor email to newsletter with donation cause tag
  if (donation.email) {
    try {
      addNewsletterSubscriber(donation.email, donation.purpose || 'General NGO Support');
    } catch (nErr) {
      console.error('[Donations] Failed to auto-subscribe donor to newsletter:', nErr.message);
    }
  }

  // Auto-increment raisedAmount in donate.json presets upon successful payment
  if (donation.amount && Number(donation.amount) > 0) {
    try {
      const donateFilePath = path.join(SHARED_DATA_DIR, 'donate.json');
      if (fs.existsSync(donateFilePath)) {
        const raw = fs.readFileSync(donateFilePath, 'utf-8');
        const donateData = JSON.parse(raw);
        if (donateData && Array.isArray(donateData.presets)) {
          let updated = false;
          const targetPurpose = (donation.purpose || '').trim().toLowerCase();
          donateData.presets = donateData.presets.map((preset) => {
            const title = (preset.title || preset.name || '').trim().toLowerCase();
            const id = (preset.id || '').trim().toLowerCase();
            if ((title && title === targetPurpose) || (id && id === targetPurpose)) {
              const currentRaised = Number(preset.raisedAmount) || 0;
              preset.raisedAmount = currentRaised + Number(donation.amount);
              updated = true;
            }
            return preset;
          });

          if (updated) {
            safeWriteFileSync(donateFilePath, JSON.stringify(donateData, null, 2));
            cmsCache = null; // Clear in-memory CMS cache so live website updates instantly
          }
        }
      }
    } catch (e) {
      console.error('[Donations] Failed to auto-increment raisedAmount in presets:', e.message);
    }
  }
}

// Atomic write utility
function safeWriteFileSync(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${filePath}.tmp`;
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  fs.writeFileSync(tempPath, content, 'utf-8');
  fs.renameSync(tempPath, filePath);
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_BACKUPS_RETAINED = 7;

// Backup purge utility (retains latest 7 backup zip snapshots)
function purgeOldBackups() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return;
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.zip'))
      .map(f => {
        const fullPath = path.join(BACKUPS_DIR, f);
        const stats = fs.statSync(fullPath);
        return { name: f, path: fullPath, time: stats.mtimeMs };
      })
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS_RETAINED) {
      const toDelete = files.slice(MAX_BACKUPS_RETAINED);
      toDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`[BACKUP PURGE] Cleaned up older backup beyond ${MAX_BACKUPS_RETAINED} limit: ${file.name}`);
        } catch (err) {
          console.error(`Failed to purge old backup ${file.name}:`, err.message);
        }
      });
    }
  } catch (err) {
    console.error('Error during backup purging:', err.message);
  }
}

// Automated 3-Day Backup Generator
function checkAndPerformAutoBackup() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.zip'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return stats.mtimeMs;
      })
      .sort((a, b) => b - a);

    const newestTimestamp = files.length > 0 ? files[0] : 0;
    const now = Date.now();

    if (now - newestTimestamp >= THREE_DAYS_MS) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const zip = new AdmZip();
      if (fs.existsSync(SHARED_DATA_DIR)) {
        zip.addLocalFolder(SHARED_DATA_DIR);
        const backupPath = path.join(BACKUPS_DIR, `auto-snapshot-${timestamp}.zip`);
        zip.writeZip(backupPath);
        console.log(`[AUTO-BACKUP] Created automated 3-day backup: auto-snapshot-${timestamp}.zip`);
        purgeOldBackups();
      }
    }
  } catch (err) {
    console.error('[AUTO-BACKUP ERROR]:', err.message);
  }
}

// Run auto-backup check on startup and schedule every 6 hours
checkAndPerformAutoBackup();
setInterval(checkAndPerformAutoBackup, 6 * 60 * 60 * 1000);

// --- Security Headers & Strict CORS Whitelist ---
const defaultOrigins = [
  'https://lakshyafordevelopment.org',
  'https://www.lakshyafordevelopment.org',
  'https://lakshya.buildpod.tech',
  'http://80.225.201.147:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000'
];
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy violation: Access from this origin is not allowed.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cms-pin-hash', 'x-cms-security-key-hash']
}));

// Standard HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '1mb' }));

// Payload Stored-XSS Sanitizer using sanitize-html
const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img', 'span', 'u', 'sub', 'sup', 'iframe', 'button', 'svg', 'path']),
  allowedAttributes: {
    '*': ['class', 'id', 'style', 'title', 'aria-*', 'role', 'data-*'],
    'a': ['href', 'name', 'target', 'rel'],
    'img': ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
    'iframe': ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading', 'title'],
    'svg': ['viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'class'],
    'path': ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
  disallowedTagsMode: 'discard'
};

function sanitizePayload(obj) {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj, sanitizeOptions);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizePayload);
  }
  if (obj && typeof obj === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      clean[key] = sanitizePayload(val);
    }
    return clean;
  }
  return obj;
}

// Rate limit auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 requests per 15 min window
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit public form submissions (prevent spam & SMTP relay abuse)
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // max 15 submissions per 15 minutes per IP
  message: { success: false, message: 'Too many submissions. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Dedicated rate limit for donation payment endpoints (carding / automated testing defense)
const donationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 donation order/verify attempts per 15 minutes per IP
  message: { success: false, message: 'Too many donation attempts. Please wait a few minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.warn(`[SECURITY WARN] Donation Rate Limit Exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(429).json(options.message);
  }
});

// --- Security Auth Middleware ---
function requireSecurityAuth(req, res, next) {
  const securityHash = req.headers['x-cms-security-key-hash'];
  if (!securityHash || !verifySecurityHeader(securityHash)) {
    return res.status(403).json({ success: false, message: 'Master Security Key verification required.' });
  }
  next();
}

// --- API Routes ---

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

// Auth routes
app.post('/api/auth/verify', authLimiter, verifyPin);
app.post('/api/auth/verify-security-key', authLimiter, verifySecurityKey);
app.post('/api/auth/change-security-key', requireAuth, changeSecurityKey);
app.post('/api/auth/change-pin', requireAuth, changePin);

// Recovery Email Configuration Routes
app.get('/api/auth/recovery-email', requireAuth, requireSecurityAuth, (req, res) => {
  try {
    const auth = readAuth();
    return res.json({ success: true, recoveryEmail: auth.recoveryEmail || '' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to read recovery email.' });
  }
});

app.post('/api/auth/change-recovery-email', requireAuth, requireSecurityAuth, (req, res) => {
  const { recoveryEmail } = req.body;
  if (recoveryEmail === undefined || typeof recoveryEmail !== 'string') {
    return res.status(400).json({ success: false, message: 'Recovery email is required and must be a string.' });
  }

  try {
    const auth = readAuth();
    auth.recoveryEmail = recoveryEmail.trim();
    writeAuth(auth);
    return res.json({ success: true, message: 'Recovery email updated successfully.', recoveryEmail: auth.recoveryEmail });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update recovery email.' });
  }
});

// In-memory cache for emergency resets
let pinResetCache = { code: null, expiresAt: null };
let masterResetCache = { code: null, expiresAt: null };

// 1. PIN RESET REQUEST
app.post('/api/auth/reset-pin-request', authLimiter, async (req, res) => {
  try {
    const contactPath = path.join(SHARED_DATA_DIR, 'contact.json');
    if (!fs.existsSync(contactPath)) {
      return res.status(400).json({ success: false, message: 'Contact configuration file not found.' });
    }

    let contactData = {};
    try {
      contactData = JSON.parse(fs.readFileSync(contactPath, 'utf-8'));
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to read contact configuration.' });
    }

    const fsSettings = contactData.formSettings || {};
    if (!fsSettings.smtpEnabled || !fsSettings.smtpHost || !fsSettings.smtpUser || !fsSettings.smtpPass) {
      return res.status(400).json({ success: false, message: 'SMTP service is not active. Contact administrator to reset.' });
    }

    const authData = readAuth();
    const destination = authData.recoveryEmail || fsSettings.destinationEmail || fsSettings.smtpUser;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    pinResetCache = { code, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 };

    await sendSMTPEmail({
      to: destination,
      subject: 'Lakshya Portal - Login PIN Reset Verification Code',
      text: `Hello,\n\nWe received a request to reset your Login PIN for the Lakshya CMS portal.\n\nVerification Code: ${code}\n\nThis code is valid for 10 minutes.`,
      smtpConfig: fsSettings
    });

    const parts = destination.split('@');
    const masked = `${parts[0].substring(0, 3)}***@${parts[1]}`;
    return res.json({ success: true, message: `Verification code sent to: ${masked}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to send verification email.' });
  }
});

// Verification code validation for PIN
app.post('/api/auth/verify-reset-pin-code', authLimiter, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string' || code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Verification code must be a 6-digit string.' });
  }
  if (!pinResetCache.code || Date.now() > pinResetCache.expiresAt) {
    return res.status(400).json({ success: false, message: 'Verification code has expired or is invalid.' });
  }
  if (code !== pinResetCache.code) {
    pinResetCache.attempts = (pinResetCache.attempts || 0) + 1;
    if (pinResetCache.attempts >= 5) {
      pinResetCache = { code: null, expiresAt: null, attempts: 0 };
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Verification code has been invalidated.' });
    }
    const remaining = 5 - pinResetCache.attempts;
    return res.status(400).json({ success: false, message: `Incorrect verification code. ${remaining} attempts remaining.` });
  }
  return res.json({ success: true, message: 'Verification code is correct.' });
});

// 2. PIN RESET CONFIRM (SETS CUSTOM PIN)
app.post('/api/auth/reset-pin-confirm', authLimiter, (req, res) => {
  const { code, newPin } = req.body;

  if (!code || typeof code !== 'string' || code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Verification code must be a 6-digit string.' });
  }
  if (!newPin || typeof newPin !== 'string' || newPin.length !== 6) {
    return res.status(400).json({ success: false, message: 'New PIN must be a 6-digit string.' });
  }
  if (newPin === '123456') {
    return res.status(400).json({ success: false, message: 'Cannot use the default PIN.' });
  }

  if (!pinResetCache.code || Date.now() > pinResetCache.expiresAt) {
    return res.status(400).json({ success: false, message: 'Verification code has expired or is invalid.' });
  }

  if (code !== pinResetCache.code) {
    pinResetCache.attempts = (pinResetCache.attempts || 0) + 1;
    if (pinResetCache.attempts >= 5) {
      pinResetCache = { code: null, expiresAt: null, attempts: 0 };
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Verification code has been invalidated.' });
    }
    const remaining = 5 - pinResetCache.attempts;
    return res.status(400).json({ success: false, message: `Incorrect verification code. ${remaining} attempts remaining.` });
  }

  try {
    const authPath = path.join(__dirname, 'data', 'auth.json');
    let auth = {};
    if (fs.existsSync(authPath)) {
      try {
        auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      } catch (e) { auth = {}; }
    }

    auth.pinHash = hashPIN(newPin);
    auth.isDefault = false;
    auth.pinLockout = { attempts: 0, lockedUntil: null };

    const dir = path.dirname(authPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authPath, JSON.stringify(auth, null, 2), 'utf-8');

    pinResetCache = { code: null, expiresAt: null };
    return res.json({ success: true, message: 'Login PIN updated successfully. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update login PIN.' });
  }
});

// 3. MASTER SECURITY KEY RESET REQUEST
app.post('/api/auth/reset-master-request', authLimiter, async (req, res) => {
  try {
    const contactPath = path.join(SHARED_DATA_DIR, 'contact.json');
    if (!fs.existsSync(contactPath)) {
      return res.status(400).json({ success: false, message: 'Contact configuration file not found.' });
    }

    let contactData = {};
    try {
      contactData = JSON.parse(fs.readFileSync(contactPath, 'utf-8'));
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to read contact configuration.' });
    }

    const fsSettings = contactData.formSettings || {};
    if (!fsSettings.smtpEnabled || !fsSettings.smtpHost || !fsSettings.smtpUser || !fsSettings.smtpPass) {
      return res.status(400).json({ success: false, message: 'SMTP service is not active. Contact administrator to reset.' });
    }

    const authData = readAuth();
    const destination = authData.recoveryEmail || fsSettings.destinationEmail || fsSettings.smtpUser;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    masterResetCache = { code, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 };

    await sendSMTPEmail({
      to: destination,
      subject: 'Lakshya Portal - Master Security Key Reset Verification Code',
      text: `Hello,\n\nWe received a request to reset your Master Security Key for the Lakshya CMS portal.\n\nVerification Code: ${code}\n\nThis code is valid for 10 minutes.`,
      smtpConfig: fsSettings
    });

    const parts = destination.split('@');
    const masked = `${parts[0].substring(0, 3)}***@${parts[1]}`;
    return res.json({ success: true, message: `Verification code sent to: ${masked}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to send verification email.' });
  }
});

// Verification code validation for Master Key
app.post('/api/auth/verify-reset-master-code', authLimiter, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string' || code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Verification code must be a 6-digit string.' });
  }
  if (!masterResetCache.code || Date.now() > masterResetCache.expiresAt) {
    return res.status(400).json({ success: false, message: 'Verification code has expired or is invalid.' });
  }
  if (code !== masterResetCache.code) {
    masterResetCache.attempts = (masterResetCache.attempts || 0) + 1;
    if (masterResetCache.attempts >= 5) {
      masterResetCache = { code: null, expiresAt: null, attempts: 0 };
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Verification code has been invalidated.' });
    }
    const remaining = 5 - masterResetCache.attempts;
    return res.status(400).json({ success: false, message: `Incorrect verification code. ${remaining} attempts remaining.` });
  }
  return res.json({ success: true, message: 'Verification code is correct.' });
});

// 4. MASTER SECURITY KEY RESET CONFIRM (SETS CUSTOM MASTER KEY)
app.post('/api/auth/reset-master-confirm', authLimiter, (req, res) => {
  const { code, newMasterKey } = req.body;

  if (!code || typeof code !== 'string' || code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Verification code must be a 6-digit string.' });
  }
  if (!newMasterKey || typeof newMasterKey !== 'string' || newMasterKey.length !== 6) {
    return res.status(400).json({ success: false, message: 'New Master Key must be a 6-digit string.' });
  }
  if (newMasterKey === '999999') {
    return res.status(400).json({ success: false, message: 'Cannot use the default Master Key.' });
  }

  if (!masterResetCache.code || Date.now() > masterResetCache.expiresAt) {
    return res.status(400).json({ success: false, message: 'Verification code has expired or is invalid.' });
  }

  if (code !== masterResetCache.code) {
    masterResetCache.attempts = (masterResetCache.attempts || 0) + 1;
    if (masterResetCache.attempts >= 5) {
      masterResetCache = { code: null, expiresAt: null, attempts: 0 };
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Verification code has been invalidated.' });
    }
    const remaining = 5 - masterResetCache.attempts;
    return res.status(400).json({ success: false, message: `Incorrect verification code. ${remaining} attempts remaining.` });
  }

  try {
    const auth = readAuth();
    auth.securityKeyHash = hashPIN(newMasterKey);
    auth.isDefaultSecurityKey = false;
    auth.securityKeyLockout = { attempts: 0, lockedUntil: null };
    writeAuth(auth);

    masterResetCache = { code: null, expiresAt: null, attempts: 0 };
    return res.json({ success: true, message: 'Master Security Key updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update Master Security Key.' });
  }
});

// In-memory cache for CMS sections (cleared on write/restore actions)
let cmsCache = null;

// Helper: Check if request comes from authenticated admin
function isAdminRequest(req) {
  const pinHash = req.headers['x-cms-pin-hash'];
  if (!pinHash) return false;
  try {
    const auth = readAuth();
    return pinHash === auth.pinHash;
  } catch (e) {
    return false;
  }
}

// Utility: Strip sensitive gateway secrets from donate section for public visitors (keep for authenticated admin)
function stripSecrets(section, data, req) {
  if (section !== 'donate' || !data || typeof data !== 'object') return data;
  if (req && isAdminRequest(req)) return data; // Keep secrets for authenticated admin users
  const cleaned = JSON.parse(JSON.stringify(data));
  if (cleaned.gateways && cleaned.gateways.razorpay) {
    delete cleaned.gateways.razorpay.keySecret;
  }
  return cleaned;
}

// Read CMS section data (public — no auth needed, secrets stripped for non-admin)
app.get('/api/cms/:section', (req, res) => {
  const { section } = req.params;

  if (!VALID_SECTIONS.includes(section)) {
    return res.status(400).json({ success: false, message: `Invalid section: ${section}` });
  }

  // Check memory cache first
  if (cmsCache && cmsCache[section] !== undefined) {
    return res.json(stripSecrets(section, cmsCache[section], req));
  }

  const filePath = path.join(SHARED_DATA_DIR, `${section}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: `Section "${section}" not found.` });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return res.json(stripSecrets(section, data, req));
  } catch (e) {
    console.error(`Error reading section "${section}":`, e.message);
    return res.status(500).json({ success: false, message: 'Failed to read section data.' });
  }
});

// Write CMS section data (protected — requires auth and changed default credentials)
app.post('/api/cms/:section', requireAuth, enforceNonDefaultCredentials, (req, res) => {
  const { section } = req.params;
  const data = req.body;

  if (!VALID_SECTIONS.includes(section)) {
    return res.status(400).json({ success: false, message: `Invalid section: ${section}` });
  }

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, message: 'Request body must be a JSON object or array.' });
  }

  const filePath = path.join(SHARED_DATA_DIR, `${section}.json`);

  if (section === 'donate' && data && data.gateways && data.gateways.razorpay) {
    let existingDonate = {};
    if (fs.existsSync(filePath)) {
      try {
        existingDonate = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {}
    }
    const existingSecret = existingDonate.gateways?.razorpay?.keySecret || '';
    if (!data.gateways.razorpay.keySecret && existingSecret) {
      data.gateways.razorpay.keySecret = existingSecret;
    }
  }

  if (section === 'settings') {
    let existingSettings = {};
    if (fs.existsSync(filePath)) {
      try {
        existingSettings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {}
    }

    const oldAdvanced = existingSettings.advanced || {};
    const newAdvanced = data.advanced || {};

    if (
      oldAdvanced.customCss !== newAdvanced.customCss ||
      oldAdvanced.customScriptsHead !== newAdvanced.customScriptsHead ||
      oldAdvanced.customScriptsBody !== newAdvanced.customScriptsBody
    ) {
      const securityHash = req.headers['x-cms-security-key-hash'];
      if (!securityHash || !verifySecurityHeader(securityHash)) {
        return res.status(403).json({
          success: false,
          message: 'Master Security Key verification is required to update custom CSS and Scripts.'
        });
      }
    }
  }
  try {
    // Ensure the data directory exists
    if (!fs.existsSync(SHARED_DATA_DIR)) {
      fs.mkdirSync(SHARED_DATA_DIR, { recursive: true });
    }

    if (section === 'mediaFiles' && Array.isArray(data)) {
      // 1. Read existing mediaFiles.json
      let oldMedia = [];
      if (fs.existsSync(filePath)) {
        try {
          oldMedia = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (!Array.isArray(oldMedia)) oldMedia = [];
        } catch (e) {
          oldMedia = [];
        }
      }

      // 2. Find deleted entries
      const newUrls = new Set(data.map(item => item.url).filter(Boolean));
      const deletedItems = oldMedia.filter(item => item.url && !newUrls.has(item.url));

      // 3. Delete physical files and clean blurhashes.json
      if (deletedItems.length > 0) {
        // Load blurhashes
        let blurhashes = {};
        if (fs.existsSync(BLURHASHES_FILE)) {
          try {
            blurhashes = JSON.parse(fs.readFileSync(BLURHASHES_FILE, 'utf-8'));
          } catch (e) {}
        }

        deletedItems.forEach(item => {
          const filename = path.basename(item.url);
          const fullPath = path.join(MEDIA_DIR, filename);
          
          // Delete physical file
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (err) {
              console.error(`Failed to delete physical file ${fullPath}:`, err.message);
            }
          }

          // Delete blurhash
          if (blurhashes[item.url]) {
            delete blurhashes[item.url];
          }
        });

        // Write blurhashes back
        try {
          safeWriteFileSync(BLURHASHES_FILE, blurhashes);
        } catch (err) {
          console.error('Failed to update blurhashes.json:', err.message);
        }
      }
    }

    const payloadToSave = section === 'settings' ? data : sanitizePayload(data);
    safeWriteFileSync(filePath, payloadToSave);
    
    // Invalidate in-memory cache on writes
    cmsCache = null;

    return res.json({ success: true, message: `Section "${section}" saved successfully.` });
  } catch (e) {
    console.error(`Error writing section "${section}":`, e.message);
    return res.status(500).json({ success: false, message: 'Failed to save section data.' });
  }
});

// --- Backup & Restore Routes (requires Master Security Key) ---

// List all backups (triggers 3-day auto-backup check)
app.get('/api/backups', requireAuth, requireSecurityAuth, (req, res) => {
  try {
    checkAndPerformAutoBackup();
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.zip'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return {
          id: f,
          timestamp: stats.mtimeMs,
          size: stats.size
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
    res.json({ success: true, backups: files });
  } catch (err) {
    console.error('Error listing backups:', err);
    res.status(500).json({ success: false, message: 'Failed to list backups.' });
  }
});

// Create a new backup manually
app.post('/api/backups', requireAuth, requireSecurityAuth, (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zip = new AdmZip();
    zip.addLocalFolder(SHARED_DATA_DIR);
    const backupPath = path.join(BACKUPS_DIR, `snapshot-${timestamp}.zip`);
    zip.writeZip(backupPath);
    purgeOldBackups();
    res.json({ success: true, message: 'Backup created successfully.' });
  } catch (err) {
    console.error('Error creating backup:', err);
    res.status(500).json({ success: false, message: 'Failed to create backup.' });
  }
});

// Restore a backup
app.post('/api/backups/restore/:id', requireAuth, requireSecurityAuth, (req, res) => {
  try {
    const backupId = req.params.id;
    if (backupId.includes('..') || backupId.includes('/') || backupId.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Invalid backup ID.' });
    }
    
    const backupPath = path.join(BACKUPS_DIR, backupId);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, message: 'Backup not found.' });
    }
    
    // Auto-create a backup of the current state before restoring
    const preRestoreTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safetyZip = new AdmZip();
    safetyZip.addLocalFolder(SHARED_DATA_DIR);
    safetyZip.writeZip(path.join(BACKUPS_DIR, `pre-restore-${preRestoreTimestamp}.zip`));

    // Restore
    const zip = new AdmZip(backupPath);
    zip.extractAllTo(SHARED_DATA_DIR, true);
    
    // Invalidate in-memory cache on restore
    cmsCache = null;

    purgeOldBackups();
    res.json({ success: true, message: 'Successfully restored backup.' });
  } catch (err) {
    console.error('Error restoring backup:', err);
    res.status(500).json({ success: false, message: 'Failed to restore backup.' });
  }
});

// Delete a backup
app.delete('/api/backups/:id', requireAuth, requireSecurityAuth, (req, res) => {
  try {
    const backupId = req.params.id;
    if (backupId.includes('..') || backupId.includes('/') || backupId.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Invalid backup ID.' });
    }

    const backupPath = path.join(BACKUPS_DIR, backupId);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    res.json({ success: true, message: 'Backup deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete backup.' });
  }
});

// Bulk read all CMS sections (public)
app.get('/api/cms', (req, res) => {
  const isAdmin = isAdminRequest(req);
  if (cmsCache) {
    if (isAdmin) return res.json(cmsCache);
    const publicCache = JSON.parse(JSON.stringify(cmsCache));
    if (publicCache.donate) {
      publicCache.donate = stripSecrets('donate', publicCache.donate, req);
    }
    return res.json(publicCache);
  }

  const allData = {};

  for (const section of VALID_SECTIONS) {
    const filePath = path.join(SHARED_DATA_DIR, `${section}.json`);
    try {
      if (fs.existsSync(filePath)) {
        allData[section] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (e) {
      console.error(`Error reading section "${section}":`, e.message);
    }
  }

  cmsCache = allData;

  if (isAdmin) return res.json(allData);

  const publicData = JSON.parse(JSON.stringify(allData));
  if (publicData.donate) {
    publicData.donate = stripSecrets('donate', publicData.donate, req);
  }
  return res.json(publicData);
});

// --- Media Routes (protected for upload, public for read) ---
app.use('/media', express.static(MEDIA_DIR, {
  maxAge: '1y',
  setHeaders: (res, path) => res.setHeader('Cache-Control', 'public, max-age=31536000')
}));

app.post('/api/media/upload', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }

    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const outputPath = path.join(MEDIA_DIR, filename);

    // Optimize image and save to webp
    await sharp(req.file.path)
      .resize({ width: 1920, withoutEnlargement: true }) // Max 1920px wide
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Generate tiny blurhash (base64)
    const blurhashBuffer = await sharp(req.file.path)
      .resize({ width: 20, height: 20, fit: 'inside' })
      .webp({ quality: 20 })
      .toBuffer();
    
    const blurDataUrl = `data:image/webp;base64,${blurhashBuffer.toString('base64')}`;
    const publicUrl = `/media/${filename}`;

    // Save blurhash mapping
    let blurhashes = {};
    if (fs.existsSync(BLURHASHES_FILE)) {
      try {
        blurhashes = JSON.parse(fs.readFileSync(BLURHASHES_FILE, 'utf-8'));
      } catch (e) {}
    }
    blurhashes[publicUrl] = blurDataUrl;
    safeWriteFileSync(BLURHASHES_FILE, blurhashes);

    // Cleanup temp file
    fs.unlinkSync(req.file.path);

    return res.json({ success: true, url: publicUrl, blurDataUrl });
  } catch (error) {
    console.error('Image processing failed:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: 'Image processing failed' });
  }
});

// --- Activity Log Routes (protected) ---
const LOGS_FILE = path.join(SHARED_DATA_DIR, 'logs.json');

// Get all activity logs
app.get('/api/logs', requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(LOGS_FILE)) {
      return res.json([]);
    }
    const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
    const logs = JSON.parse(raw);
    return res.json(Array.isArray(logs) ? logs : []);
  } catch (e) {
    console.error('Failed to read logs:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to read activity logs.' });
  }
});

// Post a new activity log
app.post('/api/logs', requireAuth, (req, res) => {
  const logEntry = req.body;
  if (!logEntry || typeof logEntry !== 'object' || !logEntry.action || !logEntry.section) {
    return res.status(400).json({ success: false, message: 'Invalid log entry structure.' });
  }

  try {
    let logs = [];
    if (fs.existsSync(LOGS_FILE)) {
      try {
        const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
        logs = JSON.parse(raw);
        if (!Array.isArray(logs)) logs = [];
      } catch (e) {
        logs = [];
      }
    }

    // Append to start and cap at 500 entries
    logs = [logEntry, ...logs].slice(0, 500);

    if (!fs.existsSync(SHARED_DATA_DIR)) {
      fs.mkdirSync(SHARED_DATA_DIR, { recursive: true });
    }

    safeWriteFileSync(LOGS_FILE, logs);
    return res.json({ success: true, message: 'Log entry saved successfully.' });
  } catch (e) {
    console.error('Failed to save log:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to save activity log.' });
  }
});

// Clear all activity logs
app.post('/api/logs/clear', requireAuth, requireSecurityAuth, (req, res) => {
  try {
    if (!fs.existsSync(SHARED_DATA_DIR)) {
      fs.mkdirSync(SHARED_DATA_DIR, { recursive: true });
    }
    safeWriteFileSync(LOGS_FILE, []);
    return res.json({ success: true, message: 'Activity logs cleared successfully.' });
  } catch (e) {
    console.error('Failed to clear logs:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to clear activity logs.' });
  }
});

// --- Static File Serving (Production) ---

// Cache control helper for static assets
const staticOptions = {
  maxAge: '1d',
  index: false, // Prevent express.static from serving index.html automatically
  setHeaders: (res, filePath) => {
    // Check if file is in Vite's assets directory (hashed, immutable)
    if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/\.(png|jpe?g|gif|svg|webp|ico|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache for static images/icons/fonts
    }
  }
};

// Helper to inject CMS data into index.html
const serveInjectedHtml = (res, distPath, reqPath) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const indexPath = path.join(distPath, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');
    
    // Read all live data
    const allData = {};
    for (const section of VALID_SECTIONS) {
      const dataPath = path.join(SHARED_DATA_DIR, `${section}.json`);
      if (fs.existsSync(dataPath)) {
        try {
          allData[section] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        } catch (e) {}
      }
    }

    // Inject data into the <head>
    let blurhashes = {};
    if (fs.existsSync(BLURHASHES_FILE)) {
      try {
        blurhashes = JSON.parse(fs.readFileSync(BLURHASHES_FILE, 'utf-8'));
      } catch (e) {}
    }
    const script = `<script>window.__CMS_DATA__ = ${JSON.stringify(allData)}; window.__BLURHASHES__ = ${JSON.stringify(blurhashes)};</script>`;
    html = html.replace('</body>', `${script}</body>`);
    
    // Inject SEO tags
    const seoSettings = allData['settings']?.seo || {};
    const generalSettings = allData['settings']?.general || {};
    const socialSettings = allData['settings']?.social || {};
    const canonicalBase = seoSettings.canonicalUrl || 'https://lakshyafordevelopment.org';
    const currentPath = reqPath || '/';
    const canonicalUrl = `${canonicalBase}${currentPath === '/' ? '' : currentPath}`;
    const siteName = generalSettings.siteName || 'Lakshya NGO';

    if (seoSettings.metaTitle) {
      html = html.replace(/<title>.*?<\/title>/, `<title>${seoSettings.metaTitle}</title>`);
    }
    if (seoSettings.metaDescription) {
      html = html.replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${seoSettings.metaDescription}" />`);
    }

    // Build comprehensive SEO injection block
    let seoBlock = '';

    // Canonical URL (replace existing one from index.html)
    html = html.replace(/<link rel="canonical" href=".*?"\s*\/>/, `<link rel="canonical" href="${canonicalUrl}" />`);

    // Open Graph tags (update existing ones from index.html)
    if (seoSettings.metaTitle) {
      html = html.replace(/<meta property="og:title" content=".*?"\s*\/>/, `<meta property="og:title" content="${seoSettings.metaTitle}" />`);
    }
    if (seoSettings.metaDescription) {
      html = html.replace(/<meta property="og:description" content=".*?"\s*\/>/, `<meta property="og:description" content="${seoSettings.metaDescription}" />`);
    }
    html = html.replace(/<meta property="og:url" content=".*?"\s*\/>/, `<meta property="og:url" content="${canonicalUrl}" />`);
    html = html.replace(/<meta property="og:site_name" content=".*?"\s*\/>/, `<meta property="og:site_name" content="${siteName}" />`);
    if (seoSettings.ogImage) {
      html = html.replace(/<meta property="og:image" content=".*?"\s*\/>/, `<meta property="og:image" content="${seoSettings.ogImage}" />`);
    }

    // Twitter Card tags (update existing ones from index.html)
    if (seoSettings.metaTitle) {
      html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/>/, `<meta name="twitter:title" content="${seoSettings.metaTitle}" />`);
    }
    if (seoSettings.metaDescription) {
      html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/>/, `<meta name="twitter:description" content="${seoSettings.metaDescription}" />`);
    }
    if (seoSettings.ogImage) {
      html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/>/, `<meta name="twitter:image" content="${seoSettings.ogImage}" />`);
    }

    // JSON-LD Structured Data (Organization)
    const sameAs = [];
    if (socialSettings.facebook) sameAs.push(socialSettings.facebook);
    if (socialSettings.instagram) sameAs.push(socialSettings.instagram);
    if (socialSettings.twitter) sameAs.push(socialSettings.twitter);
    if (socialSettings.youtube) sameAs.push(socialSettings.youtube);
    if (socialSettings.linkedin) sameAs.push(socialSettings.linkedin);

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "name": siteName,
          "alternateName": generalSettings.tagline || "Lakshya Society for Social & Environmental Development",
          "url": canonicalBase,
          "logo": `${canonicalBase}/lakshya.png`,
          "description": seoSettings.metaDescription || "A registered non-profit organization dedicated to social welfare, environmental development, and community empowerment.",
          "foundingDate": "2006",
          ...(sameAs.length > 0 ? { "sameAs": sameAs } : {})
        },
        {
          "@type": "WebSite",
          "name": siteName,
          "url": canonicalBase,
          "description": seoSettings.metaDescription || ""
        }
      ]
    };
    seoBlock += `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

    if (seoBlock) {
      html = html.replace('</head>', `${seoBlock}</head>`);
    }

    // Inject Custom Scripts and CSS
    const advancedSettings = allData['settings']?.advanced || {};
    
    if (advancedSettings.customCss) {
      html = html.replace('</head>', `<style>${advancedSettings.customCss}</style></head>`);
    }
    
    if (advancedSettings.customScriptsHead) {
      html = html.replace('</head>', `${advancedSettings.customScriptsHead}</head>`);
    }
    
    if (advancedSettings.customScriptsBody) {
      html = html.replace('</body>', `${advancedSettings.customScriptsBody}</body>`);
    }

    // Inject Google Analytics
    if (seoSettings.googleAnalyticsId && seoSettings.googleAnalyticsId !== 'G-XXXXXXXXXX') {
      const gaScript = `
<!-- Google Tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${seoSettings.googleAnalyticsId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${seoSettings.googleAnalyticsId}');
</script>
      `;
      html = html.replace('</head>', `${gaScript}</head>`);
    }
    
    res.send(html);
  } catch (e) {
    console.error('Failed to inject HTML:', e);
    res.sendFile(path.join(distPath, 'index.html'));
  }
};

// Serve admin portal under /admin
if (fs.existsSync(ADMIN_DIST)) {
  app.use('/admin', express.static(ADMIN_DIST, staticOptions));
  // SPA fallback for admin routes (both /admin and /admin/*)
  app.get(['/admin', '/admin/*'], (req, res) => {
    serveInjectedHtml(res, ADMIN_DIST);
  });
}

// --- Newsletter Routes ---

// Public subscribe endpoint
app.post('/api/newsletter/subscribe', publicFormLimiter, (req, res) => {
  const { email } = req.body;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim()) || email.includes(',') || email.includes(';')) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  try {
    const emailNormalized = email.trim().toLowerCase();
    addNewsletterSubscriber(emailNormalized, 'General Updates');

    // Dispatch welcome auto-responder email if SMTP setup is active
    try {
        const contactPath = path.join(SHARED_DATA_DIR, 'contact.json');
        if (fs.existsSync(contactPath)) {
          const contactData = JSON.parse(fs.readFileSync(contactPath, 'utf-8'));
          const fsSettings = contactData.formSettings || {};
          if (fsSettings.smtpEnabled === true && fsSettings.smtpHost && fsSettings.smtpUser && fsSettings.smtpPass) {
            const welcomeSubject = fsSettings.newsletterSubject || 'Welcome to Lakshya NGO Newsletter!';
            const welcomeBody = fsSettings.newsletterBody || 'Thank you for subscribing to our newsletter!';
            
            const host = req.headers.host || '80.225.201.147:3000';
            const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
            const unsubscribeUrl = `${protocol}://${host}/api/newsletter/unsubscribe?email=${encodeURIComponent(emailNormalized)}`;
            
            const bodyWithUnsubscribe = `${welcomeBody}\n\n---\nTo unsubscribe from these updates, please click: ${unsubscribeUrl}`;
            const htmlWithUnsubscribe = `<p>${welcomeBody.replace(/\n/g, '<br>')}</p><br><hr><p style="font-size:11px;color:#777;">To unsubscribe from these emails, <a href="${unsubscribeUrl}">click here</a>.</p>`;

            sendSMTPEmail({
              to: emailNormalized,
              subject: welcomeSubject,
              text: bodyWithUnsubscribe,
              html: htmlWithUnsubscribe,
              smtpConfig: fsSettings
            }).catch(err => console.error('Failed to send welcome newsletter email:', err.message));
          }
        }
      } catch (smtpErr) {
        console.error('Newsletter welcome email error:', smtpErr);
      }
    return res.json({ success: true, message: 'Successfully subscribed to the newsletter.' });
  } catch (err) {
    console.error('Failed to subscribe:', err);
    return res.status(500).json({ success: false, message: 'Server error subscribing to newsletter.' });
  }
});

// Admin list subscribers endpoint
app.get('/api/newsletter/subscribers', requireAuth, (req, res) => {
  try {
    let subscribers = [];
    if (fs.existsSync(NEWSLETTER_FILE)) {
      try {
        const raw = fs.readFileSync(NEWSLETTER_FILE, 'utf-8');
        subscribers = JSON.parse(raw);
        if (!Array.isArray(subscribers)) subscribers = [];
      } catch (e) {
        subscribers = [];
      }
    }
    return res.json({ success: true, subscribers });
  } catch (err) {
    console.error('Failed to fetch subscribers:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve newsletter subscribers.' });
  }
});

// Admin delete subscriber endpoint
app.delete('/api/newsletter/subscribers/:email', requireAuth, (req, res) => {
  const emailToDelete = req.params.email;
  if (!emailToDelete) {
    return res.status(400).json({ success: false, message: 'Email param is required.' });
  }

  try {
    let subscribers = [];
    if (fs.existsSync(NEWSLETTER_FILE)) {
      try {
        const raw = fs.readFileSync(NEWSLETTER_FILE, 'utf-8');
        subscribers = JSON.parse(raw);
        if (!Array.isArray(subscribers)) subscribers = [];
      } catch (e) {
        subscribers = [];
      }
    }

    const normalizedEmail = emailToDelete.trim().toLowerCase();
    const filtered = subscribers.filter(s => s.email !== normalizedEmail);

    if (!fs.existsSync(SHARED_DATA_DIR)) {
      fs.mkdirSync(SHARED_DATA_DIR, { recursive: true });
    }
    safeWriteFileSync(NEWSLETTER_FILE, filtered);

    return res.json({ success: true, message: 'Subscriber removed successfully.' });
  } catch (err) {
    console.error('Failed to delete subscriber:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete subscriber.' });
  }
});

// Admin get all submissions endpoint
app.get('/api/submissions', requireAuth, (req, res) => {
  try {
    let list = [];
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
    }
    // Sort submissions by newest first
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.json({ success: true, submissions: list });
  } catch (err) {
    console.error('Failed to fetch submissions:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve form submissions.' });
  }
});

// Admin update submission status endpoint
app.patch('/api/submissions/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ success: false, message: 'ID and status are required.' });
  }

  try {
    let list = [];
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
    }

    let found = false;
    const updatedList = list.map((item) => {
      if (item.id === id) {
        found = true;
        return { ...item, status };
      }
      return item;
    });

    if (!found) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(updatedList, null, 2), 'utf-8');
    return res.json({ success: true, message: 'Submission status updated.' });
  } catch (err) {
    console.error('Failed to update submission status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update submission status.' });
  }
});

// Admin delete submission endpoint
app.delete('/api/submissions/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID is required.' });
  }

  try {
    let list = [];
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
    }

    const filtered = list.filter((item) => item.id !== id);
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return res.json({ success: true, message: 'Submission deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete submission:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete submission.' });
  }
});

// Manual donation record endpoint — protected with auth (admin-only)
// Previously public, now locked down to prevent fake donation injection
app.post('/api/donations/record', requireAuth, (req, res) => {
  const { name, email, phone, amount, purpose, paymentMethod, transactionRef } = req.body;
  if (!name || !email || !amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Name, email, and valid donation amount are required.' });
  }

  try {
    const donationRecord = {
      id: `don_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      amount: Number(amount),
      purpose: purpose || 'General NGO Support',
      paymentMethod: paymentMethod || 'Manual Entry',
      transactionRef: transactionRef || `TXN${Date.now()}`,
      status: 'SUCCESS',
      date: new Date().toISOString()
    };

    saveDonation(donationRecord);
    return res.json({ success: true, donation: donationRecord, message: 'Donation transaction recorded successfully.' });
  } catch (err) {
    console.error('Failed to record donation:', err);
    return res.status(500).json({ success: false, message: 'Failed to record donation.' });
  }
});

// Admin endpoint to get all donation records
app.get('/api/donations', requireAuth, (req, res) => {
  try {
    let list = [];
    if (fs.existsSync(DONATIONS_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(DONATIONS_FILE, 'utf-8'));
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
    }
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.json({ success: true, donations: list });
  } catch (err) {
    console.error('Failed to fetch donations:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve donation records.' });
  }
});

// Admin endpoint to delete a donation record
app.delete('/api/donations/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID is required.' });
  }

  try {
    let list = [];
    if (fs.existsSync(DONATIONS_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(DONATIONS_FILE, 'utf-8'));
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
    }

    const filtered = list.filter((item) => item.id !== id);
    fs.writeFileSync(DONATIONS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return res.json({ success: true, message: 'Donation record deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete donation record:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete donation record.' });
  }
});

// Razorpay Order Creation & Verification Controllers
const handleCreateOrder = async (req, res) => {
  const { amount, purpose, donorInfo } = req.body;
  const numAmount = Number(amount);
  if (!amount || isNaN(numAmount) || numAmount < 1 || numAmount > 500000) {
    console.warn(`[SECURITY WARN] Invalid order amount (${amount}) requested from IP: ${req.ip}`);
    return res.status(400).json({ success: false, message: 'Valid donation amount between ₹1 and ₹5,00,000 is required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (donorInfo?.email && !emailRegex.test(donorInfo.email.trim())) {
    console.warn(`[SECURITY WARN] Invalid order donor email format (${donorInfo.email}) from IP: ${req.ip}`);
    return res.status(400).json({ success: false, message: 'Invalid donor email address format.' });
  }

  const donateFilePath = path.join(__dirname, '..', 'shared', 'data', 'donate.json');
  let donateData = {};
  if (fs.existsSync(donateFilePath)) {
    try {
      donateData = JSON.parse(fs.readFileSync(donateFilePath, 'utf-8'));
    } catch (e) {}
  }

  const razorpayConfig = donateData.gateways?.razorpay || {};
  const keyId = (razorpayConfig.keyId ? razorpayConfig.keyId.trim() : '') || (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (razorpayConfig.keySecret ? razorpayConfig.keySecret.trim() : '') || (process.env.RAZORPAY_KEY_SECRET || '').trim();

  if (keyId && keySecret) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(Number(amount) * 100),
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
          notes: {
            purpose: purpose || 'General NGO Support',
            donorName: donorInfo?.name || '',
            donorEmail: donorInfo?.email || ''
          }
        })
      });
      if (rzpRes.ok) {
        const order = await rzpRes.json();
        return res.json({
          success: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: keyId,
          purpose: purpose || 'General NGO Support'
        });
      } else {
        const errJson = await rzpRes.json().catch(() => ({}));
        const errorDesc = errJson.error?.description || `Razorpay API returned status ${rzpRes.status}`;
        console.warn('[Razorpay API Order Error]:', errorDesc);
        return res.status(400).json({
          success: false,
          message: `Razorpay Order Error: ${errorDesc}`
        });
      }
    } catch (err) {
      console.error('[Razorpay Order Creation Error]:', err.message);
      return res.status(500).json({
        success: false,
        message: `Failed to create Razorpay order: ${err.message}`
      });
    }
  }

  return res.status(502).json({
    success: false,
    message: 'Failed to create Razorpay order. Please check your Razorpay API credentials in Admin CMS.'
  });
};

const handleVerifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    name,
    email,
    phone,
    amount,
    purpose
  } = req.body;

  const numAmount = Number(amount);
  if (!name || !name.trim() || (!email && !phone) || !amount || isNaN(numAmount) || numAmount < 1 || numAmount > 500000 || !razorpay_payment_id) {
    console.warn(`[SECURITY WARN] Invalid payment payload or amount (${amount}) from IP: ${req.ip}`);
    return res.status(400).json({ success: false, message: 'Invalid payment details or amount out of valid range (₹1 to ₹5,00,000).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && email.trim() && !emailRegex.test(email.trim())) {
    console.warn(`[SECURITY WARN] Invalid verification email format (${email}) from IP: ${req.ip}`);
    return res.status(400).json({ success: false, message: 'Invalid email address format provided.' });
  }

  const donateFilePath = path.join(__dirname, '..', 'shared', 'data', 'donate.json');
  let donateData = {};
  if (fs.existsSync(donateFilePath)) {
    try {
      donateData = JSON.parse(fs.readFileSync(donateFilePath, 'utf-8'));
    } catch (e) {}
  }

  const keyId = (donateData.gateways?.razorpay?.keyId || '').trim() || (process.env.RAZORPAY_KEY_ID || '').trim();
  const secret = (donateData.gateways?.razorpay?.keySecret || '').trim() || (process.env.RAZORPAY_KEY_SECRET || '').trim();
  
  // 1. Mandatory Razorpay Order ID & Signature Verification
  if (!razorpay_order_id || !razorpay_order_id.startsWith('order_')) {
    console.warn(`[SECURITY WARN] Missing or invalid razorpay_order_id from IP: ${req.ip}`);
    return res.status(400).json({ success: false, message: 'Invalid Razorpay Order ID provided.' });
  }

  if (!secret) {
    console.warn(`[SECURITY WARN] Razorpay Key Secret is missing from IP: ${req.ip}`);
    return res.status(400).json({ success: false, message: 'Razorpay Secret Key is missing in CMS settings.' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (!safeCompare(expectedSignature, razorpay_signature)) {
    console.warn(`[SECURITY WARN] Razorpay signature mismatch for order ${razorpay_order_id} from IP: ${req.ip}`);
    return res.status(400).json({ success: false, message: 'Razorpay payment signature verification failed. Please check your Secret Key in Admin CMS.' });
  }

  // 2. Direct Razorpay Server API Verification & Amount Cross-Check
  if (keyId && secret && !razorpay_payment_id.startsWith('pay_dummy')) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${keyId.trim()}:${secret.trim()}`).toString('base64');
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id.trim()}`, {
        headers: { 'Authorization': authHeader }
      });
      if (rzpRes.ok) {
        const rzpData = await rzpRes.json();
        if (rzpData.status !== 'captured' && rzpData.status !== 'authorized') {
          console.warn(`[SECURITY WARN] Razorpay payment ${razorpay_payment_id} status '${rzpData.status}' from IP: ${req.ip}`);
          return res.status(400).json({ success: false, message: `Payment status is '${rzpData.status}'. Payment not captured.` });
        }

        const paidAmountINR = Math.round(Number(rzpData.amount) / 100);
        const claimedAmountINR = Math.round(Number(amount));
        if (paidAmountINR !== claimedAmountINR) {
          console.warn(`[SECURITY WARN] Amount mismatch for payment ${razorpay_payment_id}: paid ₹${paidAmountINR}, claimed ₹${claimedAmountINR} from IP: ${req.ip}`);
          return res.status(400).json({
            success: false,
            message: `Payment verification failed: Paid amount (₹${paidAmountINR}) does not match submitted amount (₹${claimedAmountINR}).`
          });
        }
      } else {
        const errJson = await rzpRes.json().catch(() => ({}));
        const errDesc = errJson.error?.description || `Razorpay API returned status ${rzpRes.status}`;
        console.warn(`[SECURITY WARN] Razorpay API verification failed for ${razorpay_payment_id}: ${errDesc} from IP: ${req.ip}`);
        return res.status(400).json({ success: false, message: `Payment verification failed with Razorpay API: ${errDesc}` });
      }
    } catch (err) {
      console.error('[Razorpay API Verification Error]:', err.message);
      return res.status(500).json({ success: false, message: `Failed to verify payment with Razorpay: ${err.message}` });
    }
  }

  let existingDonations = [];
  if (fs.existsSync(DONATIONS_FILE)) {
    try {
      existingDonations = JSON.parse(fs.readFileSync(DONATIONS_FILE, 'utf-8'));
      if (!Array.isArray(existingDonations)) existingDonations = [];
    } catch (e) {}
  }
  const existingRecord = existingDonations.find(d => d.transactionRef === razorpay_payment_id);
  if (existingRecord) {
    return res.json({ success: true, donation: existingRecord, message: 'Payment already verified & logged.' });
  }

  const donationRecord = {
    id: `don_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: name.trim(),
    email: (email || '').trim().toLowerCase(),
    phone: (phone || '').trim(),
    amount: Number(amount),
    purpose: purpose || 'General NGO Support',
    paymentMethod: 'Razorpay',
    transactionRef: razorpay_payment_id,
    status: 'SUCCESS',
    date: new Date().toISOString()
  };

  saveDonation(donationRecord);
  return res.json({ success: true, donation: donationRecord, message: 'Razorpay payment verified & donation logged.' });
};

// Mount route handlers directly
app.post('/api/donations/razorpay/create-order', donationLimiter, handleCreateOrder);
app.post('/api/create-order', donationLimiter, handleCreateOrder);

app.post('/api/donations/razorpay/verify', donationLimiter, handleVerifyPayment);
app.post('/api/verify-payment', donationLimiter, handleVerifyPayment);

// Public unsubscribe endpoint (returns confirmation HTML page)
app.get('/api/newsletter/unsubscribe', (req, res) => {
  const { email } = req.query;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid Unsubscribe Request</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Outfit', sans-serif; background-color: #f7f6f2; color: #2d3748; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-w: 400px; border: 1px solid #e2e8f0; }
          h1 { color: #e53e3e; font-size: 1.5rem; margin-bottom: 1rem; }
          p { font-size: 0.95rem; color: #718096; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Invalid Request</h1>
          <p>The unsubscribe link is invalid or expired. Please check the link in your email and try again.</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    let subscribers = [];
    if (fs.existsSync(NEWSLETTER_FILE)) {
      try {
        const raw = fs.readFileSync(NEWSLETTER_FILE, 'utf-8');
        subscribers = JSON.parse(raw);
        if (!Array.isArray(subscribers)) subscribers = [];
      } catch (e) {
        subscribers = [];
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const filtered = subscribers.filter(s => s.email !== normalizedEmail);
    safeWriteFileSync(NEWSLETTER_FILE, filtered);

    const escapeHTML = (str) => typeof str === 'string' ? str.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c)) : '';
    const safeEmail = escapeHTML(normalizedEmail);

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed successfully</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Outfit', sans-serif; background: linear-gradient(135deg, #f4f7f5 0%, #e9efe8 100%); color: #1c2e24; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 3rem 2rem; border-radius: 2rem; box-shadow: 0 20px 40px rgba(46,125,50,0.08); text-align: center; max-w: 420px; border: 1px solid rgba(255, 255, 255, 0.6); }
          .icon-box { width: 4.5rem; height: 4.5rem; background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #2e7d32; }
          h1 { color: #1b5e20; font-size: 1.75rem; margin-bottom: 0.75rem; font-weight: 600; }
          p { font-size: 0.95rem; color: #4e6559; line-height: 1.6; margin-bottom: 2rem; }
          .email { font-weight: 600; color: #2e7d32; background: #f1f8f3; padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.9rem; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h1>Unsubscribed</h1>
          <p>You have been successfully removed from our newsletter list. You will no longer receive updates at <br><span class="email">${safeEmail}</span>.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Failed public unsubscribe:', err);
    return res.status(500).send('Server error processing unsubscribe request.');
  }
});
// --- SMTP Email Utilities ---
async function sendSMTPEmail({ to, replyTo, subject, text, html, attachments, smtpConfig }) {
  if (!smtpConfig || !smtpConfig.smtpHost || !smtpConfig.smtpUser) {
    throw new Error('SMTP Configuration is incomplete or missing.');
  }

  const host = smtpConfig.smtpHost.trim();
  const port = parseInt(smtpConfig.smtpPort) || 587;
  
  // Explicitly determine SSL vs STARTTLS:
  // Port 465 = Direct SSL (secure: true)
  // Port 587 / 25 = STARTTLS (secure: false)
  let isSecure = false;
  if (typeof smtpConfig.smtpSecure === 'boolean') {
    isSecure = smtpConfig.smtpSecure;
  } else {
    isSecure = port === 465;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user: smtpConfig.smtpUser.trim(),
      pass: (smtpConfig.smtpPass || '').trim(),
    },
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 5000,    // 5s greeting timeout
    socketTimeout: 15000,     // 15s socket timeout
    family: 4,                // Force IPv4 to prevent 30s IPv6 DNS lookup delays on Linux VPS
    tls: {
      rejectUnauthorized: false // Prevent SSL certificate handshake rejections on custom relays
    }
  });

  const fromEmail = (smtpConfig.smtpFrom || smtpConfig.smtpUser).trim();

  const mailOptions = {
    from: `"Lakshya NGO" <${fromEmail}>`,
    to,
    replyTo: replyTo || undefined,
    subject,
    text,
    html,
    attachments: attachments || undefined,
  };

  return transporter.sendMail(mailOptions);
}

// Local Gateway for dispatching contact/apply details & sending autoresponder confirmation
app.post('/api/email/dispatch', publicFormLimiter, async (req, res) => {
  const { type, name, email, phone, subject, message, jobTitle } = req.body;
  console.log('[SMTP Dispatch] Received request:', { type, name, email, phone, subject, jobTitle });

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (email && (typeof email !== 'string' || !emailRegex.test(email.trim()) || email.includes(',') || email.includes(';'))) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  // Sanitize text inputs going to headers to prevent SMTP injection (remove newlines/carriage returns)
  const cleanHeader = (val) => typeof val === 'string' ? val.replace(/[\r\n]+/g, ' ').trim() : '';
  const cleanName = cleanHeader(name);
  const cleanSubject = cleanHeader(subject);
  const cleanJobTitle = cleanHeader(jobTitle);

  try {
    const newSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: type || 'Contact Form',
      name: name || '',
      email: email || '',
      phone: phone || '',
      subject: subject || '',
      message: message || '',
      jobTitle: jobTitle || '',
      date: new Date().toISOString(),
      status: 'unread'
    };
    saveSubmission(newSubmission);

    const contactPath = path.join(SHARED_DATA_DIR, 'contact.json');
    if (!fs.existsSync(contactPath)) {
      return res.status(400).json({ success: false, message: 'Contact configuration file not found.' });
    }

    let contactData = {};
    try {
      contactData = JSON.parse(fs.readFileSync(contactPath, 'utf-8'));
    } catch (parseErr) {
      console.error('[SMTP] Failed to parse contact.json:', parseErr.message);
      return res.status(500).json({ success: false, message: 'Failed to read contact configuration.' });
    }
    const fsSettings = contactData.formSettings || {};

    if (fsSettings.smtpEnabled !== true) {
      // SMTP not active, client will process via client-side libraries
      return res.json({ success: true, service: fsSettings.emailService, message: 'SMTP not configured active. Skipping local dispatch.' });
    }

    if (!fsSettings.smtpHost || !fsSettings.smtpUser || !fsSettings.smtpPass) {
      return res.status(400).json({ success: false, message: 'SMTP settings are active but credentials are not configured.' });
    }

    const isAutoResponderOnly = req.body.autoResponderOnly === true;

    // 1. Send query email to admin destination email (only if this is a full SMTP dispatch, not when Formspree/Web3Forms handles admin notification)
    if (!isAutoResponderOnly) {
      const prefix = fsSettings.subjectPrefix || 'Lakshya Enquiry: ';
      const adminSubject = `${prefix}${cleanSubject || 'New Submission'}`;
      const adminText = `Name: ${cleanName || 'N/A'}\nEmail: ${email || 'N/A'}\nPhone: ${phone || 'N/A'}\nSubmission Category: ${type || 'Contact Form'}${cleanJobTitle ? `\nPosition/Subject Context: ${cleanJobTitle}` : ''}\n\nMessage/Details:\n${message || 'No message contents.'}`;

      await sendSMTPEmail({
        to: fsSettings.destinationEmail || fsSettings.smtpUser,
        replyTo: email || undefined,
        subject: adminSubject,
        text: adminText,
        smtpConfig: fsSettings
      });
      console.log('[SMTP] Admin notification email sent to:', fsSettings.destinationEmail || fsSettings.smtpUser);
    }

    // 2. If email is provided, send autoresponder back to candidate/visitor
    if (email && email.trim() !== '') {
      let responderSubject = '';
      let responderBody = '';

      if (type === 'Volunteer Application') {
        responderSubject = fsSettings.candidateSubject || 'Application Received: [Job Title]';
        responderBody = fsSettings.candidateBody || 'We have received your application.';
      } else {
        responderSubject = fsSettings.enquirySubject || 'Thank you for contacting Lakshya NGO';
        responderBody = fsSettings.enquiryBody || 'We have received your message regarding: [Subject].';
      }

      // Replace placeholders
      responderSubject = responderSubject.replace(/\[Name\]/g, cleanName || '').replace(/\[Job Title\]/g, cleanJobTitle || '').replace(/\[Subject\]/g, cleanSubject || '');
      responderBody = responderBody.replace(/\[Name\]/g, cleanName || '').replace(/\[Job Title\]/g, cleanJobTitle || '').replace(/\[Subject\]/g, cleanSubject || '');

      try {
        await sendSMTPEmail({
          to: email,
          subject: responderSubject,
          text: responderBody,
          smtpConfig: fsSettings
        });
        console.log('[SMTP] Auto-responder email sent to:', email);
      } catch (autoErr) {
        console.error('[SMTP] Failed to send autoresponder email:', autoErr.message);
        // We do not fail the overall route since admin alert was sent successfully
      }
    }

    return res.json({ success: true, message: 'Email dispatch completed successfully via SMTP.' });
  } catch (err) {
    console.error('[SMTP] Local dispatch gateway failed:', err);
    return res.status(500).json({ success: false, message: err.message || 'SMTP Email transmission failed.' });
  }
});

// Authenticated endpoint to test SMTP settings configuration live
app.post('/api/email/test-smtp', requireAuth, async (req, res) => {
  const config = req.body || {};

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return res.status(400).json({ success: false, message: 'SMTP host, username, and password credentials are required.' });
  }

  const destination = config.destinationEmail || config.smtpUser;

  try {
    console.log('[SMTP Test] Testing connection to host:', config.smtpHost);
    await sendSMTPEmail({
      to: destination,
      subject: 'Lakshya CMS - SMTP Test Connection Successful',
      text: `Hello! This is a test email sent from the Lakshya NGO CMS panel to verify that your SMTP server settings are configured correctly.\n\nSettings Tested:\n- Host: ${config.smtpHost}\n- Port: ${config.smtpPort || '587'}\n- Secure/TLS: ${config.smtpSecure !== false ? 'ON (SSL)' : 'OFF (STARTTLS)'}\n- Username: ${config.smtpUser}\n- Sender/From: ${config.smtpFrom || config.smtpUser}\n- Destination: ${destination}\n\nConnection is fully operational!`,
      smtpConfig: config
    });
    console.log('[SMTP Test] Success! Test email dispatched to:', destination);
    return res.json({ success: true, message: `SMTP connection verified successfully! A test email has been sent to: ${destination}` });
  } catch (err) {
    console.error('[SMTP Test] Connection failed:', err);
    return res.status(500).json({ success: false, message: err.message || 'SMTP connection failed. Check your credentials.' });
  }
});

// Admin Newsletter PDF Upload Endpoint
app.post('/api/newsletter/upload', requireAuth, pdfUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
  }

  try {
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }

    const filename = `newsletter-${Date.now()}.pdf`;
    const outputPath = path.join(MEDIA_DIR, filename);

    // Copy from temp location to permanent media folder
    fs.copyFileSync(req.file.path, outputPath);
    fs.unlinkSync(req.file.path); // clean temp file

    const publicUrl = `/media/${filename}`;
    return res.json({ success: true, url: publicUrl, filename });
  } catch (err) {
    console.error('PDF Upload failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to save PDF file.' });
  }
});

// Admin Newsletter Broadcast Endpoint
app.post('/api/newsletter/broadcast', requireAuth, async (req, res) => {
  const { subject, pdfUrl, targetFilter } = req.body;
  if (!subject || !pdfUrl) {
    return res.status(400).json({ success: false, message: 'Subject and PDF file are required.' });
  }

  try {
    // Verify file exists
    const pdfFilename = path.basename(pdfUrl);
    const pdfFilePath = path.join(MEDIA_DIR, pdfFilename);
    if (!fs.existsSync(pdfFilePath)) {
      return res.status(400).json({ success: false, message: 'Attached PDF file was not found on the server.' });
    }

    // Load subscribers
    let subscribers = [];
    if (fs.existsSync(NEWSLETTER_FILE)) {
      try {
        const raw = fs.readFileSync(NEWSLETTER_FILE, 'utf-8');
        subscribers = JSON.parse(raw);
        if (!Array.isArray(subscribers)) subscribers = [];
      } catch (e) {
        subscribers = [];
      }
    }

    if (subscribers.length === 0) {
      return res.status(400).json({ success: false, message: 'You have zero newsletter subscribers to broadcast to.' });
    }

    // Filter subscribers by selected cause/type if specified
    let targetRecipients = subscribers;
    if (targetFilter && targetFilter !== 'all') {
      targetRecipients = subscribers.filter(s => {
        const types = Array.isArray(s.types) ? s.types : (s.type ? [s.type] : ['General Updates']);
        return types.includes(targetFilter);
      });
    }

    if (targetRecipients.length === 0) {
      return res.status(400).json({ success: false, message: `No subscribers match the selected filter category: "${targetFilter}".` });
    }

    // Load SMTP Settings
    const contactPath = path.join(SHARED_DATA_DIR, 'contact.json');
    if (!fs.existsSync(contactPath)) {
      return res.status(400).json({ success: false, message: 'Contact configuration file not found.' });
    }

    const contactData = JSON.parse(fs.readFileSync(contactPath, 'utf-8'));
    const fsSettings = contactData.formSettings || {};

    if (!fsSettings.smtpHost || !fsSettings.smtpUser || !fsSettings.smtpPass) {
      return res.status(400).json({ success: false, message: 'SMTP host, user, and password credentials must be set up in SMTP settings before broadcasting.' });
    }

    let sentCount = 0;
    let failedCount = 0;

    const host = req.headers.host || '80.225.201.147:3000';
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');

    // Send emails in sequence to be safe with SMTP servers
    for (const sub of targetRecipients) {
      try {
        const unsubscribeUrl = `${protocol}://${host}/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}`;
        
        await sendSMTPEmail({
          to: sub.email,
          subject,
          text: `Hello,\n\nPlease find attached our latest newsletter PDF document.\n\n---\nTo unsubscribe from these updates, please click: ${unsubscribeUrl}`,
          html: `<p>Hello,</p><p>Please find attached our latest newsletter PDF document.</p><br><hr><p style="font-size:11px;color:#777;">To unsubscribe from these emails, <a href="${unsubscribeUrl}">click here</a>.</p>`,
          attachments: [
            {
              filename: pdfFilename,
              path: pdfFilePath,
              contentType: 'application/pdf'
            }
          ],
          smtpConfig: fsSettings
        });
        sentCount++;
      } catch (sendErr) {
        console.error(`Failed to broadcast to ${sub.email}:`, sendErr.message);
        failedCount++;
      }
    }

    return res.json({
      success: true,
      message: `Broadcast finished. Successfully sent to ${sentCount} subscribers.${failedCount > 0 ? ` Failed to send to ${failedCount} subscribers.` : ''}`,
      sentCount,
      failedCount
    });
  } catch (err) {
    console.error('Newsletter broadcast failed:', err);
    return res.status(500).json({ success: false, message: err.message || 'Newsletter broadcast failed.' });
  }
});

// Serve public site at root
if (fs.existsSync(PUBLIC_DIST)) {
  app.use(express.static(PUBLIC_DIST, staticOptions));
  // SPA fallback for public site routes
  app.get('*', (req, res) => {
    // Don't intercept API or admin routes
    if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
      return res.status(404).json({ message: 'Not found' });
    }
    serveInjectedHtml(res, PUBLIC_DIST, req.path);
  });
}

// --- Start ---
const server = app.listen(PORT, () => {
  console.log(`\n  🌿 Lakshya Server running on http://localhost:${PORT}`);
  console.log(`  📄 Public site:  http://localhost:${PORT}/`);
  console.log(`  🔧 Admin CMS:    http://localhost:${PORT}/admin`);
  console.log(`  📡 API:          http://localhost:${PORT}/api/cms\n`);
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\n⚙️ Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('💤 Server process closed.');
    process.exit(0);
  });

  // Force exit after 10s if connections hang
  setTimeout(() => {
    console.error('⚠️ Forcefully exiting server.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
