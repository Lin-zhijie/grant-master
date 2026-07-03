import assert from 'node:assert/strict';
import test from 'node:test';

import { buildManifest } from '../../scripts/academic-search/oa-pdf-download.mjs';

test('buildManifest marks open PDFs as eligible and paywalled papers as skipped', () => {
  const manifest = buildManifest([
    {
      title: 'Open Paper',
      authors: ['A. Author'],
      year: 2026,
      arxiv_id: '2601.00001',
      pdf_url: 'https://arxiv.org/pdf/2601.00001',
      full_text_status: 'open_pdf',
      source_platforms: ['semantic_scholar'],
    },
    {
      title: 'Closed Paper',
      year: 2025,
      doi: '10.1000/example',
      full_text_status: 'needs_institution',
      source_platforms: ['publisher'],
    },
  ]);

  assert.equal(manifest.length, 2);
  assert.equal(manifest[0].download_status, 'eligible');
  assert.equal(manifest[0].download_source, 'arxiv');
  assert.match(manifest[0].filename, /^2026_Open_Paper_[a-f0-9]{12}\.pdf$/);
  assert.equal(manifest[1].download_status, 'skipped');
  assert.equal(manifest[1].download_error, 'paywalled_do_not_bypass');
});
