const fs = require('fs');
const path = require('path');
const express = require('express');
const storageService = require('../services/storageService');

const router = express.Router();

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function validateFilename(req, res) {
  const name = req.query.name;
  if (!name) {
    res.status(400).json({ error: 'Missing file name' });
    return null;
  }
  const filePath = storageService.safeFilePath(name);
  if (!filePath) {
    res.status(400).json({ error: 'Invalid file name' });
    return null;
  }
  return filePath;
}

function parseRangeHeader(rangeHeader, size) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null;
  const range = rangeHeader.slice(6);
  const parts = range.split(',')[0].split('-');
  const start = Number(parts[0]);
  const end = parts[1] ? Number(parts[1]) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= size) {
    return null;
  }

  return { start, end };
}

router.get('/file', (req, res) => {
  const filePath = validateFilename(req, res);
  if (!filePath) return;

  storageService.ensureStorageDir();
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const stat = fs.statSync(filePath);
  const fileName = String(req.query.name || path.basename(filePath));
  const range = parseRangeHeader(req.headers.range, stat.size);

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'no-cache');

  if (range) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`);
    res.setHeader('Content-Length', String(range.end - range.start + 1));

    const stream = fs.createReadStream(filePath, { start: range.start, end: range.end, highWaterMark: 1024 * 1024 });
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Unable to stream file' });
      } else {
        res.end();
      }
    });
    return stream.pipe(res);
  }

  res.setHeader('Content-Length', String(stat.size));
  const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unable to stream file' });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
});

router.get('/file/content', (req, res) => {
  const filePath = validateFilename(req, res);
  if (!filePath) return;

  storageService.ensureStorageDir();
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    res.json({ filename: req.query.name, content, size: stat.size, modified: stat.mtime });
  } catch (err) {
    res.status(500).json({ error: 'Unable to read file content' });
  }
});

router.post('/file/save', express.json(), (req, res) => {
  const filePath = validateFilename(req, res);
  if (!filePath) return;

  if (!req.body || typeof req.body.content !== 'string') {
    return res.status(400).json({ error: 'Missing content to save' });
  }

  storageService.ensureStorageDir();

  try {
    fs.writeFileSync(filePath, req.body.content, 'utf8');
    const stat = fs.statSync(filePath);
    res.json({ ok: true, filename: req.query.name, size: stat.size, modified: stat.mtime });
  } catch (err) {
    res.status(500).json({ error: 'Unable to save file content' });
  }
});

router.post('/file', (req, res) => {
  const filePath = validateFilename(req, res);
  if (!filePath) return;

  storageService.ensureStorageDir();
  const tmpPath = storageService.tempFilePath(req.query.name);
  const mode = (req.query.mode || 'overwrite').toString().toLowerCase();
  const overwrite = mode !== 'append';

  if (overwrite && fs.existsSync(tmpPath)) {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }

  let inputData;
  if (req.is('application/json') && req.body && typeof req.body === 'object') {
    if (req.body.data !== undefined) {
      inputData = Buffer.from(String(req.body.data), 'utf8');
    } else {
      return res.status(400).json({ error: 'Missing json.data for JSON upload' });
    }
  }

  if (inputData) {
    try {
      fs.writeFileSync(tmpPath, inputData, { flag: overwrite ? 'w' : 'a' });
      if (overwrite) fs.renameSync(tmpPath, filePath);
      return res.status(201).json({ ok: true, filename: req.query.name, bytes: inputData.length, mode: overwrite ? 'overwrite' : 'append' });
    } catch (err) {
      return res.status(500).json({ error: 'Write failure' });
    }
  }

  const writeStream = fs.createWriteStream(tmpPath, { flags: overwrite ? 'w' : 'a' });
  let received = 0;
  const contentLength = req.headers['content-length'] ? Number(req.headers['content-length']) : null;

  req.on('data', (chunk) => {
    received += chunk.length;
    if (contentLength !== null && received > contentLength) {
      writeStream.destroy();
      res.status(400).json({ error: 'Too much data sent' });
    }
  });

  req.on('error', () => {
    writeStream.destroy();
    res.status(500).json({ error: 'Upload stream error' });
  });

  writeStream.on('error', () => {
    res.status(500).json({ error: 'Write stream error' });
  });

  writeStream.on('finish', () => {
    if (overwrite) {
      try {
        fs.renameSync(tmpPath, filePath);
      } catch (err) {
        return res.status(500).json({ error: 'Failed finalize upload' });
      }
    }
    res.status(201).json({ ok: true, filename: req.query.name, bytes: received, mode: overwrite ? 'overwrite' : 'append' });
  });

  req.pipe(writeStream);
});

router.post('/file/append', (req, res) => {
  const filePath = validateFilename(req, res);
  if (!filePath) return;

  storageService.ensureStorageDir();
  const writeStream = fs.createWriteStream(filePath, { flags: 'a' });
  let received = 0;
  const contentLength = req.headers['content-length'] ? Number(req.headers['content-length']) : null;

  req.on('data', (chunk) => {
    received += chunk.length;
    if (contentLength !== null && received > contentLength) {
      writeStream.destroy();
      res.status(400).json({ error: 'Too much data sent' });
    }
  });

  req.on('error', () => {
    writeStream.destroy();
    res.status(500).json({ error: 'Upload stream error' });
  });

  writeStream.on('error', () => {
    res.status(500).json({ error: 'Write stream error' });
  });

  writeStream.on('finish', () => {
    res.status(201).json({ ok: true, filename: req.query.name, bytes: received, mode: 'append' });
  });

  req.pipe(writeStream);
});

router.post('/file/chunk', (req, res) => {
  const filePath = validateFilename(req, res);
  if (!filePath) return;

  storageService.ensureStorageDir();
  const tmpPath = storageService.tempFilePath(req.query.name);
  const partIndex = parsePositiveInt(req.query.part);
  const totalParts = parsePositiveInt(req.query.total);
  const overwrite = (req.query.mode || 'overwrite').toString().toLowerCase() !== 'append';

  if (!partIndex || !totalParts) {
    return res.status(400).json({ error: 'Both query params part and total are required for chunked uploads' });
  }

  if (overwrite && partIndex === 1 && fs.existsSync(tmpPath)) {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }

  const writeStream = fs.createWriteStream(tmpPath, { flags: 'a' });
  let received = 0;
  const contentLength = req.headers['content-length'] ? Number(req.headers['content-length']) : null;

  req.on('data', (chunk) => {
    received += chunk.length;
    if (contentLength !== null && received > contentLength) {
      writeStream.destroy();
      return res.status(400).json({ error: 'Too much data sent' });
    }
  });

  req.on('error', () => {
    if (!res.headersSent) {
      writeStream.destroy();
      return res.status(500).json({ error: 'Chunk upload stream error' });
    }
  });

  writeStream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chunk write error' });
    }
  });

  writeStream.on('finish', () => {
    if (partIndex === totalParts) {
      try {
        fs.renameSync(tmpPath, filePath);
      } catch (err) {
        return res.status(500).json({ error: 'Failed finalizing chunked upload' });
      }
    }

    res.status(200).json({
      ok: true,
      filename: req.query.name,
      part: partIndex,
      totalParts,
      bytes: received,
      ready: partIndex === totalParts,
    });
  });

  req.pipe(writeStream);
});

router.post('/file/bulk', express.json({ limit: '50mb' }), (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Expected an array of file objects in the request body' });
  }

  const results = [];
  let totalBytes = 0;

  for (const item of items) {
    if (!item || typeof item.name !== 'string' || (typeof item.content !== 'string' && !Buffer.isBuffer(item.content))) {
      return res.status(400).json({ error: 'Each file item must include a string name and content' });
    }

    const filePath = storageService.safeFilePath(item.name);
    if (!filePath) {
      return res.status(400).json({ error: `Invalid file name: ${item.name}` });
    }

    const content = Buffer.isBuffer(item.content) ? item.content : Buffer.from(item.content, 'utf8');
    fs.writeFileSync(filePath, content);
    totalBytes += content.length;
    results.push({ filename: item.name, bytes: content.length });
  }

  res.status(201).json({
    ok: true,
    uploaded: results.length,
    totalBytes,
    files: results,
  });
});

router.get('/files', (req, res) => {
  try {
    const files = storageService.listFiles();
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: 'Could not read storage directory' });
  }
});

router.get('/storage', (req, res) => {
  try {
    const stats = storageService.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Could not read storage status' });
  }
});

router.delete('/file', (req, res) => {
  const filePath = validateFilename(req, res);
  if (!filePath) return;

  if (!storageService.deleteFile(req.query.name)) {
    return res.status(404).json({ error: 'File not found or invalid name' });
  }

  res.json({ ok: true, filename: req.query.name });
});

module.exports = router;
