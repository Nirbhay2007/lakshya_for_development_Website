const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'lakshya.db');
let db = new Database(DB_PATH);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');

// --- Create Tables ---
db.exec(`
  CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    amount REAL NOT NULL,
    purpose TEXT DEFAULT 'General NGO Support',
    paymentMethod TEXT DEFAULT 'Razorpay',
    transactionRef TEXT UNIQUE,
    status TEXT DEFAULT 'SUCCESS',
    claim80g INTEGER DEFAULT 0,
    panNumber TEXT,
    address TEXT,
    frequency TEXT DEFAULT 'one-time',
    receiptNumber TEXT,
    date TEXT NOT NULL,
    createdAt INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date);
  CREATE INDEX IF NOT EXISTS idx_donations_ref ON donations(transactionRef);
  CREATE INDEX IF NOT EXISTS idx_donations_claim80g ON donations(claim80g);
  CREATE INDEX IF NOT EXISTS idx_donations_pan ON donations(panNumber);
  CREATE INDEX IF NOT EXISTS idx_donations_email ON donations(email);
  CREATE INDEX IF NOT EXISTS idx_donations_phone ON donations(phone);
  CREATE INDEX IF NOT EXISTS idx_donations_receipt ON donations(receiptNumber);

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT,
    status TEXT DEFAULT 'NEW',
    notes TEXT,
    date TEXT NOT NULL,
    createdAt INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(date);
  CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

  CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    subscribedAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);

  CREATE TABLE IF NOT EXISTS revisions (
    id TEXT PRIMARY KEY,
    section TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT DEFAULT 'Admin',
    timestamp TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_revisions_section ON revisions(section, timestamp DESC);

  CREATE TABLE IF NOT EXISTS broadcasts (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    pdfUrl TEXT,
    targetFilter TEXT DEFAULT 'all',
    recipientCount INTEGER DEFAULT 0,
    openCount INTEGER DEFAULT 0,
    sentAt TEXT NOT NULL,
    createdAt INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_broadcasts_sentAt ON broadcasts(sentAt DESC);

  CREATE TABLE IF NOT EXISTS broadcast_opens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broadcastId TEXT NOT NULL,
    email TEXT NOT NULL,
    openedAt TEXT NOT NULL,
    UNIQUE(broadcastId, email)
  );

  CREATE INDEX IF NOT EXISTS idx_broadcast_opens_bid ON broadcast_opens(broadcastId);
`);

