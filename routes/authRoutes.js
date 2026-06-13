const express = require('express');
const authService = require('../services/authService');

const router = express.Router();

router.post('/api/login', express.json(), (req, res) => {
  const username = req.body?.username?.toString().trim();

  if (!username) {
    return res.status(400).json({ ok: false, error: 'username is required' });
  }

  const token = authService.createToken(username);
  const url = authService.buildUserUrl(token, req);
  const requestsUrl = authService.buildRequestsUrl(token, req);

  res.json({ ok: true, token, username, url, requestsUrl, expiresIn: 3600 });
});

router.get('/api/user-details', (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  const details = authService.getUserDetails(token, req);
  if (!details) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  res.json(details);
});

router.get('/dashboard/login', (req, res) => {
  res.sendFile(require('path').join(__dirname, '..', 'public', 'login.html'));
});

router.get('/dashboard/user', (req, res) => {
  res.sendFile(require('path').join(__dirname, '..', 'public', 'user.html'));
});

// Token generator page + API
router.post('/api/token/generate', express.json(), (req, res) => {
  const username = req.body?.username?.toString().trim();
  if (!username) {
    return res.status(400).json({ ok: false, error: 'username is required' });
  }

  const token = authService.createToken(username);
  const url = authService.buildUserUrl(token, req);
  const requestsUrl = authService.buildRequestsUrl(token, req);

  res.json({
    ok: true,
    token,
    username,
    url,
    requestsUrl,
    expiresIn: 3600,
  });
});

router.get('/dashboard/token-generate', (req, res) => {
  res.sendFile(require('path').join(__dirname, '..', 'public', 'token-generate.html'));
});

module.exports = router;

