const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const authService = require('../services/authService');
const storageService = require('../services/storageService');

const router = express.Router();

// Use memory storage so we can validate token and then write to disk.
const upload = multer({ storage: multer.memoryStorage() });

function requireValidToken(req, res) {
  const token = req.params.token || req.body?.token || req.query.token || req.headers.authorization?.replace('Bearer ', '');
  const user = authService.validateToken(token);
  if (!user) {
    res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    return null;
  }
  return user;
}

function tokenSafePrefix(token) {
  // Token is already hex, but keep it strictly filesystem-safe.
  return String(token).replace(/[^a-f0-9]/gi, '');
}

function ensureTokenDir(token) {
  const prefix = tokenSafePrefix(token);
  const dir = path.join(storageService.UPLOAD_DIR, prefix);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeWriteFile(dir, filename, content) {
  // Reuse storageService filename sanitization logic by writing as a real filename in token dir.
  const sanitized = storageService.safeFilePath(filename);
  if (!sanitized) throw new Error('Invalid filename');

  // sanitized already includes the base upload dir; we only need basename.
  const base = path.basename(sanitized);
  const filePath = path.join(dir, base);

  fs.writeFileSync(filePath, content);
  const stat = fs.statSync(filePath);
  return { filename: base, size: stat.size, modified: stat.mtime };
}

function listTokenFiles(token) {
  const dir = ensureTokenDir(token);
  return fs
    .readdirSync(dir)
    .filter((f) => !f.endsWith('.part'))
    .map((filename) => {
      const filePath = path.join(dir, filename);
      const stat = fs.statSync(filePath);
      return { filename, size: stat.size, modified: stat.mtime };
    });
}

// 1) Token landing page (optional) - serve the user page is already handled elsewhere.
router.get('/token/:token', (req, res) => {
  // Reuse existing user.html; it will call /api/user-details.
  res.redirect(`/dashboard/user?token=${encodeURIComponent(req.params.token)}`);
});

// 2) POST token JSON endpoint: store request body as a file.
router.post('/token/:token', express.json({ limit: '20mb' }), (req, res) => {
  try {
    const user = requireValidToken(req, res);
    if (!user) return;

    const token = req.params.token;
    const dir = ensureTokenDir(token);

    const payload = { receivedAt: new Date().toISOString(), body: req.body };

    const filename = `request-${Date.now()}.json`;
    const stored = safeWriteFile(dir, filename, JSON.stringify(payload, null, 2));

    res.json({ ok: true, stored: stored, username: user.username });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 3) POST token upload endpoint: store uploaded file(s).
router.post('/token/:token/upload', upload.single('file'), (req, res) => {
  try {
    const user = requireValidToken(req, res);
    if (!user) return;

    if (!req.file) {
      res.status(400).json({ ok: false, error: 'Missing file field (name="file")' });
      return;
    }

    const token = req.params.token;
    const dir = ensureTokenDir(token);

    const stored = safeWriteFile(dir, req.file.originalname || 'upload.bin', req.file.buffer);

    res.json({ ok: true, stored, username: user.username });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// List what was stored for a token.
router.get('/token/:token/requests', (req, res) => {
  const user = requireValidToken(req, res);
  if (!user) return;

  try {
    const token = req.params.token;
    const files = listTokenFiles(token);
    res.json({ ok: true, username: user.username, requests: files });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Could not list token requests' });
  }
});

module.exports = router;

