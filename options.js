const mimeType = 'application/pdf';
const handler = chrome.mimeHandler;
const enabled = document.querySelector('#enabled');
const status = document.querySelector('#status');

async function loadSetting() {
  if (!handler?.getMimeHandlerOptions || !handler?.setMimeHandlerOptions) {
    status.textContent = 'This Brave build does not expose the PDF handler API. Check for a Brave update.';
    return;
  }

  try {
    const options = await handler.getMimeHandlerOptions(mimeType);
    enabled.checked = options.enabled !== false;
    enabled.disabled = false;
  } catch {
    status.textContent = 'Brave could not read the PDF handler setting.';
  }
}

enabled.addEventListener('change', async () => {
  const requested = enabled.checked;
  enabled.disabled = true;
  try {
    await handler.setMimeHandlerOptions(mimeType, { enabled: requested });
    status.textContent = requested ? 'PdfCraft is enabled.' : 'PdfCraft is disabled.';
  } catch {
    enabled.checked = !requested;
    status.textContent = 'Brave could not update the PDF handler setting.';
  } finally {
    enabled.disabled = false;
  }
});

loadSetting();
