# SEO follow-up — 27 September 2026

## Baseline

Search Console property `sc-domain:eatthisdot.com`, web search, final data:

| Metric | 28 Aug–24 Sep | 31 Jul–27 Aug |
| --- | ---: | ---: |
| Clicks | 621 | 202 |
| Impressions | 109,883 | 36,843 |
| CTR | 0.565% | 0.548% |
| Average position | 12.26 | 11.97 |

Google's generative-AI beta report: 1,986 impressions in the current period.
The site's daily referrer aggregates record 31 ChatGPT visits and one Gemini
visit. Referrers are incomplete attribution, not a census of AI citations.
Only seven days of the previous period exist in that counter; do not infer
month-over-month AI growth from it.

## Changes in this branch

- Every translated page receives its own sitemap `<loc>` with reciprocal
  hreflang links. Previously only German URLs were primary sitemap entries.
  Single-language articles follow the same content/title checks as their
  canonical metadata, including English-only articles. Staging stays empty;
  closed/noindex restaurants and untranslated fallback duplicates stay out.
- Pizza links to its pizzeria guide; Dinner links to the date and Italian
  guides. Each guide links back to its category. Existing localized Link
  components render these links.
- The former `der-weinlobbyist-restaurant-weinbar` slug redirects to
  `der-weinlobbyist` through the existing locale-preserving redirect flow.
  The old EN URL returned 404; the current destination returned 200, and
  Sanity confirms the live restaurant identity.

Google's sitemap requirements:
https://developers.google.com/search/docs/specialty/international/localized-versions#sitemap

## CMS work, separate from the Git deployment

Published with optimistic revision guards:

- `news-vietnamesische-restaurants-berlin`: four restaurant sections instead
  of the unsupported promise of six, in both meta titles, descriptions,
  excerpts and introductions. Dong Xuan remains an additional detour.
- Bari (`d0225f17-5a29-43f0-b8d8-3e68948c35e8`): English description no longer
  incorrectly says “no food service”; short English description added.
  Aligned with the existing German content and corroborated by visitBerlin:
  https://www.visitberlin.de/en/blog/top-11-new-openings-berlin-june
- Lunch (`c9e3946e-478f-458f-ba5e-1372e27489b7`): concise DE/EN introductions
  name sandwiches, bánh mì, bowls and brasserie dining, all represented by
  its existing curated picks. No unsupported menu prices or timings added.

Live HTML checks confirm the English Bari and Vietnam corrections. Lunch is
published in Sanity but the live category still serves its previous cached
copy. Its normal ISR interval is 24 hours. A local cache-refresh credential
was unavailable; automatic approval review rejected access to the production
Secret Manager key. No secret was retrieved and no manual refresh occurred.

Already-existing district drafts were preserved, with only their SEO titles
and descriptions updated to match their newer, concrete restaurant selections:

- Mitte: `drafts.43309b8f-1475-4dd4-891b-8da8d03d5438`
- Neukölln: `drafts.c3a8c2cb-9229-44f2-ae4c-30c742ae9318`

These drafts include work predating this session and were not published as
part of this change. Publishing them requires reviewing their complete diff.

Bari's putative `bari.berlin` domain returned a parking page; no verified
original menu URL was found. The Instagram website link was retained and no
invented menu link, dishes or prices were inserted.

## Indexation triage

GSC report updated 21 September: 983 indexed; 675 excluded. No bulk validation
or blanket redirects were submitted.

Read-only URL Inspection API, checked 27 September:

| URL | Google result | Current live result |
| --- | --- | --- |
| `/en/bezirk/neukoelln` | Crawled, not indexed; indexing allowed; Google and declared canonical agree; last crawl 21 Sep | 200, index/follow, self-canonical |
| `/restaurant/nuarasa` | Crawled, not indexed; successful fetch; last crawl 17 Sep | 200, index/follow, self-canonical |
| `/restaurant/babka-krantz` | Excluded by noindex | CMS marks the venue closed; do not re-enable indexation |

The complete 117-row GSC 404 list was inspected. Live checks of 13 recent
restaurant URLs confirmed 404s, including Story Coffee P-Berg, Sathutu,
Kushinoya, Tobi, Golden Phoenix, Heritage, Prism, Chungking Noodles, Secret
Garden, Aleppo, Weinlobbyist, La Côte and Sage. A confirmed live successor was
found for Weinlobbyist. Do not redirect the others to unrelated category or
home pages just to clear GSC; their identities/successors need evidence.
Historical accent/split redirects already exist and should not be duplicated.

## Verification and next measurement

- Full existing suite: 284 files passed, 2 skipped; 2,342 tests passed, 7 skipped.
- After adding the Weinlobbyist regression case: all 44 targeted sitemap,
  cross-link and redirect tests passed.
- Lint and typecheck passed. Pre-push hook must run the isolated build.
- Measure the same queries and landing pages after rollout and recrawl. Start
  with Lunch DE/EN, Pizza EN, Mitte, Neukölln EN and the Vietnam guide. Average
  position across changing query mixes alone is not a causal ranking measure.
- Distinguish Google AI impressions, AI referrer visits and conversions.
  This work creates neither guaranteed rankings nor guaranteed indexation.
