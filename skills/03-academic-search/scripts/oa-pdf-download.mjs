#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    input: '',
    manifest: '',
    outDir: '',
    download: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--download') {
      args.download = true;
    } else if (arg === '--input') {
      args.input = argv[++i] || '';
    } else if (arg === '--manifest') {
      args.manifest = argv[++i] || '';
    } else if (arg === '--out-dir') {
      args.outDir = argv[++i] || '';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.input) throw new Error('Missing required argument: --input');
  if (!args.manifest) throw new Error('Missing required argument: --manifest');
  if (args.download && !args.outDir) {
    throw new Error('Missing required argument when --download is set: --out-dir');
  }

  return args;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.results)) return value.results;
  throw new Error('Input JSON must be an array or an object with a results array');
}

function sourceFromRecord(record) {
  const platforms = Array.isArray(record.source_platforms) ? record.source_platforms : [];
  if (record.arxiv_id) return 'arxiv';
  if (platforms.includes('unpaywall')) return 'unpaywall';
  if (platforms.includes('openalex')) return 'openalex';
  if (platforms.includes('semanticscholar') || platforms.includes('semantic_scholar')) return 'semantic_scholar';
  if (platforms.includes('pubmed') || platforms.includes('pmc')) return 'pubmed_central';
  return platforms[0] || 'unknown';
}

function skipReason(record) {
  if (record.full_text_status !== 'open_pdf') {
    return `full_text_status=${record.full_text_status || 'unknown'}`;
  }
  if (!record.pdf_url) {
    return 'missing pdf_url';
  }
  if (!/^https?:\/\//i.test(record.pdf_url)) {
    return 'pdf_url must be http(s)';
  }
  return '';
}

function makeId(record, index) {
  const raw = record.doi || record.arxiv_id || `${record.title || 'paper'}-${index}`;
  return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
}

function safePart(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'paper';
}

function filenameFor(record, index) {
  const year = record.year ? String(record.year) : '';
  const title = safePart(record.title || record.doi || record.arxiv_id || `paper_${index + 1}`);
  const id = makeId(record, index);
  return [year, title, id].filter(Boolean).join('_') + '.pdf';
}

export function buildManifest(records) {
  return records.map((record, index) => {
    const reason = skipReason(record);
    const eligible = !reason;

    return {
      index: index + 1,
      title: record.title || '',
      authors: Array.isArray(record.authors) ? record.authors : [],
      year: record.year || null,
      doi: record.doi || null,
      arxiv_id: record.arxiv_id || null,
      pdf_url: record.pdf_url || null,
      full_text_status: record.full_text_status || 'unknown',
      source_platforms: Array.isArray(record.source_platforms) ? record.source_platforms : [],
      download_source: eligible ? sourceFromRecord(record) : null,
      download_status: eligible ? 'eligible' : 'skipped',
      download_error: eligible ? null : reason,
      local_pdf_path: null,
      filename: eligible ? filenameFor(record, index) : null,
    };
  });
}

function countStatuses(manifest) {
  const counts = {
    total: manifest.length,
    eligible: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    not_pdf: 0,
  };

  for (const item of manifest) {
    if (item.download_status === 'eligible') counts.eligible += 1;
    if (item.download_status === 'downloaded') counts.downloaded += 1;
    if (item.download_status === 'skipped') counts.skipped += 1;
    if (item.download_status === 'failed') counts.failed += 1;
    if (item.download_status === 'not_pdf') counts.not_pdf += 1;
  }

  return counts;
}

async function fetchPdf(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'academic-search-oa-pdf-download/1.0',
      accept: 'application/pdf,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  const looksPdf = buffer.subarray(0, 5).toString('latin1') === '%PDF-' || contentType.includes('application/pdf');
  if (!looksPdf) {
    const error = new Error(`not a PDF response: ${contentType || 'unknown content-type'}`);
    error.code = 'NOT_PDF';
    throw error;
  }

  return buffer;
}

export async function downloadManifest(manifest, outDir) {
  await fs.mkdir(outDir, { recursive: true });

  for (const item of manifest) {
    if (item.download_status !== 'eligible') continue;

    const outputPath = path.join(outDir, item.filename);
    const partPath = `${outputPath}.part`;

    try {
      const pdf = await fetchPdf(item.pdf_url);
      await fs.writeFile(partPath, pdf);
      await fs.rename(partPath, outputPath);
      item.download_status = 'downloaded';
      item.download_error = null;
      item.local_pdf_path = outputPath;
    } catch (error) {
      await fs.rm(partPath, { force: true }).catch(() => {});
      item.download_status = error.code === 'NOT_PDF' ? 'not_pdf' : 'failed';
      item.download_error = error.message;
      item.local_pdf_path = null;
    }
  }

  return manifest;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputText = await fs.readFile(args.input, 'utf8');
  const records = ensureArray(JSON.parse(inputText));
  let manifest = buildManifest(records);

  if (args.download) {
    manifest = await downloadManifest(manifest, args.outDir);
  }

  await fs.mkdir(path.dirname(args.manifest), { recursive: true });
  await fs.writeFile(args.manifest, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(JSON.stringify(countStatuses(manifest)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  });
}
