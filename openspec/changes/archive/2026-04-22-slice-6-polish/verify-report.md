# Verification Report — slice-6-polish

**Mode**: Strict TDD
**Spec**: `specs/site-polish/spec.md` (NEW, 10 requirements, ~22 scenarios)
**Date**: 2026-04-22

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 28 |
| Tasks complete | 28 |
| Tasks incomplete | 0 |

---

## Build & Tests Execution

- **Lint**: ✅ `pnpm lint` — 0 warnings.
- **Typecheck**: ✅ `pnpm exec tsc --noEmit` — 0 errors.
- **Tests**: ✅ `pnpm test` — **194/194 passed**, 0 failed, 0 skipped. (+31 from slice 5.)

### Coverage (targeted check)

All new files covered by direct unit/RTL tests:

| File | Test | Notes |
|------|------|-------|
| `src/lib/seo.ts` | `seo.test.ts` | 6 scenarios — 100% covered. |
| `src/app/sitemap.ts` | `sitemap.test.ts` | 4 scenarios. |
| `src/app/robots.ts` | `robots.test.ts` | 3 scenarios. |
| `src/app/not-found.tsx` | `not-found.test.tsx` | 2 scenarios. |
| `src/app/error.tsx` | `error.test.tsx` | 3 scenarios including no-leak assertion. |
| `src/components/product/product-card-skeleton.tsx` | `product-card-skeleton.test.tsx` | 2 scenarios. |
| `src/app/catalogo/loading.tsx` | `loading.test.tsx` | 2 scenarios. |
| `src/app/producto/[slug]/loading.tsx` | `loading.test.tsx` | 2 scenarios. |
| `src/app/layout.tsx` | `layout.test.tsx` | 2 scenarios (skip link + main landmark). |
| `src/app/opengraph-image.tsx` | `opengraph-image.test.tsx` | 4 scenarios — default NOT invoked (Edge runtime). |

---

## TDD Compliance

All 14 RED→GREEN pairs present. RED evidence: each new test file was introduced with failing tests (missing modules or unimplemented components) and the implementation followed. Existing `src/app/producto/[slug]/page.test.ts` was extended with a RED test for canonical metadata before the `generateMetadata` was updated.

---

## Spec Compliance Matrix

| Req | Scenario | Test | Result |
|-----|----------|------|--------|
| 1. absoluteUrl | Root path | `seo.test > returns the site root for '/'` | ✅ |
| 1. absoluteUrl | Nested path | `seo.test > concatenates a nested path…` | ✅ |
| 1. absoluteUrl | No leading slash | `seo.test > normalizes…` | ✅ |
| 1. absoluteUrl | Collapses double slash | `seo.test > collapses leading double slashes` | ✅ |
| 2. Sitemap | Static routes included | `sitemap.test > includes the four static routes` | ✅ |
| 2. Sitemap | One entry per product | `sitemap.test > includes one entry per product` | ✅ |
| 2. Sitemap | Entry shape | `sitemap.test > lastModified is Date, url absolute` | ✅ |
| 3. Robots | Allow-all | `robots.test > allows all crawlers` | ✅ |
| 3. Robots | Sitemap reference | `robots.test > points at the sitemap` | ✅ |
| 3. Robots | Host | `robots.test > sets the canonical host` | ✅ |
| 4. Not-Found | Branded heading + home CTA | `not-found.test > renders the branded heading` + `> home link` | ✅ |
| 4. Not-Found | Per-route still wins | Product-specific `producto/[slug]/not-found.tsx` unchanged; Next resolves most-specific first | ⚠️ PARTIAL — structural, no explicit routing test (jsdom can't simulate Next's route resolution) |
| 5. Error | Generic message | `error.test > renders a generic Spanish message without leaking error details` | ✅ |
| 5. Error | Reintentar calls reset | `error.test > invokes reset when Reintentar is clicked` | ✅ |
| 5. Error | Home link | `error.test > provides a home link` | ✅ |
| 6. Catalog loading | Role + label | `catalogo/loading.test > renders a status region with the Spanish label` | ✅ |
| 6. Catalog loading | 12 skeleton cards | `catalogo/loading.test > renders exactly 12 product card skeletons` | ✅ |
| 7. PDP loading | Role + label | `producto/[slug]/loading.test > renders a status region…` | ✅ |
| 7. PDP loading | Gallery + info placeholders | `… > renders a gallery square…` | ✅ |
| 8. Skip link + main | Skip link exists | `layout.test > renders a skip-to-content link with href='#main'` | ✅ |
| 8. Skip link + main | Main landmark | `layout.test > renders a <main id='main' tabindex='-1'>` | ✅ |
| 9. OG Image | Exports metadata | `opengraph-image.test > exports a 1200x630 size` + contentType + alt | ✅ |
| 9. OG Image | Default is a function | `… > default export is a function` | ✅ |
| 10. Canonical | Root canonical | Covered by layout metadata edit + tsc (no runtime import of layout metadata in tests) | ⚠️ PARTIAL — structural |
| 10. Canonical | Catalog canonical | Metadata export is static; tsc + code inspection confirm. No dedicated test. | ⚠️ PARTIAL — structural |
| 10. Canonical | Product canonical | `producto/[slug]/page.test.ts > includes a canonical alternate` | ✅ |

