(() => {
  const statusText = document.getElementById('statusText');
  const tokenText = document.getElementById('tokenText');
  const requestsList = document.getElementById('requestsList');
  const refreshButton = document.getElementById('refreshButton');

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  // expected: /token/<token>/requests or /dashboard/user-requests?token=<token>
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token') || (pathParts.length >= 3 ? pathParts[1] : null);

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

  async function loadRequests() {
    if (!token) {
      setStatus('Token is missing in URL.', true);
      requestsList.innerHTML = '<div class="card">No token provided.</div>';
      return;
    }

    tokenText.textContent = token;
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
          // Not implementing file viewer; we only show stored list.
          return `
            <div class="card">
              <div class="row">
                <div>
                  <div class="meta">Stored file</div>
                  <div class="mono">${filename}</div>
                </div>
                <div>
                  <div class="meta">Size</div>
                  <div>${formatBytes(size)}</div>
                </div>
              </div>
              <div style="height:10px;"></div>
              <div class="meta">Modified: ${toLocal(modified)}</div>
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

  refreshButton?.addEventListener('click', loadRequests);
  window.addEventListener('DOMContentLoaded', loadRequests);
})();

