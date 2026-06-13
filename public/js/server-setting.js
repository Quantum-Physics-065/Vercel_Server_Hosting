(() => {
  const protocol = document.getElementById('protocol');
  const host = document.getElementById('host');
  const port = document.getElementById('port');
  const ftpPort = document.getElementById('ftpPort');
  const sslCert = document.getElementById('sslCert');
  const sslKey = document.getElementById('sslKey');
  const sslCa = document.getElementById('sslCa');
  const clientCert = document.getElementById('clientCert');
  const saveConfig = document.getElementById('saveConfig');
  const statusText = document.getElementById('statusText');

  async function loadConfig() {
    statusText.textContent = 'Fetching latest configuration...';
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load config');
      protocol.value = data.protocol;
      host.value = data.host;
      port.value = data.port;
      ftpPort.value = data.ftpPort;
      sslCert.value = data.sslCertPath || '';
      sslKey.value = data.sslKeyPath || '';
      sslCa.value = data.sslCaPath || '';
      clientCert.value = String(data.requestClientCert);
      statusText.textContent = 'Configuration loaded successfully.';
    } catch (err) {
      statusText.textContent = `Error loading config: ${err.message}`;
    }
  }

  saveConfig.addEventListener('click', async () => {
    saveConfig.disabled = true;
    saveConfig.textContent = 'Saving...';
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: protocol.value,
          host: host.value,
          port: Number(port.value),
          ftpPort: Number(ftpPort.value),
          sslCertPath: sslCert.value,
          sslKeyPath: sslKey.value,
          sslCaPath: sslCa.value,
          requestClientCert: clientCert.value === 'true',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed');
      statusText.textContent = 'Settings saved and will be reflected in the server status.';
    } catch (err) {
      statusText.textContent = `Save error: ${err.message}`;
    } finally {
      saveConfig.disabled = false;
      saveConfig.textContent = 'Save Settings';
    }
  });

  window.addEventListener('DOMContentLoaded', loadConfig);
})();

