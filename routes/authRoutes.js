const express = require('express');
const authService = require('../services/authService');

const router = express.Router();

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, item) => {
    const [key, ...valueParts] = item.split('=');
    if (!key) return acc;
    acc[key.trim()] = decodeURIComponent(valueParts.join('=').trim());
    return acc;
  }, {});
}

function getCookieValue(req, name) {
  return parseCookies(req)[name] || '';
}

function getTokenFromRequest(req) {
  return req.query?.token || req.body?.token || req.headers.authorization?.replace('Bearer ', '') || getCookieValue(req, 'auth_token') || '';
}

function setTokenCookie(res, token, username) {
  const isSecure = res.req && (res.req.protocol === 'https' || res.req.headers['x-forwarded-proto'] === 'https');
  const options = {
    path: '/',
    maxAge: 60 * 60,
    sameSite: 'lax',
    secure: isSecure,
  };

  res.cookie('auth_token', token, { ...options, httpOnly: false });
  res.cookie('auth_username', username, { ...options, httpOnly: false });
}

router.post('/api/login', express.json(), (req, res) => {
  const username = req.body?.username?.toString().trim();

  if (!username) {
    return res.status(400).json({ ok: false, error: 'username is required' });
  }

  const token = authService.createToken(username);
  const url = authService.buildUserUrl(token, req);
  const requestsUrl = authService.buildRequestsUrl(token, req);

  setTokenCookie(res, token, username);
  res.json({ ok: true, token, username, url, requestsUrl, expiresIn: 3600 });
});

router.get('/api/session', (req, res) => {
  const token = getTokenFromRequest(req);
  const details = authService.getUserDetails(token, req);
  if (!details) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  res.json({
    ok: true,
    ...details,
    fromCookie: Boolean(getCookieValue(req, 'auth_token')), 
  });
});

router.get('/api/user-details', (req, res) => {
  const token = getTokenFromRequest(req);
  const details = authService.getUserDetails(token, req);
  if (!details) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  res.json(details);
});

router.get('/dashboard/login', (req, res) => {
  res.sendFile(require('path').join(__dirname, '..', 'public', 'login.html'));
});

router.all('/dashboard/user', (req, res) => {
  const token = req.query.token || req.body?.token || '';
  
  const requestDetails = {
    method: req.method,
    url: req.url,
    token: token,
    query: req.query,
    body: req.body,
    headers: req.headers
  };

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(requestDetails, null, 2));
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

