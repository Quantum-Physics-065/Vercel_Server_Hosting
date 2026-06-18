(() => {
  const fileTableBody = document.getElementById('fileTableBody');
  const fileEditor = document.getElementById('fileEditor');
  const saveButton = document.getElementById('saveFileButton');
  const fileInfoText = document.getElementById('fileInfoText');
  const fileBadge = document.getElementById('fileBadge');
  const uploadInput = document.getElementById('uploadFileInput');
  const uploadNameInput = document.getElementById('uploadNameInput');
  const uploadButton = document.getElementById('uploadFileButton');
  const bulkUploadButton = document.getElementById('bulkUploadButton');
  const bulkUploadInput = document.getElementById('bulkUploadInput');
  const refreshFilesButton = document.getElementById('refreshFilesButton');
  const uploadNote = document.getElementById('uploadNote');
  const progressWrap = document.getElementById('uploadProgressWrap');
  const progressText = document.getElementById('uploadProgressText');
  const progressBytes = document.getElementById('uploadProgressBytes');
  const progressBar = document.getElementById('uploadProgressBar');
  const chunkSizeSelect = document.getElementById('chunkSizeSelect');

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

  function setUploadProgress(done, total, label) {
    if (!total) {
      progressWrap.style.display = 'none';
      return;
    }
    progressWrap.style.display = 'block';
    const percent = total ? Math.round((done / total) * 100) : 0;
    progressText.textContent = `${percent}%`;
    progressBytes.textContent = `${formatBytes(done)} / ${formatBytes(total)}`;
    progressBar.style.width = `${Math.min(percent, 100)}%`;
    if (label) {
      uploadNote.textContent = label;
    }
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

  async function uploadSingleFile(file, options = {}) {
    const filename = options.filename || uploadNameInput.value.trim() || file.name;
    const chunkSize = Number(chunkSizeSelect.value || 1048576);
    const useChunked = options.chunked !== false && file.size > chunkSize;

    if (useChunked) {
      const totalChunks = Math.ceil(file.size / chunkSize);
      setUploadProgress(0, file.size, `Chunking ${filename} into ${totalChunks} parts...`);

      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const response = await fetch(`/file/chunk?name=${encodeURIComponent(filename)}&part=${index + 1}&total=${totalChunks}`, {
          method: 'POST',
          body: chunk,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Chunk upload failed ${response.status}`);
        }

        const data = await response.json();
        setUploadProgress(end, file.size, `Uploaded chunk ${data.part}/${data.totalParts} for ${filename}`);
      }

      return { filename, bytes: file.size };
    }

    const response = await fetch(`/file?name=${encodeURIComponent(filename)}`, {
      method: 'POST',
      body: file,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Upload failed ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  async function uploadFile() {
    const file = uploadInput.files[0];
    if (!file) {
      uploadNote.textContent = 'Select a file first to upload.';
      return;
    }

    const filename = uploadNameInput.value.trim() || file.name;
    uploadButton.disabled = true;
    bulkUploadButton.disabled = true;
    uploadButton.textContent = 'Uploading…';
    setUploadProgress(0, file.size, `Uploading ${filename}…`);

    try {
      const data = await uploadSingleFile(file);
      uploadNote.textContent = `Uploaded ${data.filename} (${data.bytes} bytes)`;
      uploadInput.value = '';
      uploadNameInput.value = '';
      setUploadProgress(data.bytes, data.bytes, `Uploaded ${data.filename}`);
      await loadFiles();
    } catch (err) {
      uploadNote.textContent = `Upload error: ${err.message}`;
      setUploadProgress(0, 0, '');
    } finally {
      uploadButton.disabled = false;
      bulkUploadButton.disabled = false;
      uploadButton.textContent = 'Upload file';
      progressWrap.style.display = 'none';
    }
  }

  async function uploadBulkFiles() {
    const files = bulkUploadInput.files;
    if (!files.length) {
      uploadNote.textContent = 'Select one or more files to bulk upload.';
      return;
    }

    uploadButton.disabled = true;
    bulkUploadButton.disabled = true;
    bulkUploadButton.textContent = 'Uploading…';
    const totalBytes = Array.from(files).reduce((sum, f) => sum + f.size, 0);
    let sentBytes = 0;
    setUploadProgress(0, totalBytes, `Bulk uploading ${files.length} files...`);

    try {
      for (const file of files) {
        const result = await uploadSingleFile(file, { chunked: true, filename: file.name });
        sentBytes += result.bytes || file.size;
        setUploadProgress(sentBytes, totalBytes, `Uploaded ${file.name}`);
      }
      uploadNote.textContent = `Bulk upload complete (${files.length} files)`;
      await loadFiles();
    } catch (err) {
      uploadNote.textContent = `Bulk upload error: ${err.message}`;
      setUploadProgress(0, 0, '');
    } finally {
      uploadButton.disabled = false;
      bulkUploadButton.disabled = false;
      bulkUploadButton.textContent = 'Bulk upload';
      progressWrap.style.display = 'none';
      bulkUploadInput.value = '';
    }
  }

  refreshFilesButton.addEventListener('click', loadFiles);
  uploadButton.addEventListener('click', uploadFile);
  bulkUploadButton.addEventListener('click', () => {
    bulkUploadInput.click();
  });
  bulkUploadInput.addEventListener('change', () => {
    if (bulkUploadInput.files.length) {
      uploadNote.textContent = `${bulkUploadInput.files.length} file(s) selected for bulk upload.`;
      bulkUploadButton.textContent = `Bulk upload (${bulkUploadInput.files.length})`;
      uploadBulkFiles();
    }
  });

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

