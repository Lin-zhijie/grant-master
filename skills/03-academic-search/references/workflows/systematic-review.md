# Systematic Review Workflow

Use this workflow when the user asks for a systematic review, PRISMA-style screening, reproducible literature search, or evidence map.

## Steps

1. Define the question and inclusion criteria.
   - Biomedical: use PICO when applicable.
   - Social science: define population, intervention/exposure, method, geography, and dates.
2. Select discipline profile and databases.
3. Build search strings with synonyms and controlled vocabulary.
4. Run first-pass search and export a screening table.
5. Deduplicate by DOI, PMID/PMCID, arXiv ID, then title/year/author.
6. Screen title/abstract with explicit exclusion reasons.
7. Fetch legal open full text where available and record `full_text_status`.
8. Extract final fields and evidence/risk notes.

## Screening Table Fields

| Field | Purpose |
|-------|---------|
| title | Human screening |
| authors | Disambiguation |
| year | Date filter |
| venue | Source quality |
| doi / pmid / arxiv_id | Deduplication |
| publication_type | Evidence sorting |
| abstract | Screening |
| include_decision | `include`, `exclude`, `maybe` |
| exclusion_reason | Required when excluded |
| full_text_status | Full text availability |

## Stop Conditions

Stop and ask the user before claiming systematic-review completeness if:

- only one database was searched;
- search strings were not recorded;
- paywalled full texts block extraction;
- inclusion/exclusion criteria are ambiguous;
- the task needs formal risk-of-bias assessment.
