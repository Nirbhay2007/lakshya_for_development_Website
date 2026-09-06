const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const AUTH_FILE = path.join(__dirname, 'data', 'auth.json');
const DEFAULT_PIN = '123456';
const DEFAULT_EDITOR_PIN = '234567';
const DEFAULT_FINANCE_PIN = '345678';
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
    // Role PINs initialization
    if (!parsed.editorPinHash) {
      parsed.editorPinHash = createSaltedHash(DEFAULT_EDITOR_PIN);
      parsed.isDefaultEditor = true;
      migrated = true;
    }
    if (!parsed.financePinHash) {
      parsed.financePinHash = createSaltedHash(DEFAULT_FINANCE_PIN);
      parsed.isDefaultFinance = true;
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
        editorPinHash: createSaltedHash(DEFAULT_EDITOR_PIN),
        isDefaultEditor: true,
        financePinHash: createSaltedHash(DEFAULT_FINANCE_PIN),
        isDefaultFinance: true,
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

function issueSessionToken(role = 'superadmin', payload = {}) {
  return jwt.sign(
    { role, ...payload, issuedAt: Date.now() },
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

  let matchedRole = null;
  if (verifyCredential(pin, auth.pinHash)) {
    matchedRole = 'superadmin';
  } else if (auth.editorPinHash && verifyCredential(pin, auth.editorPinHash)) {
    matchedRole = 'editor';
  } else if (auth.financePinHash && verifyCredential(pin, auth.financePinHash)) {
    matchedRole = 'finance';
  }

  if (matchedRole) {
    // Successful login — reset lockout
    auth.pinLockout = { attempts: 0, lockedUntil: null };
    writeAuth(auth);

    const token = issueSessionToken(matchedRole);

    return res.json({
      success: true,
      token,
      role: matchedRole,
      pinHash: auth.pinHash,
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
    const left = MAX_ATTEMPTS - auth.pinLockout.attempts;
    return res.status(401).json({
      success: false,
      message: left > 0 ? `Incorrect PIN. ${left} attempt(s) remaining.` : 'Too many failed attempts. Locked out for 5 minutes.',
      remainingAttempts: Math.max(0, left),
      lockoutUntil: auth.pinLockout.lockedUntil
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

// Helper to verify a new PIN does not collide with any other role or key
function checkPinCollision(plainPin, targetKey, auth) {
  const credentialsToCheck = [
    { key: 'pinHash', name: 'Super Admin PIN', defaultVal: DEFAULT_PIN },
    { key: 'editorPinHash', name: 'Content Editor PIN', defaultVal: DEFAULT_EDITOR_PIN },
    { key: 'financePinHash', name: 'Finance Officer PIN', defaultVal: DEFAULT_FINANCE_PIN },
    { key: 'securityKeyHash', name: 'Master Security Key', defaultVal: DEFAULT_SECURITY_KEY }
  ];

  for (const cred of credentialsToCheck) {
    if (cred.key === targetKey) continue;

    // Check if plainPin matches current stored hash
    if (auth[cred.key] && verifyCredential(plainPin, auth[cred.key])) {
      return cred.name;
    }
    // Check if plainPin matches default value of that other credential
    if (plainPin === cred.defaultVal) {
      return cred.name;
    }
  }

  return null;
}

/** POST /api/auth/change-security-key — body: { newSecurityKey: "987654" } */
function changeSecurityKey(req, res) {
  const { newSecurityKey } = req.body;
  if (!newSecurityKey || typeof newSecurityKey !== 'string' || newSecurityKey.length !== 6 || !/^\d{6}$/.test(newSecurityKey)) {
    return res.status(400).json({ success: false, message: 'New Security Key must be a 6-digit numeric string.' });
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
    return res.status(400).json({ success: false, message: 'Cannot use default Master Key "999999".' });
  }

  const collision = checkPinCollision(newSecurityKey, 'securityKeyHash', auth);
  if (collision) {
    return res.status(400).json({
      success: false,
      message: `Cannot use this Master Key: it conflicts with the ${collision}. All system keys must be unique.`
    });
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

  if (!newPin || typeof newPin !== 'string' || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    return res.status(400).json({ success: false, message: 'New PIN must be a 6-digit numeric string.' });
  }

  const auth = readAuth();

  if (newPin === DEFAULT_PIN) {
    return res.status(400).json({ success: false, message: 'Cannot use the default PIN "123456".' });
  }

  const collision = checkPinCollision(newPin, 'pinHash', auth);
  if (collision) {
    return res.status(400).json({
      success: false,
      message: `Cannot use this PIN: it conflicts with the ${collision}. All role passwords must be unique.`
    });
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
    req.user = decoded;
    return next();
  }

  // Backward compatibility fallback for store migration
  const auth = readAuth();
  if (safeCompare(authHeader, auth.pinHash)) {
    req.user = { role: 'superadmin' };
    return next();
  }

  return res.status(401).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      const userRole = req.user?.role || 'superadmin';
      if (userRole === 'superadmin' || allowedRoles.includes(userRole)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: `Access denied. Your role (${userRole}) is not permitted to perform this action.`
      });
    });
  };
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

/** GET /api/auth/roles-status */
function getRolesStatus(req, res) {
  const auth = readAuth();
  const roles = [
    {
      role: 'editor',
      title: 'Content Editor',
      badge: 'Editor',
      description: 'Manages website content, news, gallery, programmes, impact metrics, and reviews volunteer/job submissions.',
      isDefault: auth.isDefaultEditor ?? true,
      defaultPin: DEFAULT_EDITOR_PIN,
      allowedSections: ['Hero Slider', 'Events Ticker', 'About Section', 'Programmes', 'Impact Numbers', 'Gallery', 'Partners', 'Team', 'Contact Page', 'Careers Page', 'Legal Pages', 'Media Library'],
      restrictedSections: ['Donations Financials', 'Master Security Keys', 'System Backups', 'Global Settings', 'Audit Logs']
    },
    {
      role: 'finance',
      title: 'Finance & Compliance Officer',
      badge: 'Finance',
      description: 'Monitors donations, tracks 80G tax exemptions, exports Form 10BD CSV for Income Tax filing, and downloads official 80G PDF receipts.',
      isDefault: auth.isDefaultFinance ?? true,
      defaultPin: DEFAULT_FINANCE_PIN,
      allowedSections: ['Dashboard Analytics', 'Submissions Inquiries', 'Donations Log & Receipts', 'Form 10BD Export', 'Newsletter Subscribers'],
      restrictedSections: ['CMS Page Editors', 'Hero Slider', 'About Section', 'Master Security Keys', 'System Backups', 'Media Library']
    }
  ];

  return res.json({ success: true, roles });
}

/** POST /api/auth/change-role-pin — body: { role: 'editor' | 'finance', newPin?: '...', resetToDefault?: boolean } */
function changeRolePin(req, res) {
  const { role, resetToDefault } = req.body;
  let { newPin } = req.body;

  if (!role || !['editor', 'finance'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Role must be editor or finance.' });
  }

  if (resetToDefault) {
    newPin = role === 'editor' ? DEFAULT_EDITOR_PIN : DEFAULT_FINANCE_PIN;
  } else if (!newPin || typeof newPin !== 'string' || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    return res.status(400).json({ success: false, message: 'PIN must be a 6-digit numeric string.' });
  }

  const auth = readAuth();
  const targetKey = role === 'editor' ? 'editorPinHash' : 'financePinHash';

  if (!resetToDefault) {
    const collision = checkPinCollision(newPin, targetKey, auth);
    if (collision) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign this PIN: it conflicts with the ${collision}. Each portal role must have a distinct, unique PIN.`
      });
    }
  }

  const newHashed = createSaltedHash(newPin);
  const isDefault = (newPin === (role === 'editor' ? DEFAULT_EDITOR_PIN : DEFAULT_FINANCE_PIN));

  if (role === 'editor') {
    auth.editorPinHash = newHashed;
    auth.isDefaultEditor = isDefault;
  } else {
    auth.financePinHash = newHashed;
    auth.isDefaultFinance = isDefault;
  }
  writeAuth(auth);

  return res.json({ 
    success: true, 
    message: `${role === 'editor' ? 'Content Editor' : 'Finance Officer'} PIN ${resetToDefault ? `reset to default (${newPin})` : 'updated successfully'}.`,
    isDefault
  });
}

module.exports = {
  verifyPin,
  verifySecurityKey,
  changeSecurityKey,
  changePin,
  changeRolePin,
  getRolesStatus,
  requireAuth,
  requireRole,
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
