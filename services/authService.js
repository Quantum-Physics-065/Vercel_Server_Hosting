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
    ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
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

function buildUserUrl(token, req) {
  const origin = req.protocol && req.get('host') ? `${req.protocol}://${req.get('host')}` : 'http://localhost:3000';
  return `${origin}/dashboard/user?token=${encodeURIComponent(token)}`;
}

module.exports = {
  createToken,
  validateToken,
  getUserDetails,
  buildUserUrl,
};