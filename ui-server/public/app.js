const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const statusEl = document.getElementById('status');
const fileMeta = document.getElementById('fileMeta');
const resultsEl = document.getElementById('results');
const formatCheckboxes = Array.from(document.querySelectorAll('.formats input[type="checkbox"]'));

let selectedFile = null;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resetDropZone() {
  selectedFile = null;
  convertBtn.disabled = true;
  statusEl.textContent = '';
  fileMeta.classList.add('hidden');
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function updateFileMeta(file) {
  fileMeta.querySelector('.meta-name').textContent = file.name;
  fileMeta.querySelector('.meta-size').textContent = formatSize(file.size);
  fileMeta.classList.remove('hidden');
}

function setDefaultFormats(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const defaults = new Set(['docx', 'pdf']);
  if (ext === 'docx') {
    defaults.clear();
    defaults.add('md');
    defaults.add('pdf');
  } else if (ext === 'html' || ext === 'htm') {
    defaults.clear();
    defaults.add('docx');
    defaults.add('pdf');
  } else if (ext === 'md' || ext === 'markdown') {
    defaults.clear();
    defaults.add('docx');
    defaults.add('pdf');
  }
  formatCheckboxes.forEach((box) => {
    box.checked = defaults.has(box.value);
  });
}

function updateConvertButton() {
  const hasFormat = formatCheckboxes.some((box) => box.checked);
  convertBtn.disabled = !selectedFile || !hasFormat;
}

function handleFile(file) {
  if (!file) return;
  selectedFile = file;
  updateFileMeta(file);
  setDefaultFormats(file);
  updateConvertButton();
}

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-active');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('drag-active');
  const file = event.dataTransfer.files[0];
  handleFile(file);
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  handleFile(file);
});

formatCheckboxes.forEach((box) => box.addEventListener('change', updateConvertButton));

convertBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    return;
  }
  const selectedFormats = formatCheckboxes
    .filter((box) => box.checked)
    .map((box) => box.value);
  if (selectedFormats.length === 0) {
    statusEl.textContent = 'Please select at least one output format.';
    return;
  }
  statusEl.textContent = 'Uploading and converting…';
  convertBtn.disabled = true;
  try {
    const fileData = await fileToDataUrl(selectedFile);
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: selectedFile.name,
        fileData,
        formats: selectedFormats,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Conversion failed');
    }
    const result = await response.json();
    statusEl.textContent = `Done! Job ${result.jobId}`;
    prependJobCard(result);
  } catch (error) {
    console.error(error);
    statusEl.textContent = error.message || 'Conversion failed';
  } finally {
    convertBtn.disabled = false;
  }
});

function prependJobCard(meta) {
  const card = document.createElement('article');
  card.className = 'job-card';
  const date = new Date(meta.createdAt).toLocaleTimeString();
  card.innerHTML = `
    <div class="job-header">
      <div>
        <p class="job-id">Job ${meta.jobId}</p>
        <p>${meta.originalName}</p>
      </div>
      <span>${date}</span>
    </div>
    <div class="output-list">
      ${meta.outputs
        .map(
          (output) => `
          <div class="output-item">
            <div>
              <p><strong>${output.format.toUpperCase()}</strong> — ${output.fileName}</p>
              <p class="meta-size">${formatSize(output.size)}</p>
            </div>
            <button data-url="${output.url}">Download</button>
          </div>`
        )
        .join('')}
    </div>
  `;
  card.querySelectorAll('button[data-url]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.open(btn.dataset.url, '_blank');
    });
  });
  const currentEmpty = resultsEl.querySelector('.empty-state');
  if (currentEmpty) {
    currentEmpty.remove();
  }
  resultsEl.prepend(card);
}

resetDropZone();
