const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const AUTH_FILE = path.join(__dirname, 'data', 'auth.json');
const DEFAULT_PIN = '123456';
const DEFAULT_SECURITY_KEY = '999999';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// JWT Secret — fallback to persistent random secret if process.env.JWT_SECRET is not set
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  const secretFile = path.join(__dirname, 'data', '.jwt_secret');
  try {
    if (fs.existsSync(secretFile)) {
      JWT_SECRET = fs.readFileSync(secretFile, 'utf-8').trim();
    } else {
      JWT_SECRET = crypto.randomBytes(32).toString('hex');
      const dir = path.dirname(secretFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(secretFile, JWT_SECRET, 'utf-8');
    }
  } catch (e) {
    JWT_SECRET = 'lakshya_fallback_secure_jwt_secret_key_2026';
  }
}

// --- Password Hashing & Verification (Scrypt with Salt) ---

function createSaltedHash(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyCredential(plain, storedHash) {
  if (!plain || typeof plain !== 'string' || !storedHash || typeof storedHash !== 'string') {
    return false;
  }
  // Check if storedHash is in "salt:key" scrypt format
  if (storedHash.includes(':')) {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(plain, salt, 64).toString('hex');
    return safeCompare(derivedKey, key);
  }
  // Fallback migration support for legacy unsalted SHA256
  const legacyHash = crypto.createHash('sha256').update(plain).digest('hex');
  return safeCompare(legacyHash, storedHash);
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// --- Auth Data Persistence ---

function readAuth() {
  try {
    const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    let migrated = false;
    
    // Auto-migrate legacy default PIN hash to salted scrypt hash
    if (!parsed.pinHash || parsed.pinHash === '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92') {
      parsed.pinHash = createSaltedHash(DEFAULT_PIN);
      parsed.isDefault = true;
      migrated = true;
    }
    // Auto-migrate legacy default Security Key hash to salted scrypt hash
    if (!parsed.securityKeyHash || parsed.securityKeyHash === '937377f056160fc4b15e0b770c67136a5f03c15205b4d3bf918268fefa2c6d0a') {
      parsed.securityKeyHash = createSaltedHash(DEFAULT_SECURITY_KEY);
      parsed.isDefaultSecurityKey = true;
      migrated = true;
    }
    if (parsed.isDefault === undefined) {
      parsed.isDefault = verifyCredential(DEFAULT_PIN, parsed.pinHash);
      migrated = true;
    }
    if (parsed.isDefaultSecurityKey === undefined) {
      parsed.isDefaultSecurityKey = verifyCredential(DEFAULT_SECURITY_KEY, parsed.securityKeyHash);
      migrated = true;
    }
    if (!parsed.pinLockout) {
      parsed.pinLockout = parsed.lockout || { attempts: 0, lockedUntil: null };
      migrated = true;
    }
    if (!parsed.securityKeyLockout) {
      parsed.securityKeyLockout = { attempts: 0, lockedUntil: null };
      migrated = true;
    }
    if (parsed.recoveryEmail === undefined) {
      parsed.recoveryEmail = '';
      migrated = true;
    }
    if (migrated) {
      writeAuth(parsed);
    }
    return parsed;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      const defaults = {
        pinHash: createSaltedHash(DEFAULT_PIN),
        isDefault: true,
        securityKeyHash: createSaltedHash(DEFAULT_SECURITY_KEY),
        isDefaultSecurityKey: true,
        pinLockout: { attempts: 0, lockedUntil: null },
        securityKeyLockout: { attempts: 0, lockedUntil: null },
        recoveryEmail: ''
      };
      writeAuth(defaults);
      return defaults;
    }
    console.error('CRITICAL: auth.json file exists but is corrupted or unreadable.', err.message);
    throw new Error('Authentication configuration is corrupted. Please check server data directory.');
  }
}

function writeAuth(data) {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${AUTH_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, AUTH_FILE);
}

// --- JWT Helper ---

function issueSessionToken(role = 'admin') {
  return jwt.sign(
    { role, issuedAt: Date.now() },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    return jwt.verify(cleanToken, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// --- Route Handlers ---

/** POST /api/auth/verify — body: { pin: "123456" } */
function verifyPin(req, res) {
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string' || pin.length !== 6) {
    return res.status(400).json({ success: false, message: 'PIN must be a 6-digit string.' });
  }

  const auth = readAuth();

  // Check lockout
  if (auth.pinLockout.lockedUntil && Date.now() < auth.pinLockout.lockedUntil) {
    const remaining = Math.ceil((auth.pinLockout.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      success: false,
      message: `Locked out. Try again in ${remaining} seconds.`,
      lockoutUntil: auth.pinLockout.lockedUntil
    });
  }

  if (verifyCredential(pin, auth.pinHash)) {
    // Successful login — reset lockout
    auth.pinLockout = { attempts: 0, lockedUntil: null };
    
    // Auto-upgrade legacy hash if needed
    if (!auth.pinHash.includes(':')) {
      auth.pinHash = createSaltedHash(pin);
    }
    writeAuth(auth);

    const token = issueSessionToken('admin');

    return res.json({
      success: true,
      token,
      pinHash: auth.pinHash, // return stored hash for store compatibility
      isDefaultPin: auth.isDefault,
      isDefaultSecurityKey: auth.isDefaultSecurityKey
    });
  } else {
    // Failed attempt
    auth.pinLockout.attempts = (auth.pinLockout.attempts || 0) + 1;
    if (auth.pinLockout.attempts >= MAX_ATTEMPTS) {
      auth.pinLockout.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    writeAuth(auth);

    const remaining = MAX_ATTEMPTS - auth.pinLockout.attempts;
    const message = auth.pinLockout.attempts >= MAX_ATTEMPTS
      ? 'Too many failed attempts. Locked out for 5 minutes.'
      : `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`;

    return res.status(401).json({
      success: false,
      message,
      wrongAttempts: auth.pinLockout.attempts,
      lockoutUntil: auth.pinLockout.lockedUntil || null
    });
  }
}

/** POST /api/auth/verify-security-key — body: { securityKey: "999999" } */
function verifySecurityKey(req, res) {
  const { securityKey } = req.body;
  if (!securityKey || typeof securityKey !== 'string' || securityKey.length !== 6) {
    return res.status(400).json({ success: false, message: 'Security Key must be a 6-digit string.' });
  }

  const auth = readAuth();

  // Check lockout
  if (auth.securityKeyLockout.lockedUntil && Date.now() < auth.securityKeyLockout.lockedUntil) {
    const remaining = Math.ceil((auth.securityKeyLockout.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      success: false,
      message: `Locked out. Try again in ${remaining} seconds.`,
      lockoutUntil: auth.securityKeyLockout.lockedUntil
    });
  }

  if (verifyCredential(securityKey, auth.securityKeyHash)) {
    auth.securityKeyLockout = { attempts: 0, lockedUntil: null };
    if (!auth.securityKeyHash.includes(':')) {
      auth.securityKeyHash = createSaltedHash(securityKey);
    }
    writeAuth(auth);

    const token = issueSessionToken('admin');

    return res.json({
      success: true,
      token,
      securityKeyHash: auth.securityKeyHash,
      isDefaultSecurityKey: auth.isDefaultSecurityKey
    });
  } else {
    auth.securityKeyLockout.attempts = (auth.securityKeyLockout.attempts || 0) + 1;
    if (auth.securityKeyLockout.attempts >= MAX_ATTEMPTS) {
      auth.securityKeyLockout.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    writeAuth(auth);

    const remaining = MAX_ATTEMPTS - auth.securityKeyLockout.attempts;
    const message = auth.securityKeyLockout.attempts >= MAX_ATTEMPTS
      ? 'Too many failed attempts. Locked out for 5 minutes.'
      : `Incorrect Security Key. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`;

    return res.status(401).json({
      success: false,
      message,
      wrongAttempts: auth.securityKeyLockout.attempts,
      lockoutUntil: auth.securityKeyLockout.lockedUntil || null
    });
  }
}

/** POST /api/auth/change-security-key — body: { newSecurityKey: "987654" } */
function changeSecurityKey(req, res) {
  const { newSecurityKey } = req.body;
  if (!newSecurityKey || typeof newSecurityKey !== 'string' || newSecurityKey.length !== 6) {
    return res.status(400).json({ success: false, message: 'New Security Key must be a 6-digit string.' });
  }

  const auth = readAuth();
  const authHeader = req.headers['authorization'] || req.headers['x-cms-security-key-hash'];
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Security Key verification failed.' });
  }

  // Verify JWT or raw hash match
  const isValidJwt = verifySessionToken(authHeader);
  const isValidHeader = isValidJwt || verifyCredential(newSecurityKey, auth.securityKeyHash) || safeCompare(authHeader, auth.securityKeyHash);

  if (!isValidHeader) {
    return res.status(401).json({ success: false, message: 'Security Key verification failed.' });
  }

  if (newSecurityKey === DEFAULT_SECURITY_KEY) {
    return res.status(400).json({ success: false, message: 'Cannot use the default Security Key.' });
  }

  const newHashed = createSaltedHash(newSecurityKey);
  auth.securityKeyHash = newHashed;
  auth.isDefaultSecurityKey = false;
  auth.securityKeyLockout = { attempts: 0, lockedUntil: null };
  writeAuth(auth);

  return res.json({ success: true, securityKeyHash: newHashed, isDefaultSecurityKey: false });
}

/** POST /api/auth/change-pin — body: { newPin: "654321" } */
function changePin(req, res) {
  const { newPin } = req.body;

  if (!newPin || typeof newPin !== 'string' || newPin.length !== 6) {
    return res.status(400).json({ success: false, message: 'New PIN must be a 6-digit string.' });
  }

  const auth = readAuth();

  if (newPin === DEFAULT_PIN) {
    return res.status(400).json({ success: false, message: 'Cannot use the default PIN.' });
  }

  const newHashed = createSaltedHash(newPin);
  auth.pinHash = newHashed;
  auth.isDefault = false;
  auth.pinLockout = { attempts: 0, lockedUntil: null };
  writeAuth(auth);

  return res.json({ success: true, pinHash: newHashed, isDefaultPin: false });
}

// --- Middleware ---

function verifySecurityHeader(headerVal) {
  if (!headerVal) return false;
  if (verifySessionToken(headerVal)) return true;
  const auth = readAuth();
  return safeCompare(headerVal, auth.securityKeyHash);
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-cms-pin-hash'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const decoded = verifySessionToken(authHeader);
  if (decoded) {
    return next();
  }

  // Backward compatibility fallback for store migration
  const auth = readAuth();
  if (safeCompare(authHeader, auth.pinHash)) {
    return next();
  }

  return res.status(401).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
}

function enforceNonDefaultCredentials(req, res, next) {
  const auth = readAuth();
  if (auth.isDefault || auth.isDefaultSecurityKey) {
    return res.status(403).json({
      success: false,
      message: 'SECURITY WARNING: You must change the default PIN (123456) and Master Security Key (999999) in Security Settings before modifying CMS content.'
    });
  }
  next();
}

module.exports = {
  verifyPin,
  verifySecurityKey,
  changeSecurityKey,
  changePin,
  requireAuth,
  enforceNonDefaultCredentials,
  verifySecurityHeader,
  createSaltedHash,
  hashPIN: (pin) => crypto.createHash('sha256').update(pin).digest('hex'),
  verifyCredential,
  safeCompare,
  readAuth,
  writeAuth,
  issueSessionToken,
  verifySessionToken
};
