(() => {
  const refreshButton = document.getElementById('refreshButton');
  const copyDashboardButton = document.getElementById('copyDashboardButton');
  const overviewBadge = document.getElementById('overviewBadge');

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  async function loadStatus() {
    overviewBadge.textContent = 'Refreshing';
    try {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error(`Status failed ${response.status}`);
      const status = await response.json();

      document.getElementById('overviewServer').textContent = status.protocol.toUpperCase();
      document.getElementById('overviewUrl').textContent = `${status.protocol}://${status.host}:${status.port}`;
      document.getElementById('overviewPort').textContent = status.port;
      document.getElementById('overviewPath').textContent = status.storageDir;
      document.getElementById('overviewCount').textContent = status.fileCount;
      document.getElementById('overviewSize').textContent = formatBytes(status.totalSize);
      document.getElementById('overviewProtocols').textContent =
        Object.entries(status.protocols)
          .filter(([_, enabled]) => enabled)
          .map(([protocol]) => protocol.toUpperCase())
          .join(', ') || 'None';

      overviewBadge.textContent = 'Online';
      overviewBadge.classList.remove('offline');
    } catch {
      overviewBadge.textContent = 'Offline';
      overviewBadge.classList.add('offline');
    }
  }

  refreshButton?.addEventListener('click', loadStatus);

  copyDashboardButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      overviewBadge.textContent = 'Link copied';
    } catch {
      overviewBadge.textContent = 'Copy failed';
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    loadStatus();
    setInterval(loadStatus, 12000);
  });
})();

