(() => {
  const statusText = document.getElementById('statusText');
  const tokenText = document.getElementById('tokenText');
  const tokenInput = document.getElementById('tokenInput');
  const loadTokenButton = document.getElementById('loadTokenButton');
  const copyTokenButton = document.getElementById('copyTokenButton');
  const requestsList = document.getElementById('requestsList');
  const refreshButton = document.getElementById('refreshButton');

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const queryParams = new URLSearchParams(window.location.search);

  function getTokenFromPage() {
    const entered = (tokenInput?.value || '').trim();
    if (entered) return entered;
    return queryParams.get('token') || (pathParts.length >= 3 ? pathParts[1] : null);
  }

  function setStatus(msg, isError = false) {
    statusText.textContent = msg;
    if (isError) statusText.classList.add('error');
    else statusText.classList.remove('error');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  function toLocal(value) {
    return new Date(value).toLocaleString();
  }

  function setTokenDisplay(token) {
    if (tokenInput) tokenInput.value = token || '';
    tokenText.textContent = token || '—';
  }

  async function loadRequests() {
    const token = getTokenFromPage();
    if (!token) {
      setStatus('Paste a token and click Load token requests.', true);
      requestsList.innerHTML = '<div class="card">No token provided.</div>';
      setTokenDisplay('—');
      return;
    }

    setTokenDisplay(token);
    setStatus('Loading stored requests…');
    requestsList.innerHTML = '<div class="card">Fetching…</div>';

    try {
      const resp = await fetch(`/token/${encodeURIComponent(token)}/requests`);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `Failed: ${resp.status}`);

      const requests = Array.isArray(data.requests) ? data.requests : [];

      if (!requests.length) {
        requestsList.innerHTML = '<div class="card">No stored requests for this token.</div>';
        setStatus('No stored requests.');
        return;
      }

      requestsList.innerHTML = requests
        .slice()
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
        .map((item) => {
          const filename = item.filename;
          const size = item.size;
          const modified = item.modified;
          return `
            <div class="card">
              <div class="row">
                <div style="min-width:220px;">
                  <div class="meta">Stored file</div>
                  <div class="mono">${filename}</div>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:flex-end;">
                  <a class="secondary" href="/token/${encodeURIComponent(token)}/requests/download?name=${encodeURIComponent(filename)}" target="_blank" rel="noopener">Download</a>
                  <a class="secondary" href="/dashboard/make?token=${encodeURIComponent(token)}">Reuse token</a>
                </div>
              </div>
              <div style="height:10px;"></div>
              <div class="meta">Size: ${formatBytes(size)} · Modified: ${toLocal(modified)}</div>
            </div>
          `;
        })
        .join('');

      setStatus(`Loaded ${requests.length} stored request(s).`);
    } catch (err) {
      setStatus(`Failed to load requests: ${err.message}`, true);
      requestsList.innerHTML = `<div class="card">${err.message}</div>`;
    }
  }

  loadTokenButton?.addEventListener('click', loadRequests);
  refreshButton?.addEventListener('click', loadRequests);
  copyTokenButton?.addEventListener('click', async () => {
    const token = getTokenFromPage();
    if (!token) {
      setStatus('No token available to copy.', true);
      return;
    }
    try {
      await navigator.clipboard.writeText(token);
      setStatus('Token copied to clipboard.', false);
    } catch {
      setStatus('Copy failed.', true);
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    const initialToken = getTokenFromPage();
    if (initialToken) {
      loadRequests();
    } else {
      setStatus('Paste a token and click Load token requests.');
      setTokenDisplay('—');
      requestsList.innerHTML = '<div class="card">Enter a token then click Load token requests.</div>';
    }
  });
})();

