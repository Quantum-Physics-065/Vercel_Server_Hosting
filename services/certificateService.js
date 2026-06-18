const fs = require('fs');
const path = require('path');
const configService = require('./configService');

function normalizePath(p) {
  if (!p || typeof p !== 'string') return '';
  return p.trim();
}

function isSafeAbsoluteFilePath(absPath) {
  if (!absPath) return false;
  if (!path.isAbsolute(absPath)) return false;
  const normalized = path.normalize(absPath);
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

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error('Certificate file is not available in this runtime');
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

