---
domain: sciencedirect.com
aliases: [ScienceDirect, Elsevier]
updated: 2026-05-01
---

## Platform Characteristics

- Elsevier publisher platform.
- Article landing pages may be public, but PDFs often require institutional entitlement.
- Some open-access articles expose a PDF link, but closed articles should be marked `needs_institution`.

## Effective Pattern

1. Resolve DOI to the article page.
2. Check metadata and open-access labels.
3. Prefer Unpaywall before attempting publisher PDF routes.
4. If a PDF URL returns HTML, login, or entitlement pages, set `full_text_status=html_not_pdf` or `needs_institution`.

## Known Traps

- HTTP 403 or redirected login pages are access restrictions, not retryable download failures.
- A visible article abstract does not imply PDF access.
- Do not use third-party paywall bypass services.
