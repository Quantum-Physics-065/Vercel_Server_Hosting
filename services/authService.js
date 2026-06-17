const crypto = require('crypto');
const storageService = require('./storageService');
const configService = require('./configService');

const tokenStore = new Map();
const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

function createToken(username) {
  const token = crypto.randomBytes(24).toString('hex');
  tokenStore.set(token, { username, createdAt: Date.now() });
  return token;
}

function validateToken(token) {
  if (!token) return null;
  const entry = tokenStore.get(token);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) {
    tokenStore.delete(token);
    return null;
  }

  return {
    token,
    username: entry.username,
    createdAt: new Date(entry.createdAt).toISOString(),
  };
}

function getUserDetails(token, req) {
  const user = validateToken(token);
  if (!user) return null;

  const stats = storageService.getStats();
  const config = configService.getConfig();
  return {
    ok: true,
    username: user.username,
    token: user.token,
    createdAt: user.createdAt,
    ip: req.ip || req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress) || (req.socket && req.socket.remoteAddress) || 'unknown',
    userAgent: req.get('User-Agent') || null,
    server: {
      protocol: config.protocol,
      host: config.host,
      port: config.port,
      sslEnabled: config.useHttps,
      sslCertPath: config.sslCertPath || null,
      sslKeyPath: config.sslKeyPath || null,
      sslCaPath: config.sslCaPath || null,
    },
    storage: {
      uploadDir: stats.uploadDir,
      fileCount: stats.count,
      totalSize: stats.totalSize,
    },
  };
}

function buildOrigin(req) {
  const protocol = req.protocol || (req.headers['x-forwarded-proto'] ? String(req.headers['x-forwarded-proto']) : 'http');
  const hostHeader = req.get && req.get('host') ? String(req.get('host')) : '';

  // Strip default ports from host rendering.
  const [hostname, portStr] = hostHeader.split(':');
  const port = portStr ? Number(portStr) : undefined;

  const isDefaultPort =
    (protocol === 'http' && port === 80) ||
    (protocol === 'https' && port === 443);

  if (port && !isDefaultPort) {
    return `${protocol}://${hostname}:${port}`;
  }
  return `${protocol}://${hostname}`;
}

function buildUserUrl(token, req) {
  const origin = buildOrigin(req);
  return `${origin}/dashboard/user?token=${encodeURIComponent(token)}`;
}

function buildRequestsUrl(token, req) {
  const origin = buildOrigin(req);
  return `${origin}/token/${encodeURIComponent(token)}/requests`;
}

module.exports = {

  createToken,
  validateToken,
  getUserDetails,
  buildUserUrl,
  buildRequestsUrl,
};