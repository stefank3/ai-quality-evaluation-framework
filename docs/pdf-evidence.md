# PDF generation and verification

The canonical source is [the Markdown workbook](../guide/AI-Quality-Evaluation-Framework-Guide.md). The [generated PDF](../guide/AI-Quality-Evaluation-Framework-Guide.pdf) is built by `npm run docs:pdf` using local Python, ReportLab 4.4.9 and pypdf 6.10.0. No browser package, external conversion service or network request is used.

The generator fixes PDF timestamps and metadata. Identical source and pinned tooling produce identical bytes. The title page records version, generation date and source provenance. PDF generation remains outside primary validation; dependency installation is a separate optional step.

Validation checks the `%PDF-` signature, nonzero page count, reasonable size (10 KB–5 MB), extractable text, all 30 expected chapter headings and internal bookmarks. Page numbers and a clickable contents table support navigation. Code blocks have an enforced maximum line length and use a dedicated monospace style.

The correction-pass workbook contains **32 A4 pages, 72,780 bytes and all 30 chapter headings**. Its SHA-256 is `245a0b6590e1bd3a0059d742aa40e78b8b9ba0f9872f2eeeb23faefc25c69b7e`. Two consecutive `npm run docs:pdf` runs with ReportLab 4.4.9 and pypdf 6.10.0 produced byte-identical output. Signature, extractable text, headings and bookmarks passed the generator's validation.

Review baseline: `0b8c95b38891a8172f73b3b086b9b50851db9010`. The containing correction commit records the updated implementation, canonical Markdown and PDF together. The title page identifies this relationship and policy 1.0.1; the final commit hash belongs in external PR evidence rather than inside its own artifact.

All 32 pages were rendered with Poppler and reviewed as contact sheets, with title, contents and scoring pages inspected at full size. No clipped content or overlapping elements were found. Poppler emitted a missing optional Symbol display-font warning; the rendered pages and extracted chapter text were intact.

To repeat the visual check with Poppler installed:

```sh
pdftoppm -scale-to 1200 -png guide/AI-Quality-Evaluation-Framework-Guide.pdf tmp/page
```

Create `tmp/` first. Rendering tools are optional review tools, not evaluation dependencies. The PDF generator itself validates structural/text evidence without requiring Poppler.
