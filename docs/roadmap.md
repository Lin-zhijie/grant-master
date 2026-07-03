# TODO

## Move citation planning earlier

Current design:

- `07-outline` generates `workflow/07_outline/citation_plan.yaml`.
- `08-section-write` / `grant-writer` use stable tags such as `{{cite:vaswani2017attention}}`.
- `09-assemble` replaces tags with `[1]`, `[2]`, `[3]` by first appearance and inserts the bibliography.

Future improvement:

- Move most `citation_plan` preparation upstream into `04-paper-digest`, or even `03-academic-search`.
- Rationale: citation metadata is already available when papers are searched and digested, so title/authors/year/venue/DOI/BibTeX/tag generation can be normalized once instead of reconstructed during outline.
- Likely design:
  - `03-academic-search` records raw citation metadata and candidate `citation_tag`.
  - `04-paper-digest` validates metadata, normalizes `reference_text`, and exports a reusable citation registry.
  - `05-synthesis` / `07-outline` only allocate existing citation tags to claims and units.
  - `08` and `09` keep their current responsibilities unchanged.

Files likely affected:

- `skills/03-academic-search/SKILL.md`
- `agents/searcher.md`
- `skills/04-paper-digest/SKILL.md`
- `agents/digester.md`
- `skills/05-synthesis/SKILL.md`
- `skills/07-outline/SKILL.md`
- `docs/workflow-contract.md`

Open questions:

- Should the upstream registry live under `workflow/04_paper_digest/citation_registry.yaml` or `workflow/05_synthesis/citation_registry.yaml`?
- Should `citation_tag` be generated at search time or only after paper digest confirms the paper is actually usable?
- Should BibTeX be stored in addition to the current plain `reference_text`?
