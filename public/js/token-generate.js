(() => {
  const usernameEl = document.getElementById('username');
  const generateBtn = document.getElementById('generateBtn');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const openRequestsBtn = document.getElementById('openRequestsBtn');
  const statusEl = document.getElementById('status');
  const tokenOutput = document.getElementById('tokenOutput');
  const urlOutput = document.getElementById('urlOutput');

  function setStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.classList.remove('ok', 'error');
    if (type === 'ok') statusEl.classList.add('ok');
    if (type === 'error') statusEl.classList.add('error');
  }

  function hideExtras() {
    copyUrlBtn.style.display = 'none';
    openRequestsBtn.style.display = 'none';
  }

  async function generate() {
    const username = (usernameEl.value || '').trim();
    if (!username) {
      setStatus('Username is required.', 'error');
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating…';
    hideExtras();
    setStatus('Generating token…');

    try {
      const resp = await fetch('/api/token/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `Generate failed: ${resp.status}`);

      tokenOutput.value = data.token || '';
      urlOutput.value = data.url || '';

      setStatus(`Token generated for ${data.username}. Expires in ${data.expiresIn} seconds.`, 'ok');

      if (data.url) {
        copyUrlBtn.style.display = 'inline-flex';
      }
      if (data.requestsUrl) {
        openRequestsBtn.style.display = 'inline-flex';
      }

      // Push token into main dashboard quickly (best-effort)
      try {
        if (data.token) localStorage.setItem('latestGeneratedToken', data.token);
      } catch {}


      copyUrlBtn.onclick = async () => {
        await navigator.clipboard.writeText(data.url);
        setStatus('Dashboard URL copied.', 'ok');
      };

      openRequestsBtn.onclick = () => {
        if (!data.requestsUrl) return;
        window.location.href = data.requestsUrl;
      };
    } catch (err) {
      setStatus(err.message || 'Generate error', 'error');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate token';
    }
  }

  generateBtn.addEventListener('click', generate);
  window.addEventListener('DOMContentLoaded', () => {
    hideExtras();
  });
})();
