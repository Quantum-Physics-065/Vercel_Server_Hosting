(() => {
  const fileTableBody = document.getElementById('fileTableBody');
  const fileEditor = document.getElementById('fileEditor');
  const saveButton = document.getElementById('saveFileButton');
  const fileInfoText = document.getElementById('fileInfoText');
  const fileBadge = document.getElementById('fileBadge');
  const uploadInput = document.getElementById('uploadFileInput');
  const uploadNameInput = document.getElementById('uploadNameInput');
  const uploadButton = document.getElementById('uploadFileButton');
  const refreshFilesButton = document.getElementById('refreshFilesButton');
  const uploadNote = document.getElementById('uploadNote');

  let selectedFile = null;

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  function toLocalString(value) {
    return new Date(value).toLocaleString();
  }

  function renderFiles(files) {
    if (!files.length) {
      fileTableBody.innerHTML = '<tr><td colspan="4">No files found</td></tr>';
      return;
    }

    fileTableBody.innerHTML = files
      .map(
        (file) => `
        <tr data-filename="${encodeURIComponent(file.filename)}">
          <td>${file.filename}</td>
          <td>${formatBytes(file.size)}</td>
          <td>${toLocalString(file.modified)}</td>
          <td><a class="file-link" href="/file?name=${encodeURIComponent(file.filename)}" target="_blank" rel="noopener">Download</a></td>
        </tr>
      `
      )
      .join('');

    document.querySelectorAll('#fileTableBody tr').forEach((row) => {
      row.addEventListener('click', () => {
        const filename = decodeURIComponent(row.dataset.filename);
        selectFile(filename);
        document.querySelectorAll('#fileTableBody tr').forEach((r) => r.classList.remove('selected'));
        row.classList.add('selected');
      });
    });
  }

  async function loadFiles() {
    fileBadge.textContent = 'Fetching...';
    try {
      const response = await fetch('/files');
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Files failed ${response.status}`);
      }

      const data = await response.json();
      const files = Array.isArray(data.files) ? data.files : [];
      renderFiles(files);
      fileBadge.textContent = files.length ? 'Ready' : 'No files';
      fileBadge.classList.remove('offline');
    } catch (err) {
      fileTableBody.innerHTML = `<tr><td colspan="4">Unable to load files: ${err.message}</td></tr>`;
      fileBadge.textContent = 'Offline';
      fileBadge.classList.add('offline');
    }
  }

  async function uploadFile() {
    const file = uploadInput.files[0];
    if (!file) {
      uploadNote.textContent = 'Select a file first to upload.';
      return;
    }

    const filename = uploadNameInput.value.trim() || file.name;
    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading…';
    uploadNote.textContent = `Uploading ${filename}…`;

    try {
      const response = await fetch(`/file?name=${encodeURIComponent(filename)}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Upload failed ${response.status}`);
      }

      const data = await response.json();
      uploadNote.textContent = `Uploaded ${data.filename} (${data.bytes} bytes)`;
      uploadInput.value = '';
      uploadNameInput.value = '';
      await loadFiles();
    } catch (err) {
      uploadNote.textContent = `Upload error: ${err.message}`;
    } finally {
      uploadButton.disabled = false;
      uploadButton.textContent = 'Upload file';
    }
  }

  refreshFilesButton.addEventListener('click', loadFiles);
  uploadButton.addEventListener('click', uploadFile);

  async function selectFile(filename) {
    selectedFile = filename;
    fileEditor.disabled = true;
    saveButton.disabled = true;
    fileEditor.value = 'Fetching file content...';
    fileInfoText.textContent = `Fetching ${filename}...`;

    try {
      const response = await fetch(`/file/content?name=${encodeURIComponent(filename)}`);
      if (!response.ok) throw new Error(`Unable to open file: ${response.status}`);
      const data = await response.json();
      fileEditor.value = data.content;
      fileEditor.disabled = false;
      saveButton.disabled = false;
      fileInfoText.textContent = `Editing ${data.filename} • ${formatBytes(data.size)}`;
    } catch (err) {
      fileEditor.value = `Error loading file: ${err.message}`;
      fileInfoText.textContent = 'Unable to open file';
    }
  }

  saveButton.addEventListener('click', async () => {
    if (!selectedFile) return;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
      const response = await fetch(`/file/save?name=${encodeURIComponent(selectedFile)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileEditor.value }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Save failed ${response.status}`);
      }

      const data = await response.json();
      fileInfoText.textContent = `Saved ${data.filename} • ${formatBytes(data.size)}`;
    } catch (err) {
      fileInfoText.textContent = `Save error: ${err.message}`;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save file';
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    loadFiles();
  });
})();

