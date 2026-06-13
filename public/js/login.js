(() => {
  const usernameInput = document.getElementById('usernameInput');
  const loginButton = document.getElementById('loginButton');
  const statusText = document.getElementById('statusText');
  const result = document.getElementById('result');
  const resultUrl = document.getElementById('resultUrl');
  const copyButton = document.getElementById('copyButton');

  async function login() {
    const username = usernameInput.value.trim();
    if (!username) {
      statusText.textContent = 'Username is required.';
      return;
    }
    loginButton.disabled = true;
    statusText.textContent = 'Generating token...';

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
      statusText.textContent = `Token generated for ${data.username}. Expires in ${data.expiresIn} seconds.`;

      const requestLink = document.getElementById('resultRequestsUrl');
      if (data.requestsUrl) {
        requestLink.style.display = 'inline-flex';
        requestLink.textContent = 'Open requests page';
        requestLink.href = data.requestsUrl;
      }
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
})();

