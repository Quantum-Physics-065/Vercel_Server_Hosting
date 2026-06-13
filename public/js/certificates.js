(() => {
  const sslCertPath = document.getElementById('sslCertPath');
  const sslKeyPath = document.getElementById('sslKeyPath');
  const sslCaPath = document.getElementById('sslCaPath');
  const downloadCert = document.getElementById('downloadCert');
  const downloadKey = document.getElementById('downloadKey');
  const downloadCa = document.getElementById('downloadCa');

  async function loadCertificates() {
    try {
      const response = await fetch('/api/certificates');
      if (!response.ok) throw new Error('Could not load certificate configuration');
      const data = await response.json();
      sslCertPath.textContent = data.sslCertPath || 'Not configured';
      sslKeyPath.textContent = data.sslKeyPath || 'Not configured';
      sslCaPath.textContent = data.sslCaPath || 'Not configured';
    } catch (err) {
      sslCertPath.textContent = `Error: ${err.message}`;
      sslKeyPath.textContent = `Error: ${err.message}`;
      sslCaPath.textContent = `Error: ${err.message}`;
    }
  }

  downloadCert.addEventListener('click', () => {
    window.location.href = '/certificate/download?type=cert';
  });

  downloadKey.addEventListener('click', () => {
    window.location.href = '/certificate/download?type=key';
  });

  downloadCa.addEventListener('click', () => {
    window.location.href = '/certificate/download?type=ca';
  });

  window.addEventListener('DOMContentLoaded', loadCertificates);
})();

