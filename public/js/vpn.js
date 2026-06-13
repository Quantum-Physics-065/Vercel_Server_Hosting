(() => {
  const vpnServer = document.getElementById('vpnServer');
  const vpnPort = document.getElementById('vpnPort');
  const vpnProtocol = document.getElementById('vpnProtocol');
  const vpnUsername = document.getElementById('vpnUsername');
  const vpnPassword = document.getElementById('vpnPassword');
  const refreshVpn = document.getElementById('refreshVpn');

  async function loadVpnConfig() {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      if (!response.ok) throw new Error(config.error || 'Config load failed');
      vpnServer.textContent = config.vpnServer || 'Not configured';
      vpnPort.textContent = config.vpnPort || 'Not configured';
      vpnProtocol.textContent = config.vpnProtocol || 'Not configured';
      vpnUsername.textContent = config.vpnUsername || 'Not configured';
      vpnPassword.textContent = config.vpnPassword ? 'Configured' : 'Empty';
    } catch (err) {
      vpnServer.textContent = `Error: ${err.message}`;
      vpnPort.textContent = 'Error';
      vpnProtocol.textContent = 'Error';
      vpnUsername.textContent = 'Error';
      vpnPassword.textContent = 'Error';
    }
  }

  async function applyVpnConfig() {
    try {
      // This app treats VPN “connect” as applying runtime config.
      // Backend is already wired through /api/config.
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          vpnServer: vpnServer.textContent === 'Not configured' ? '' : vpnServer.textContent,
          vpnPort: Number(vpnPort.textContent) || 0,
          vpnProtocol: vpnProtocol.textContent === 'Not configured' ? '' : vpnProtocol.textContent,
          vpnUsername: vpnUsername.textContent === 'Not configured' ? '' : vpnUsername.textContent,
          vpnPassword: vpnPassword.textContent === 'Empty' ? '' : '',
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Apply failed: ${response.status}`);
      await loadVpnConfig();
    } catch (err) {
      vpnServer.textContent = `Error: ${err.message}`;
    }
  }

  const applyVpnBtn = document.getElementById('applyVpn');
  applyVpnBtn?.addEventListener('click', applyVpnConfig);
  refreshVpn?.addEventListener('click', loadVpnConfig);
  window.addEventListener('DOMContentLoaded', loadVpnConfig);
})();


