(() => {
  const detailsGrid = document.getElementById('detailsGrid');
  const statusText = document.getElementById('statusText');
  const copyButton = document.getElementById('copyTokenButton');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  function addDetail(label, value) {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `<div class="row"><span>${label}</span><strong>${value}</strong></div>`;
    detailsGrid.append(panel);
  }

  async function loadUser() {
    if (!token) {
      statusText.textContent = 'Token is missing from the URL.';
      statusText.classList.add('error');
      return;
    }

    try {
      const resp = await fetch(`/api/user-details?token=${encodeURIComponent(token)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Unable to load details');

      statusText.textContent = `Welcome ${data.username}. Token issued ${data.createdAt}.`;
      addDetail('Username', data.username);
      addDetail('Token', data.token);
      addDetail('Client IP', data.ip);
      addDetail('User Agent', data.userAgent || 'Unknown');
      addDetail('Protocol', data.server.protocol);
      addDetail('Host', data.server.host);
      addDetail('Port', data.server.port);
      addDetail('HTTPS enabled', data.server.sslEnabled ? 'Yes' : 'No');
      addDetail('Total files', data.storage.fileCount);
      addDetail('Total size', `${(data.storage.totalSize / 1024).toFixed(1)} KB`);

      copyButton.style.display = 'inline-flex';
      copyButton.addEventListener('click', async () => {
        await navigator.clipboard.writeText(window.location.href);
        statusText.textContent = 'Dashboard URL copied to clipboard.';
      });

      const requestsLink = document.getElementById('requestsLink');
      if (requestsLink) {
        requestsLink.style.display = 'inline-flex';
        requestsLink.href = `/dashboard/user-requests?token=${encodeURIComponent(token)}`;
        requestsLink.textContent = 'View token requests';
      }
    } catch (err) {
      statusText.textContent = `Error: ${err.message}`;
      statusText.classList.add('error');
    }
  }

  window.addEventListener('DOMContentLoaded', loadUser);
})();

