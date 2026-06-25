# Biomedical Evidence Ranking

Use this reference when ranking biomedical or clinical papers. It is a relevance and evidence-quality guide, not a substitute for clinical appraisal.

## Evidence Priority

| Priority | Evidence Type | Notes |
|----------|---------------|-------|
| 1 | Clinical guidelines | Prefer official professional societies, government agencies, and clearly dated guidelines |
| 2 | Systematic reviews / meta-analyses | Check inclusion criteria, date range, heterogeneity, and whether it includes RCTs |
| 3 | Randomized controlled trials | Prefer adequately powered, preregistered, peer-reviewed trials |
| 4 | Cohort / case-control studies | Useful for risk factors and real-world outcomes; check confounding |
| 5 | Cross-sectional studies / surveys | Useful for prevalence and associations, weaker for causality |
| 6 | Case series / case reports | Useful for rare events and hypothesis generation |
| 7 | Narrative reviews / opinions | Useful for background, not strong evidence alone |
| 8 | Preprints | Keep separate from peer-reviewed evidence, especially for clinical claims |

## Fields to Extract

- `publication_type`
- `study_type`
- `sample_size`
- `population`
- `mesh_terms`
- trial registration ID if present
- funding/conflict notes if visible in metadata or abstract

## Ranking Rules

1. Match the clinical/research question before evidence level.
2. Prefer recent guidelines and reviews for settled clinical questions.
3. Prefer primary studies when the user asks for original evidence.
4. Label preprints and do not mix them silently with peer-reviewed studies.
5. Report uncertainty when metadata lacks study type or sample size.
