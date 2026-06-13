const express = require('express');
const path = require('path');
const certificateService = require('../services/certificateService');

const router = express.Router();

router.get('/api/certificates', (req, res) => {
  try {
    const paths = certificateService.getConfiguredCertificatePaths();
    res.json({ ok: true, ...paths });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'Failed to load certificate paths' });
  }
});

// Download endpoints used by public/js/certificates.js
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
      return res.status(400).send('Invalid type. Use type=cert|key|ca');
    }

    if (!selected) {
      return res.status(404).send(`Certificate path not configured for type=${type}`);
    }

    const file = certificateService.safeReadFile(path.resolve(selected));

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.status(200).send(file.buffer);
  } catch (err) {
    res.status(400).send(err.message || 'Unable to download certificate');
  }
});

module.exports = router;

