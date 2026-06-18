const fs = require('fs');
const path = require('path');

const MAX_FILENAME_LENGTH = 255;
const isVercelRuntime = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const FALLBACK_UPLOAD_DIR = isVercelRuntime ? '/tmp/file-server-storage' : path.join(__dirname, '..', 'storage');
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : FALLBACK_UPLOAD_DIR;

const memoryStore = globalThis.__FILE_SERVER_MEMORY_STORE__ || (globalThis.__FILE_SERVER_MEMORY_STORE__ = new Map());

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  if (filename.length > MAX_FILENAME_LENGTH) return null;

  const safeName = path.basename(filename);
  if (safeName !== filename) return null;
  if (safeName.includes('..')) return null;
  if (safeName.includes('/') || safeName.includes('\\')) return null;
  if (safeName.trim() !== safeName) return null;

  return safeName;
}

function ensureStorageDir() {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    if (error && error.code !== 'EACCES') {
      throw error;
    }
  }
}

function safeFilePath(filename) {
  const safeName = sanitizeFilename(filename);
  if (!safeName) return null;
  return path.join(UPLOAD_DIR, safeName);
}

function tempFilePath(filename) {
  const safeName = sanitizeFilename(filename);
  if (!safeName) return null;
  return path.join(UPLOAD_DIR, `${safeName}.part`);
}

function isMemoryStoreFile(filename) {
  return memoryStore.has(filename);
}

function getFileMeta(filePath, filename) {
  if (isVercelRuntime && isMemoryStoreFile(filename)) {
    const entry = memoryStore.get(filename);
    return {
      filename,
      size: entry.buffer.length,
      modified: entry.modified,
    };
  }

  const stat = fs.statSync(filePath);
  return {
    filename,
    size: stat.size,
    modified: stat.mtime,
  };
}

function listFiles() {
  ensureStorageDir();

  if (isVercelRuntime) {
    return Array.from(memoryStore.entries()).map(([filename, entry]) => ({
      filename,
      size: entry.buffer.length,
      modified: entry.modified,
    }));
  }

  return fs
    .readdirSync(UPLOAD_DIR)
    .filter((item) => {
      const fullPath = path.join(UPLOAD_DIR, item);
      return fs.statSync(fullPath).isFile() && !item.endsWith('.part');
    })
    .map((filename) => getFileMeta(path.join(UPLOAD_DIR, filename), filename));
}

function fileExists(filename) {
  const filePath = safeFilePath(filename);
  if (!filePath) return false;
  if (isVercelRuntime && isMemoryStoreFile(filename)) return true;
  return fs.existsSync(filePath);
}

function deleteFile(filename) {
  const filePath = safeFilePath(filename);
  if (!filePath) return false;
  if (isVercelRuntime) {
    if (!memoryStore.has(filename)) return false;
    memoryStore.delete(filename);
    return true;
  }
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

function writeBuffer(filename, content) {
  const safeName = sanitizeFilename(filename);
  if (!safeName) {
    throw new Error('Invalid filename');
  }

  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (isVercelRuntime) {
    memoryStore.set(safeName, {
      buffer,
      modified: new Date(),
    });
    return {
      filename: safeName,
      size: buffer.length,
      modified: new Date(),
    };
  }

  const filePath = path.join(UPLOAD_DIR, safeName);
  ensureStorageDir();
  fs.writeFileSync(filePath, buffer);
  return getFileMeta(filePath, safeName);
}

function readBuffer(filename) {
  const safeName = sanitizeFilename(filename);
  if (!safeName) {
    throw new Error('Invalid filename');
  }

  if (isVercelRuntime && memoryStore.has(safeName)) {
    return memoryStore.get(safeName).buffer;
  }

  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }
  return fs.readFileSync(filePath);
}

function getStats() {
  ensureStorageDir();
  const files = listFiles();
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  return {
    uploadDir: UPLOAD_DIR,
    count: files.length,
    totalSize,
    files,
    storageMode: isVercelRuntime ? 'memory+tmp' : 'filesystem',
  };
}

module.exports = {
  UPLOAD_DIR,
  ensureStorageDir,
  safeFilePath,
  tempFilePath,
  listFiles,
  fileExists,
  deleteFile,
  getStats,
  writeBuffer,
  readBuffer,
};
