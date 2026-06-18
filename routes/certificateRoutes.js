const express = require('express');
const path = require('path');
const certificateService = require('../services/certificateService');

const router = express.Router();

router.get('/api/certificates', (req, res) => {
  try {
    const paths = certificateService.getConfiguredCertificatePaths();
    res.json({
      ok: true,
      ...paths,
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'local',
      note: process.env.VERCEL
        ? 'Certificate files are not read from disk on Vercel. Use environment variables or secret storage instead.'
        : 'Certificate files can be read from configured paths in local development.',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'Failed to load certificate paths' });
  }
});

router.get('/certificate/download', (req, res) => {
  try {
    const type = String(req.query.type || '').toLowerCase();
    const { sslCertPath, sslKeyPath, sslCaPath } = certificateService.getConfiguredCertificatePaths();

    let selected;
    let mime;
    if (type === 'cert') {
      selected = sslCertPath;
      mime = 'application/x-pem-file';
    } else if (type === 'key') {
      selected = sslKeyPath;
      mime = 'application/x-pem-file';
    } else if (type === 'ca' || type === 'cacert' || type === 'cacertificates') {
      selected = sslCaPath;
      mime = 'application/x-pem-file';
    } else {
      return res.status(400).json({ ok: false, error: 'Invalid type. Use type=cert|key|ca' });
    }

    if (!selected) {
      return res.status(404).json({ ok: false, error: `Certificate path not configured for type=${type}` });
    }

    if (process.env.VERCEL) {
      return res.status(501).json({
        ok: false,
        error: 'Certificate download is not supported in Vercel serverless runtime.',
        type,
      });
    }

    const file = certificateService.safeReadFile(path.resolve(selected));
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.status(200).send(file.buffer);
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message || 'Unable to download certificate' });
  }
});

module.exports = router;

