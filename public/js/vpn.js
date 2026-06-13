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

  refreshVpn?.addEventListener('click', loadVpnConfig);
  window.addEventListener('DOMContentLoaded', loadVpnConfig);
})();

