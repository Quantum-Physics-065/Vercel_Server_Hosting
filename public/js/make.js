(() => {
  const tokenInput = document.getElementById('tokenInput');
  const jsonInput = document.getElementById('jsonInput');
  const fileInput = document.getElementById('fileInput');

  const submitJsonButton = document.getElementById('submitJsonButton');
  const submitFileButton = document.getElementById('submitFileButton');
  const openRequestsButton = document.getElementById('openRequestsButton');

  const resultText = document.getElementById('resultText');
  const exampleRequestsUrl = document.getElementById('exampleRequestsUrl');

  function getToken() {
    return (tokenInput.value || '').trim();
  }

  function setResult(message, type = 'info') {
    resultText.classList.remove('error', 'ok');
    if (type === 'error') resultText.classList.add('error');
    if (type === 'ok') resultText.classList.add('ok');
    resultText.textContent = message;
  }

  function updateExample() {
    const t = getToken();
    if (!t) {
      exampleRequestsUrl.textContent = '/token/<token>/requests';
      return;
    }
    exampleRequestsUrl.textContent = `/token/${t}/requests`;
  }

  function safeParseJson(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
  }

  async function submitJson() {
    const token = getToken();
    if (!token) {
      setResult('Token is required.', 'error');
      return;
    }

    const parsed = safeParseJson(jsonInput.value);
    if (!parsed) {
      setResult('JSON body is empty. Paste JSON or upload a file instead.', 'error');
      return;
    }

    submitJsonButton.disabled = true;
    submitJsonButton.textContent = 'Submitting…';
    try {
      const resp = await fetch(`/token/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `Submit failed: ${resp.status}`);
      setResult(`JSON stored (${data.stored?.filename || 'ok'}).`, 'ok');
      updateExample();
    } catch (err) {
      setResult(`Submit JSON failed: ${err.message}`, 'error');
    } finally {
      submitJsonButton.disabled = false;
      submitJsonButton.textContent = 'Submit JSON';
    }
  }

  async function uploadFile() {
    const token = getToken();
    if (!token) {
      setResult('Token is required.', 'error');
      return;
    }

    const file = fileInput.files?.[0];
    if (!file) {
      setResult('Select a file first.', 'error');
      return;
    }

    submitFileButton.disabled = true;
    submitFileButton.textContent = 'Uploading…';
    try {
      const form = new FormData();
      form.append('file', file);

      const resp = await fetch(`/token/${encodeURIComponent(token)}/upload`, {
        method: 'POST',
        body: form,
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `Upload failed: ${resp.status}`);
      setResult(`File stored (${data.stored?.filename || 'ok'}).`, 'ok');
      updateExample();
    } catch (err) {
      setResult(`Upload failed: ${err.message}`, 'error');
    } finally {
      submitFileButton.disabled = false;
      submitFileButton.textContent = 'Upload file';
    }
  }

  function openRequests() {
    const token = getToken();
    if (!token) {
      setResult('Token is required to open requests.', 'error');
      return;
    }
    window.location.href = `/token/${encodeURIComponent(token)}/requests`;
  }

  tokenInput.addEventListener('input', updateExample);

  submitJsonButton.addEventListener('click', submitJson);
  submitFileButton.addEventListener('click', uploadFile);
  openRequestsButton.addEventListener('click', openRequests);

  updateExample();
  setResult('Ready.', 'info');
})();

