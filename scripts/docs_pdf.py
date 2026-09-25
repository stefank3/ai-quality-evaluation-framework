"""Local canonical-Markdown PDF builder/validator, invoked by npm run docs:pdf.

No arguments, environment input, network, or subprocesses. Reads guide Markdown;
writes the matching PDF and validates signature, pages, headings, text and size.
Requires isolated guide/requirements.txt. Exits nonzero on parsing/layout/validation
errors. Chapter-level page breaks support workbook study; headings become bookmarks
and a clickable contents table. Fixed PDF timestamps make identical source reproducible.
"""
from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted,
)
from reportlab.platypus.tableofcontents import TableOfContents
from pypdf import PdfReader

SOURCE = Path('guide/AI-Quality-Evaluation-Framework-Guide.md')
OUTPUT = SOURCE.with_suffix('.pdf')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('BodyGuide', fontName='Helvetica', fontSize=11,
                          leading=17, spaceAfter=11, textColor=colors.HexColor('#243247')))
styles.add(ParagraphStyle('TitleGuide', parent=styles['Title'], fontSize=28,
                          leading=34, spaceAfter=28, textColor=colors.HexColor('#183e62')))
styles.add(ParagraphStyle('Chapter', parent=styles['Heading1'], fontSize=21,
                          leading=27, spaceAfter=20, textColor=colors.HexColor('#183e62')))
styles.add(ParagraphStyle('SubGuide', parent=styles['Heading2'], fontSize=13,
                          leading=18, spaceBefore=14, spaceAfter=9))
styles.add(ParagraphStyle('ContentsTitle', parent=styles['Chapter']))
styles.add(ParagraphStyle('CodeGuide', fontName='Courier', fontSize=9,
                          leading=13, spaceBefore=8, spaceAfter=13,
                          textColor=colors.HexColor('#172436'),
                          backColor=colors.HexColor('#eef2f6'), borderPadding=8))
styles.add(ParagraphStyle('FooterGuide', fontSize=8, alignment=TA_CENTER,
                          textColor=colors.HexColor('#607086')))


def inline(value):
    """Escape source first, then render bounded inline code/emphasis and readable links."""
    value = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', value)
    value = escape(value)
    value = re.sub(r'`([^`]+)`', r'<font name="Courier">\1</font>', value)
    return re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', value)


class Workbook(SimpleDocTemplate):
    """Register chapter bookmarks and page numbers while ReportLab builds local pages."""

    def afterFlowable(self, flowable):
        """Connect rendered chapter headings to PDF outline and clickable TOC entries."""
        if isinstance(flowable, Paragraph) and flowable.style.name == 'Chapter':
            text = flowable.getPlainText()
            key = 'chapter-' + re.sub(r'[^a-z0-9]+', '-', text.lower())
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, 0)
            self.notify('TOCEntry', (0, text, self.page, key))


def footer(canvas, document):
    """Draw stable workbook footer outside body frame; never reads the clock."""
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#607086'))
    canvas.drawString(48, 28, 'ASTER / AI QUALITY EVALUATION / v1.0.0')
    canvas.drawRightString(A4[0] - 48, 28, str(document.page))
    canvas.restoreState()


def build():
    """Parse the documented Markdown subset, create the PDF, and validate its artifacts."""
    source = SOURCE.read_text(encoding='utf-8')
    story = []
    paragraph = []
    code = None
    headings = []

    def flush():
        """Preserve Markdown paragraph boundaries as readable wrapped PDF body text."""
        if paragraph:
            story.append(Paragraph(inline(' '.join(paragraph)), styles['BodyGuide']))
            paragraph.clear()

    for line in source.splitlines():
        if line.startswith('```'):
            flush()
            if code is None:
                code = []
            else:
                if any(len(item) > 88 for item in code):
                    raise ValueError('Guide code line exceeds readable width')
                story.append(Preformatted('\n'.join(code), styles['CodeGuide']))
                code = None
            continue
        if code is not None:
            code.append(line)
        elif line.startswith('# '):
            flush()
            story.extend([Spacer(1, 90), Paragraph(inline(line[2:]), styles['TitleGuide'])])
        elif line == '## Contents':
            flush()
            story.extend([PageBreak(), Paragraph('Contents', styles['ContentsTitle'])])
            toc = TableOfContents()
            toc.levelStyles = [ParagraphStyle('ContentsEntry', fontSize=9.5, leading=13, spaceAfter=0)]
            story.append(toc)
        elif line.startswith('## '):
            flush()
            heading = line[3:]
            headings.append(heading)
            story.extend([PageBreak(), Paragraph(inline(heading), styles['Chapter'])])
        elif line.startswith('### '):
            flush()
            story.append(Paragraph(inline(line[4:]), styles['SubGuide']))
        elif line.startswith('- '):
            flush()
            story.append(Paragraph('- ' + inline(line[2:]), styles['BodyGuide']))
        elif not line.strip():
            flush()
        elif line.startswith('<!--'):
            continue
        else:
            paragraph.append(line)
    flush()
    if code is not None:
        raise ValueError('Unclosed Markdown code block')
    document = Workbook(str(OUTPUT), pagesize=A4, leftMargin=48, rightMargin=48,
                        topMargin=50, bottomMargin=50, title='AI Quality Evaluation Framework Guide',
                        author='Stefan Kajchevski', invariant=1, pageCompression=1)
    document.multiBuild(story, onFirstPage=footer, onLaterPages=footer)
    reader = PdfReader(OUTPUT)
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    if not OUTPUT.read_bytes().startswith(b'%PDF-') or not 10_000 < OUTPUT.stat().st_size < 5_000_000:
        raise ValueError('PDF signature or size invalid')
    if not reader.pages or any(heading not in text for heading in headings):
        raise ValueError('PDF page/text/headings validation failed')
    if not reader.outline:
        raise ValueError('Missing internal navigation')
    print(f'PDF verified: {len(reader.pages)} pages; {OUTPUT.stat().st_size} bytes; '
          f'{len(headings)} chapter headings; extractable text and bookmarks.')


if __name__ == '__main__':
    build()
