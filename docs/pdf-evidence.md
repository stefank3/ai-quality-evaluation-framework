# PDF generation and verification

The canonical source is [the Markdown workbook](../guide/AI-Quality-Evaluation-Framework-Guide.md). The [generated PDF](../guide/AI-Quality-Evaluation-Framework-Guide.pdf) is built by `npm run docs:pdf` using local Python, ReportLab 4.4.9 and pypdf 6.10.0. No browser package, external conversion service or network request is used.

The generator fixes PDF timestamps and metadata. Identical source and pinned tooling produce identical bytes. The title page records version, generation date and source provenance. PDF generation remains outside primary validation; dependency installation is a separate optional step.

Validation checks the `%PDF-` signature, nonzero page count, reasonable size (10 KB–5 MB), extractable text, all 30 expected chapter headings and internal bookmarks. Page numbers and a clickable contents table support navigation. Code blocks have an enforced maximum line length and use a dedicated monospace style.

The reviewed workbook contains 32 A4 pages: title, contents and 30 study units. The PDF is approximately 72 KB; exact bytes and SHA-256 are recorded in milestone validation evidence rather than embedded in the PDF itself.

Visual review uses Poppler to render all pages, followed by contact-sheet inspection and full-page inspection of representative title, contents and code pages. The initial review identified an avoidable contents spill; its spacing was corrected before final generation. No clipped content or overlapping elements remained in the reviewed output.

To repeat the visual check with Poppler installed:

```sh
pdftoppm -scale-to 1200 -png guide/AI-Quality-Evaluation-Framework-Guide.pdf tmp/page
```

Create `tmp/` first. Rendering tools are optional review tools, not evaluation dependencies. The PDF generator itself validates structural/text evidence without requiring Poppler.
