import init from './vendor/pdfcraft-web-479fd1d14d164a34.js';

const canvas = document.querySelector('#pdfcraft');
const status = document.querySelector('#status');
const useBrave = document.querySelector('#use-brave');
const discard = document.querySelector('#discard');
const downloadOriginal = document.querySelector('#download-original');
const handler = chrome.mimeHandler;
const maxPdfBytes = 512 * 1024 * 1024;

let dirty = false;
let pendingSaves = 0;
let lastSaveFailed = false;
let original;
let mayReloadFromNetwork = false;

function safeName(name, fallback) {
  const sanitized = String(name || '').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '_').trim()
    .replace(/^[.]+|[. ]+$/g, '');
  if (!sanitized) return fallback;
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(sanitized) ? '_' + sanitized : sanitized;
}

function documentName(url) {
  const segment = new URL(url).pathname.split('/').pop();
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Keep the original segment when its escape sequences are malformed.
  }
  const name = safeName(decoded, 'document').slice(0, 180);
  return /\.pdf$/i.test(name) ? name : name + '.pdf';
}

async function readPdf(streamUrl) {
  const response = await fetch(streamUrl);
  if (!response.ok || !response.body) throw new Error('Brave could not read this PDF.');

  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxPdfBytes) {
        await reader.cancel();
        throw new Error('This PDF exceeds PdfCraft’s 512 MiB limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (size === 0) throw new Error('The PDF response was empty.');
  return new Blob(chunks, { type: 'application/pdf' });
}

function waitForDownload(id) {
  return new Promise((resolve, reject) => {
    const downloads = chrome.downloads;

    function finish(state) {
      if (state !== 'complete' && state !== 'interrupted') return;
      downloads.onChanged.removeListener(onChanged);
      downloads.onErased.removeListener(onErased);
      if (state === 'complete') resolve();
      else reject(new Error('Download did not finish.'));
    }

    function onChanged(change) {
      if (change.id === id) finish(change.state?.current);
    }

    function onErased(erasedId) {
      if (erasedId === id) finish('interrupted');
    }

    downloads.onChanged.addListener(onChanged);
    downloads.onErased.addListener(onErased);
    downloads.search({ id }).then(
      ([item]) => finish(item?.state ?? 'interrupted'),
      () => finish('interrupted'),
    );
  });
}

async function download(blob, filename, saveAs) {
  const url = URL.createObjectURL(blob);
  try {
    const id = await chrome.downloads.download({
      url,
      filename,
      saveAs,
      conflictAction: 'uniquify',
    });
    await waitForDownload(id);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function saveCopy({ name, saveAs, bytes }) {
  const filename = safeName(name, 'document.pdf');
  const type = /\.pdf$/i.test(filename) ? 'application/pdf' : 'application/octet-stream';
  pendingSaves += 1;
  status.textContent = 'Saving a local copy…';
  try {
    await download(new Blob([bytes], { type }), filename, Boolean(saveAs));
    lastSaveFailed = false;
    status.textContent = 'Saved a local copy.';
  } catch {
    lastSaveFailed = true;
    status.textContent = 'The copy wasn’t saved. Use Save As to try again.';
  } finally {
    pendingSaves -= 1;
  }
}

function hasUnsavedChanges() {
  return dirty || lastSaveFailed || pendingSaves > 0;
}

downloadOriginal.addEventListener('click', async () => {
  downloadOriginal.disabled = true;
  try {
    await download(original.blob, original.name, false);
    status.textContent = 'Downloaded the original PDF.';
  } catch {
    status.textContent = 'The original PDF could not be downloaded.';
  } finally {
    downloadOriginal.disabled = false;
  }
});

async function fallback() {
  useBrave.disabled = true;
  try {
    await handler.abortAndFallbackToNativeHandler();
  } catch {
    status.textContent = 'Brave could not switch viewers for this PDF.';
    useBrave.disabled = false;
  }
}

useBrave.addEventListener('click', () => {
  const unsaved = hasUnsavedChanges();
  if (unsaved || mayReloadFromNetwork) {
    document.querySelector('#discard-note').hidden = !unsaved;
    document.querySelector('#reload-note').hidden = !mayReloadFromNetwork;
    discard.returnValue = 'cancel';
    discard.showModal();
  } else {
    fallback();
  }
});

discard.addEventListener('close', () => {
  if (discard.returnValue === 'switch') fallback();
});

window.addEventListener('beforeunload', event => {
  if (!hasUnsavedChanges()) return;
  event.preventDefault();
  event.returnValue = true;
});

canvas.addEventListener('pdfcraft:dirty', ({ detail }) => { dirty = detail.dirty; });
canvas.addEventListener('pdfcraft:save', ({ detail }) => { void saveCopy(detail); });

async function openPdf() {
  if (!handler?.getStreamInfo) {
    status.textContent = 'This Brave build does not expose the PDF handler API.';
    return;
  }

  let info;
  try {
    info = await handler.getStreamInfo();
  } catch {
    status.textContent = 'Open a PDF link in Brave to use this viewer.';
    return;
  }

  try {
    mayReloadFromNetwork = /^https?:/i.test(info.originalUrl);
    const name = documentName(info.originalUrl);
    const blob = await readPdf(info.streamUrl);
    original = { name, blob };
    downloadOriginal.hidden = false;
    useBrave.disabled = false;

    const bytes = await blob.arrayBuffer();
    let ready = false;
    canvas.addEventListener('pdfcraft:ready', () => {
      ready = true;
      canvas.dispatchEvent(new CustomEvent('pdfcraft:open', { detail: { name, bytes } }));
    }, { once: true });
    await init({ module_or_path: new URL('./vendor/pdfcraft-web-479fd1d14d164a34_bg.wasm', import.meta.url) });
    if (!ready) throw new Error('PdfCraft could not start.');
    status.textContent = '';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'PdfCraft could not open this PDF.';
    useBrave.disabled = false;
  }
}

void openPdf();