**Compliance summary**: 19/22 ✅ COMPLIANT, 3/22 ⚠️ PARTIAL (structural-only, all static metadata values), 0 ❌ FAILING.

---

## Correctness (static)

| Requirement | Status |
|------------|--------|
| 1. absoluteUrl helper | ✅ |
| 2. Sitemap | ✅ |
| 3. Robots | ✅ |
| 4. Global Not-Found | ✅ |
| 5. Global Error Boundary | ✅ |
| 6. Catalog Loading Skeleton | ✅ |
| 7. PDP Loading Skeleton | ✅ |
| 8. Skip Link + Main Landmark | ✅ |
| 9. OG Image | ✅ |
| 10. Canonical URLs | ✅ |

---

## Coherence (design)

| Decision | Followed? |
|----------|-----------|
| 1. Single `site-polish` capability | ✅ |
| 2. `absoluteUrl` semantics (no trailing slash, collapse) | ✅ |
| 3. `sitemap.ts` excludes stubs | ✅ |
| 4. `robots.ts` with host | ✅ |
| 5. `not-found.tsx` RSC branded | ✅ |
| 6. `error.tsx` `"use client"` + no leak | ✅ |
| 7. Shared `ProductCardSkeleton` with `data-slot` | ✅ |
| 8. Skip link first child of `<body>` + `<main id tabIndex=-1>` | ✅ |
| 9. OG image with Edge runtime | ✅ |
| 10. Canonical URLs per page | ✅ |
| 11. Test strategy: unit/structural, no invocation of ImageResponse, no exact timestamp assertion | ✅ |
| 12. `data-slot` for skeleton count stability | ✅ |
| 13. `runtime = "edge"` marker | ✅ |
| 14. Don't invoke OG default | ✅ |
| 15. Out-of-scope guardrails | ✅ |

No deviations.

---

## Issues Found

**CRITICAL**: None.

**WARNING**:
- **W1 (Req 4)**: No runtime test verifies that the per-route `producto/[slug]/not-found.tsx` takes precedence over the global `not-found.tsx`. This is guaranteed by Next's most-specific-wins resolution, but a future regression test (via Next's route resolution or a Playwright smoke) would close the gap.
- **W2 (Req 10)**: Static page metadata (root layout, `/`, `/catalogo`, `/carrito`, `/sucursales`) is structurally verified via tsc but has no runtime test importing each page's `metadata` const. The values are trivially grep-able and shipped directly, so the risk of regression is low. Adding a small test that imports `metadata` from each page would formalize the contract.
- **W3 (Req 9)**: The OG image's `default` export is never invoked in tests because `ImageResponse` requires the Edge runtime. Manual QA or a production deploy must validate the rendered image.

**SUGGESTION**:
- **S1**: Add a Playwright smoke test after deploy to assert `/sitemap.xml` and `/robots.txt` return 200 with expected content, and the OG preview image renders in production.
- **S2**: Consider adding an `opengraph-image.alt.txt` for text-only OG consumers.
- **S3**: Expand `robots.ts` with future `disallow` rules as admin/checkout routes appear.

---

## Verdict

**PASS WITH WARNINGS.**

All 10 requirements implemented. 194/194 tests pass. Lint + typecheck clean. 3 WARNINGs are structural-only gaps around static metadata + Edge-only runtime — none block archive. Safe to proceed.
