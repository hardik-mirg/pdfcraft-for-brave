# PdfCraft for Brave

An unpacked Manifest V3 extension that uses the ArtCraft team's PdfCraft
WebAssembly build to open full-tab PDFs in Brave. The PDF and its edits are
processed in the browser. The extension requires no web host or native companion.
This is an independent browser extension for the upstream PdfCraft project.

## Install

1. Clone this repository or download and extract its source ZIP.
2. In desktop Brave, open `brave://extensions` and turn on **Developer mode**.
3. Select **Load unpacked**, then choose the folder that contains `manifest.json`.
4. Under `brave://settings/content/pdfDocuments`, select **Open PDFs in Brave**.
   Open a PDF in a fresh tab to try it.

Tested on macOS with Brave 1.98.63 (Chromium 156). Chromium's PDF handler API
requires version 151 or later and must be available in the browser build. Brave
may display a downloads permission prompt. The extension uses that permission
to save PDF copies and confirm that the browser finished writing them.

## Use

- **Save** downloads a new copy. **Save As** asks where to put it.
- **Download original** saves the exact PDF Brave received, including when its
  source URL can only be opened once.
- **Open in Brave’s viewer** switches the current document to the built-in
  viewer. Brave can request a network PDF again during this switch, so save a
  copy first if the link is single-use.
- To turn automatic handling off, open **Details → Extension options** on
  PdfCraft for Brave's card in `brave://extensions` and clear the checkbox.
  Embedded PDFs and attachment downloads use Brave's usual behavior.

## Upstream build

The package bundles the unmodified PdfCraft v0.19.0 JavaScript and WebAssembly
assets. The source ZIP was verified with SHA-256
`6cecea09db4d010f1ae18d4c3170db243c7adc653699ba2711f570d57fed6947`.
Upstream license and notice files are in `vendor/`. The bundled WebAssembly is
about 53 MiB and is tracked in Git so a clone is ready to load in Brave.

[PdfCraft release](https://github.com/storytold/pdfcraft/releases/tag/v0.19.0) · [Chromium MIME handler API](https://developer.chrome.com/docs/extensions/reference/api/mimeHandler)
