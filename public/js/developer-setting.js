(() => {
  const devHost = document.getElementById('devHost');
  const devPort = document.getElementById('devPort');
  const devProtocol = document.getElementById('devProtocol');
  const devApiUrl = document.getElementById('devApiUrl');
  const refreshDevButton = document.getElementById('refreshDevButton');
  const devStatus = document.getElementById('devStatus');

  async function load() {
    devStatus.textContent = 'Fetching config...';
    try {
      const resp = await fetch('/api/config');
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to load /api/config');

      devHost.value = data.host ?? '';
      devPort.value = data.port ?? '';
      devProtocol.value = data.protocol ?? '';
      devApiUrl.value = '/api/config';

      devStatus.textContent = 'Config loaded.';
    } catch (e) {
      devStatus.textContent = `Error: ${e.message}`;
    }
  }

  refreshDevButton.addEventListener('click', load);
  window.addEventListener('DOMContentLoaded', load);
})();

