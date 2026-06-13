(() => {
  const els = {
    uptime: document.getElementById('uptime'),
    startedAt: document.getElementById('startedAt'),
    fileCount: document.getElementById('fileCount'),
    totalSize: document.getElementById('totalSize'),
    protocol: document.getElementById('protocol'),
    host: document.getElementById('host'),
    port: document.getElementById('port'),
    sslEnabled: document.getElementById('sslEnabled'),
    sslCertPath: document.getElementById('sslCertPath'),
    sslKeyPath: document.getElementById('sslKeyPath'),
    sslCaPath: document.getElementById('sslCaPath'),
    allowedOrigins: document.getElementById('allowedOrigins'),
  };

  function formatBytes(bytes) {
    if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—';
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  function formatUptime(ms) {
    if (!ms && ms !== 0) return '—';
    const s = Math.floor(ms / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  function set(id, v) {
    const el = els[id];
    if (el) el.textContent = v ?? '—';
  }

  async function load() {
    for (const k of Object.keys(els)) set(k, 'Loading…');

    const resp = await fetch('/api/status');
    const data = await resp.json();
    if (!resp.ok || !data || data.ok !== true) throw new Error(data?.error || 'Failed to load status');

    set('uptime', formatUptime(data.uptimeMs));
    set('startedAt', data.startedAt || '—');
    set('fileCount', data.fileCount ?? '—');
    set('totalSize', formatBytes(data.totalSize));
    set('protocol', data.protocol ?? '—');
    set('host', data.host ?? '—');
    set('port', data.port ?? '—');
    set('sslEnabled', data.sslEnabled ? 'Enabled' : 'Disabled');
    set('sslCertPath', data.sslCertPath || '—');
    set('sslKeyPath', data.sslKeyPath || '—');
    set('sslCaPath', data.sslCaPath || '—');
    set('allowedOrigins', Array.isArray(data.allowedOrigins) ? data.allowedOrigins.join(', ') : (data.allowedOrigins || '—'));
  }

  load().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    for (const k of Object.keys(els)) set(k, 'Error');
  });
})();