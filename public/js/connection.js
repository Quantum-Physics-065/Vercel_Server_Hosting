(() => {
  const protocolSelect = document.getElementById('protocolSelect');
  const hostInput = document.getElementById('hostInput');
  const portInput = document.getElementById('portInput');
  const ftpPortInput = document.getElementById('ftpPortInput');
  const vpnServerInput = document.getElementById('vpnServerInput');
  const vpnPortInput = document.getElementById('vpnPortInput');
  const vpnProtocolInput = document.getElementById('vpnProtocolInput');
  const vpnUsernameInput = document.getElementById('vpnUsernameInput');
  const vpnPasswordInput = document.getElementById('vpnPasswordInput');
  const sslCertInput = document.getElementById('sslCertInput');
  const sslKeyInput = document.getElementById('sslKeyInput');
  const sslCaInput = document.getElementById('sslCaInput');
  const certToggle = document.getElementById('certToggle');
  const saveButton = document.getElementById('saveConfigButton');
  const configNote = document.getElementById('configNote');
  const downloadCertButton = document.getElementById('downloadCertButton');
  const downloadKeyButton = document.getElementById('downloadKeyButton');
  const downloadCaButton = document.getElementById('downloadCaButton');
  const connCertPath = document.getElementById('connCertPath');
  const connKeyPath = document.getElementById('connKeyPath');

  function formatUrl(protocol, host, port) {
    return `${protocol}://${host}:${port}`;
  }

  async function loadConfig() {
    try {
      const [statusResponse, configResponse] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/config'),
      ]);

      if (!statusResponse.ok || !configResponse.ok) {
        throw new Error('Failed to load status or config');
      }

      const statusData = await statusResponse.json();
      const configData = await configResponse.json();

      document.getElementById('connProtocol').textContent = statusData.protocol.toUpperCase();
      document.getElementById('connUrl').textContent = formatUrl(statusData.protocol, statusData.host, statusData.port);
      document.getElementById('connPort').textContent = statusData.port;
      document.getElementById('connSsl').textContent = statusData.sslEnabled ? 'Enabled' : 'Disabled';
      document.getElementById('connFtp').textContent = statusData.ftpEnabled ? 'Enabled' : 'Disabled';
      document.getElementById('connRoot').textContent = statusData.sslCaPath || 'Not configured';
      document.getElementById('connClientCert').textContent = statusData.requestClientCert ? 'Required' : 'Optional';
      document.getElementById('connFtpPort').textContent = statusData.ftpPort;
      connCertPath.textContent = statusData.sslCertPath || 'Not configured';
      connKeyPath.textContent = statusData.sslKeyPath || 'Not configured';

      protocolSelect.value = configData.protocol;
      hostInput.value = configData.host;
      portInput.value = configData.port;
      ftpPortInput.value = configData.ftpPort;
      vpnServerInput.value = configData.vpnServer || '';
      vpnPortInput.value = configData.vpnPort || '';
      vpnProtocolInput.value = configData.vpnProtocol || 'openvpn';
      vpnUsernameInput.value = configData.vpnUsername || '';
      vpnPasswordInput.value = configData.vpnPassword || '';
      sslCertInput.value = configData.sslCertPath || '';
      sslKeyInput.value = configData.sslKeyPath || '';
      sslCaInput.value = configData.sslCaPath || '';
      certToggle.value = String(configData.requestClientCert);
    } catch (err) {
      configNote.textContent = `Unable to load connection config: ${err.message}`;
    }
  }

  downloadCertButton.addEventListener('click', () => {
    window.location.href = '/certificate/download?type=cert';
  });

  downloadKeyButton.addEventListener('click', () => {
    window.location.href = '/certificate/download?type=key';
  });

  downloadCaButton.addEventListener('click', () => {
    window.location.href = '/certificate/download?type=ca';
  });

  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: protocolSelect.value,
          host: hostInput.value,
          port: Number(portInput.value),
          ftpPort: Number(ftpPortInput.value),
          vpnServer: vpnServerInput.value,
          vpnPort: Number(vpnPortInput.value),
          vpnProtocol: vpnProtocolInput.value,
          vpnUsername: vpnUsernameInput.value,
          vpnPassword: vpnPasswordInput.value,
          sslKeyPath: sslKeyInput.value,
          sslCertPath: sslCertInput.value,
          sslCaPath: sslCaInput.value,
          requestClientCert: certToggle.value === 'true',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Save failed: ${response.status}`);
      }

      await response.json();
      configNote.textContent = 'Connection config saved. The status panel has been refreshed.';
      await loadConfig();
    } catch (err) {
      configNote.textContent = `Save failed: ${err.message}`;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save configuration';
    }
  });

  window.addEventListener('DOMContentLoaded', loadConfig);
})();

