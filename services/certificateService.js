const fs = require('fs');
const path = require('path');
const configService = require('./configService');

function normalizePath(p) {
  if (!p || typeof p !== 'string') return '';
  const v = p.trim();
  return v;
}

function isSafeAbsoluteFilePath(absPath) {
  // Only allow absolute paths (prevents relative traversal surprises)
  // and prevent returning weird values.
  if (!absPath) return false;
  if (!path.isAbsolute(absPath)) return false;

  const normalized = path.normalize(absPath);
  // Disallow path segments that commonly indicate traversal.
  if (normalized.includes('..' + path.sep) || normalized.includes('..' + '/')) return false;

  return true;
}

function getConfiguredCertificatePaths() {
  const cfg = configService.getConfig();
  return {
    sslCertPath: normalizePath(cfg.sslCertPath),
    sslKeyPath: normalizePath(cfg.sslKeyPath),
    sslCaPath: normalizePath(cfg.sslCaPath),
  };
}

function safeReadFile(absPath) {
  const resolved = path.resolve(absPath);
  if (!isSafeAbsoluteFilePath(resolved)) {
    throw new Error('Unsafe file path');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error('File not found');
  }
  if (!fs.statSync(resolved).isFile()) {
    throw new Error('Path is not a file');
  }
  return {
    absPath: resolved,
    filename: path.basename(resolved),
    buffer: fs.readFileSync(resolved),
  };
}

module.exports = {
  getConfiguredCertificatePaths,
  safeReadFile,
};

