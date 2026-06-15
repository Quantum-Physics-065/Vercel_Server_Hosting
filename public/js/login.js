(() => {
  const usernameInput = document.getElementById('usernameInput');
  const loginButton = document.getElementById('loginButton');
  const statusText = document.getElementById('statusText');
  const result = document.getElementById('result');
  const resultUrl = document.getElementById('resultUrl');
  const resultToken = document.getElementById('resultToken');
  const resultRequestsUrl = document.getElementById('resultRequestsUrl');
  const copyButton = document.getElementById('copyButton');

  function hideExtras() {
    resultToken.textContent = '';
    resultRequestsUrl.style.display = 'none';
    result.style.display = 'none';
  }

  async function login() {
    const username = usernameInput.value.trim();
    if (!username) {
      statusText.textContent = 'Username is required.';
      return;
    }
    loginButton.disabled = true;
    statusText.textContent = 'Generating token...';
    hideExtras();

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Login failed');

      result.style.display = 'block';
      resultUrl.textContent = data.url;
      resultUrl.href = data.url;
      resultToken.textContent = data.token || '';

      if (data.requestsUrl) {
        resultRequestsUrl.style.display = 'inline-flex';
        resultRequestsUrl.textContent = 'Open requests page';
        resultRequestsUrl.href = data.requestsUrl;
      }

      statusText.textContent = `Token generated for ${data.username}. Expires in ${data.expiresIn} seconds.`;
    } catch (err) {
      statusText.textContent = `Login error: ${err.message}`;
    } finally {
      loginButton.disabled = false;
    }
  }

  loginButton.addEventListener('click', login);
  copyButton.addEventListener('click', async () => {
    if (!resultUrl.href) return;
    await navigator.clipboard.writeText(resultUrl.href);
    statusText.textContent = 'Link copied to clipboard.';
  });

  window.addEventListener('DOMContentLoaded', hideExtras);
})();