// --- Automated Migration from Legacy JSON Files ---
function migrateLegacyJSON() {
  try {
    // 1. Submissions migration
    const submissionsJsonPath = path.join(DATA_DIR, 'submissions.json');
    if (fs.existsSync(submissionsJsonPath)) {
      try {
        const raw = fs.readFileSync(submissionsJsonPath, 'utf-8');
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO submissions (id, type, name, email, phone, subject, message, status, notes, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const migrateAll = db.transaction((rows) => {
            for (const item of rows) {
              insertStmt.run(
                item.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                item.type || 'Contact Form',
                item.name || '',
                item.email || '',
                item.phone || '',
                item.subject || '',
                item.message || '',
                item.status || 'NEW',
                item.notes || '',
                item.date || new Date().toISOString()
              );
            }
          });
          migrateAll(items);
          console.log(`[DB MIGRATION] Migrated ${items.length} legacy submissions to SQLite.`);
        }
      } catch (err) {
        console.warn('[DB MIGRATION WARN] Failed migrating submissions.json:', err.message);
      }
    }

    // 2. Donations migration
    const donationsJsonPath = path.join(DATA_DIR, 'donations.json');
    if (fs.existsSync(donationsJsonPath)) {
      try {
        const raw = fs.readFileSync(donationsJsonPath, 'utf-8');
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO donations (id, name, email, phone, amount, purpose, paymentMethod, transactionRef, status, claim80g, panNumber, address, frequency, receiptNumber, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const migrateAll = db.transaction((rows) => {
            for (const item of rows) {
              insertStmt.run(
                item.id || `don_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                item.name || 'Anonymous Donor',
                item.email || '',
                item.phone || '',
                Number(item.amount) || 0,
                item.purpose || 'General NGO Support',
                item.paymentMethod || 'Razorpay',
                item.transactionRef || item.id,
                item.status || 'SUCCESS',
                item.claim80g ? 1 : 0,
                item.panNumber || '',
                item.address || '',
                item.frequency || 'one-time',
                item.receiptNumber || '',
                item.date || new Date().toISOString()
              );
            }
          });
          migrateAll(items);
          console.log(`[DB MIGRATION] Migrated ${items.length} legacy donations to SQLite.`);
        }
      } catch (err) {
        console.warn('[DB MIGRATION WARN] Failed migrating donations.json:', err.message);
      }
    }

    // 3. Subscribers migration
    const subscribersJsonPath = path.join(DATA_DIR, 'subscribers.json');
    if (fs.existsSync(subscribersJsonPath)) {
      try {
        const raw = fs.readFileSync(subscribersJsonPath, 'utf-8');
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO subscribers (id, email, status, subscribedAt)
            VALUES (?, ?, ?, ?)
          `);
          const migrateAll = db.transaction((rows) => {
            for (const item of rows) {
              const email = typeof item === 'string' ? item : (item.email || '');
              if (email) {
                insertStmt.run(
                  typeof item === 'object' && item.id ? item.id : `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  email.toLowerCase().trim(),
                  typeof item === 'object' && item.status ? item.status : 'active',
                  typeof item === 'object' && item.subscribedAt ? item.subscribedAt : new Date().toISOString()
                );
              }
            }
          });
          migrateAll(items);
          console.log(`[DB MIGRATION] Migrated ${items.length} legacy subscribers to SQLite.`);
        }
      } catch (err) {
        console.warn('[DB MIGRATION WARN] Failed migrating subscribers.json:', err.message);
      }
    }
  } catch (globalErr) {
    console.warn('[DB MIGRATION WARN] General migration issue:', globalErr.message);
  }
}

migrateLegacyJSON();

// --- Helper Functions: Donations ---

function getDonations(options = {}) {
  let query = 'SELECT * FROM donations WHERE 1=1';
  const params = [];

  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  if (options.claim80g !== undefined) {
    query += ' AND claim80g = ?';
    params.push(options.claim80g ? 1 : 0);
  }
  if (options.search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR panNumber LIKE ? OR transactionRef LIKE ?)';
    const s = `%${options.search.trim()}%`;
    params.push(s, s, s, s, s);
  }
  if (options.dateFrom) {
    query += ' AND date >= ?';
    params.push(options.dateFrom);
  }
  if (options.dateTo) {
    query += ' AND date <= ?';
    params.push(options.dateTo);
  }

  query += ' ORDER BY date DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(Number(options.limit));
  }

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    claim80g: Boolean(r.claim80g)
  }));
}

function getDonationById(id) {
  const row = db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, claim80g: Boolean(row.claim80g) };
}

function getDonationByTransactionRef(ref) {
  const row = db.prepare('SELECT * FROM donations WHERE transactionRef = ?').get(ref);
  if (!row) return null;
  return { ...row, claim80g: Boolean(row.claim80g) };
}

function saveDonation(data) {
  const donorName = data.name || data.donorName || 'Anonymous Donor';
  const donorEmail = data.email || data.donorEmail || '';
  const donorPhone = data.phone || data.donorPhone || '';
  const donorPan = data.panNumber || data.donorPan || '';
  const donorAddress = data.address || data.donorAddress || '';
  const is80g = (data.claim80g || data.is80gClaimed) ? 1 : 0;

  const existing = data.transactionRef ? getDonationByTransactionRef(data.transactionRef) : null;
  if (existing) {
    const updateStmt = db.prepare(`
      UPDATE donations
      SET name = ?, email = ?, phone = ?, amount = ?, purpose = ?, paymentMethod = ?, status = ?, claim80g = ?, panNumber = ?, address = ?, frequency = ?, receiptNumber = COALESCE(receiptNumber, ?)
      WHERE transactionRef = ?
    `);
    updateStmt.run(
      donorName,
      donorEmail,
      donorPhone,
      Number(data.amount),
      data.purpose || 'General NGO Support',
      data.paymentMethod || 'Razorpay',
      data.status || 'SUCCESS',
      is80g,
      donorPan,
      donorAddress,
      data.frequency || 'one-time',
      data.receiptNumber || null,
      data.transactionRef
    );
    return getDonationByTransactionRef(data.transactionRef);
  }

  const id = data.id || `don_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const date = data.date || data.timestamp || new Date().toISOString();
  const yearStr = new Date(date).getFullYear();
  const nextYearStr = String(yearStr + 1).slice(-2);
  const receiptNumber = data.receiptNumber || `LAKSHYA/80G/${yearStr}-${nextYearStr}/${Math.floor(1000 + Math.random() * 9000)}`;

  const insertStmt = db.prepare(`
    INSERT INTO donations (id, name, email, phone, amount, purpose, paymentMethod, transactionRef, status, claim80g, panNumber, address, frequency, receiptNumber, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    id,
    donorName,
    donorEmail,
    donorPhone,
    Number(data.amount),
    data.purpose || 'General NGO Support',
    data.paymentMethod || 'Razorpay',
    data.transactionRef || `txn_${Date.now()}`,
    data.status || 'SUCCESS',
    is80g,
    donorPan,
    donorAddress,
    data.frequency || 'one-time',
    receiptNumber,
    date
  );

  return getDonationById(id);
}

function deleteDonation(id) {
  const res = db.prepare('DELETE FROM donations WHERE id = ?').run(id);
  return res.changes > 0;
}

function getDonationStats() {
  const totals = db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(amount), 0) as totalAmount,
      SUM(CASE WHEN claim80g = 1 THEN 1 ELSE 0 END) as count80g
    FROM donations
    WHERE status = 'SUCCESS'
  `).get();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth = db.prepare(`
    SELECT
      COUNT(*) as monthCount,
      COALESCE(SUM(amount), 0) as monthAmount
    FROM donations
    WHERE status = 'SUCCESS' AND date >= ?
  `).get(startOfMonth);

  const topPurposeRow = db.prepare(`
    SELECT purpose, COUNT(*) as count
    FROM donations
    WHERE status = 'SUCCESS'
    GROUP BY purpose
    ORDER BY count DESC
    LIMIT 1
  `).get();

  return {
    count: totals.count || 0,
    totalAmount: totals.totalAmount || 0,
    count80g: totals.count80g || 0,
    thisMonthCount: thisMonth.monthCount || 0,
    thisMonthAmount: thisMonth.monthAmount || 0,
    topPurpose: topPurposeRow ? topPurposeRow.purpose : 'General NGO Support'
  };
}

// --- Helper Functions: Submissions ---

function getSubmissions(options = {}) {
  let query = 'SELECT * FROM submissions WHERE 1=1';
  const params = [];

  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  if (options.type) {
    query += ' AND type = ?';
    params.push(options.type);
  }
  if (options.search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR subject LIKE ? OR message LIKE ?)';
    const s = `%${options.search.trim()}%`;
    params.push(s, s, s, s, s);
  }

  query += ' ORDER BY date DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(Number(options.limit));
  }

  return db.prepare(query).all(...params);
}

function getSubmissionById(id) {
  return db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
}

function saveSubmission(data) {
  const id = data.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const date = data.date || new Date().toISOString();
  const insertStmt = db.prepare(`
    INSERT INTO submissions (id, type, name, email, phone, subject, message, status, notes, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStmt.run(
    id,
    data.type || 'Contact Form',
    data.name,
    data.email,
    data.phone || '',
    data.subject || '',
    data.message || '',
    data.status || 'NEW',
    data.notes || '',
    date
  );
  return getSubmissionById(id);
}

function updateSubmissionStatus(id, status, notes = null) {
  if (notes !== null) {
    db.prepare('UPDATE submissions SET status = ?, notes = ? WHERE id = ?').run(status, notes, id);
  } else {
    db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run(status, id);
  }
  return getSubmissionById(id);
}

function deleteSubmission(id) {
  const res = db.prepare('DELETE FROM submissions WHERE id = ?').run(id);
  return res.changes > 0;
}

// --- Helper Functions: Subscribers ---

function getSubscribers() {
  return db.prepare('SELECT * FROM subscribers WHERE status = ? ORDER BY subscribedAt DESC').all('active');
}

function addSubscriber(email) {
  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(cleanEmail);
  if (existing) {
    if (existing.status !== 'active') {
      db.prepare('UPDATE subscribers SET status = ? WHERE email = ?').run('active', cleanEmail);
    }
    return { success: true, email: cleanEmail, isNew: false };
  }
  const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO subscribers (id, email, status, subscribedAt) VALUES (?, ?, ?, ?)').run(id, cleanEmail, 'active', now);
  return { success: true, email: cleanEmail, isNew: true };
}

function removeSubscriber(email) {
  const cleanEmail = email.trim().toLowerCase();
  db.prepare('UPDATE subscribers SET status = ? WHERE email = ?').run('unsubscribed', cleanEmail);
  return { success: true, email: cleanEmail };
}

// --- Helper Functions: Revisions (Rollback System) ---

function saveRevision(section, content, author = 'Admin', customId = null) {
  const id = customId || `rev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const timestamp = new Date().toISOString();
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

  db.prepare('INSERT INTO revisions (id, section, content, author, timestamp) VALUES (?, ?, ?, ?, ?)').run(
    id,
    section,
    contentStr,
    author,
    timestamp
  );

  // Prune revisions older than latest 10 for this section
  db.prepare(`
    DELETE FROM revisions
    WHERE section = ? AND id NOT IN (
      SELECT id FROM revisions WHERE section = ? ORDER BY timestamp DESC LIMIT 10
    )
  `).run(section, section);

  return { id, section, author, timestamp };
}

function getRevisions(section, limit = 10) {
  return db.prepare('SELECT id, section, author, timestamp FROM revisions WHERE section = ? ORDER BY timestamp DESC LIMIT ?').all(section, limit);
}

function getRevisionById(id) {
  const rev = db.prepare('SELECT * FROM revisions WHERE id = ?').get(id);
  if (!rev) return null;
  try {
    return { ...rev, content: JSON.parse(rev.content) };
  } catch (e) {
    return rev;
  }
}

function backupDatabase(targetPath) {
  return db.backup(targetPath);
}

function restoreDatabaseFromFile(incomingDbPath) {
  if (!fs.existsSync(incomingDbPath)) {
    throw new Error(`Incoming database file does not exist at ${incomingDbPath}`);
  }
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    fs.copyFileSync(incomingDbPath, DB_PATH);
    const walFile = DB_PATH + '-wal';
    const shmFile = DB_PATH + '-shm';
    if (fs.existsSync(walFile)) {
      try { fs.unlinkSync(walFile); } catch (e) {}
    }
    if (fs.existsSync(shmFile)) {
      try { fs.unlinkSync(shmFile); } catch (e) {}
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    return true;
  } catch (err) {
    console.error('Failed to restore database from snapshot:', err);
    throw err;
  }
}

function lookupDonationsByDonor(rawIdentifier) {
  if (!rawIdentifier || typeof rawIdentifier !== 'string') return [];
  const trimmed = rawIdentifier.trim();
  if (trimmed.length < 3) return [];

  const isEmail = trimmed.includes('@');
  const digitsOnly = trimmed.replace(/\D/g, '');
  const isPan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(trimmed);

  let query = 'SELECT * FROM donations WHERE 1=0';
  const params = [];

  if (isPan) {
    query += ' OR UPPER(panNumber) = UPPER(?)';
    params.push(trimmed.toUpperCase());
  }
  if (isEmail) {
    query += ' OR LOWER(email) = LOWER(?)';
    params.push(trimmed.toLowerCase());
  }
  if (digitsOnly.length >= 7) {
    const lastDigits = digitsOnly.slice(-10);
    query += " OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', '') LIKE ?";
    params.push(`%${lastDigits}%`);
  }

  // Also match transactionRef or receiptNumber directly
  query += ' OR transactionRef = ? OR receiptNumber = ? OR id = ?';
  params.push(trimmed, trimmed, trimmed);

  query += ' ORDER BY date DESC LIMIT 50';

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    claim80g: Boolean(r.claim80g)
  }));
}

function saveBroadcast(data) {
  const id = data.id || `bc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const stmt = db.prepare(`
    INSERT INTO broadcasts (id, subject, pdfUrl, targetFilter, recipientCount, openCount, sentAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    data.subject || 'Newsletter Broadcast',
    data.pdfUrl || '',
    data.targetFilter || 'all',
    Number(data.recipientCount) || 0,
    Number(data.openCount) || 0,
    data.sentAt || new Date().toISOString()
  );
  return { id, ...data };
}

function getBroadcasts(limit = 20) {
  const rows = db.prepare('SELECT * FROM broadcasts ORDER BY sentAt DESC LIMIT ?').all(limit);
  return rows.map(r => ({
    ...r,
    openRate: r.recipientCount > 0 ? Math.round((r.openCount / r.recipientCount) * 100) : 0
  }));
}

function recordBroadcastOpen(broadcastId, email) {
  if (!broadcastId || !email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO broadcast_opens (broadcastId, email, openedAt)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(broadcastId, normalizedEmail, new Date().toISOString());
    if (info.changes > 0) {
      db.prepare('UPDATE broadcasts SET openCount = openCount + 1 WHERE id = ?').run(broadcastId);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function closeDatabase() {
  try {
    if (db && db.open) {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    }
  } catch (e) {
    console.error('Error closing SQLite database:', e);
  }
}

module.exports = {
  get db() { return db; },
  closeDatabase,
  backupDatabase,
  restoreDatabaseFromFile,
  getDonations,
  getDonationById,
  getDonationByTransactionRef,
  lookupDonationsByDonor,
  saveDonation,
  deleteDonation,
  getDonationStats,
  getSubmissions,
  getSubmissionById,
  saveSubmission,
  updateSubmissionStatus,
  deleteSubmission,
  getSubscribers,
  addSubscriber,
  removeSubscriber,
  saveRevision,
  getRevisions,
  getRevisionById,
  saveBroadcast,
  getBroadcasts,
  recordBroadcastOpen
};
