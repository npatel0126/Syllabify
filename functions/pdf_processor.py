"""
pdf_processor.py
Extracts text from a PDF file.

Primary path  : pdfplumber  (works for digital / text-based PDFs)
Fallback path : pdf2image + pytesseract  (scanned / image-only PDFs)
"""

import re
import pdfplumber


# Minimum character count to consider pdfplumber output usable.
_MIN_TEXT_LENGTH = 100


def _clean(text: str) -> str:
    """Strip excessive whitespace and collapse blank lines."""
    # Normalise Windows line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse runs of spaces / tabs to a single space on each line
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    # Remove runs of more than one consecutive blank line
    cleaned_lines: list[str] = []
    blank_run = 0
    for line in lines:
        if line == "":
            blank_run += 1
            if blank_run <= 1:
                cleaned_lines.append(line)
        else:
            blank_run = 0
            cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()


def _extract_with_pdfplumber(pdf_path: str) -> str:
    """Return concatenated text from all pages using pdfplumber."""
    pages: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            pages.append(page_text)
    return "\n".join(pages)


def _extract_with_ocr(pdf_path: str) -> str:
    """Convert each PDF page to an image and run Tesseract OCR on it."""
    # Lazy imports — pdf2image/pytesseract use subprocess which triggers
    # fork() on macOS. Importing them only when needed avoids the ObjC
    # fork-safety crash in the gunicorn worker.
    import pytesseract
    from pdf2image import convert_from_path

    images = convert_from_path(pdf_path)
    pages: list[str] = []
    for image in images:
        page_text: str = pytesseract.image_to_string(image)
        pages.append(page_text)
    return "\n".join(pages)


def extract_text(pdf_path: str) -> str:
    """
    Extract and clean all text from *pdf_path*.

    1. Try pdfplumber first (fast, structure-preserving).
    2. If the result is shorter than _MIN_TEXT_LENGTH characters the PDF is
       probably scanned — fall back to pytesseract OCR via pdf2image.
    3. Clean and return the final text.

    Args:
        pdf_path: Absolute or relative path to the PDF file.

    Returns:
        Cleaned plain-text string of the PDF contents.
    """
    raw = _extract_with_pdfplumber(pdf_path)

    if len(raw.strip()) < _MIN_TEXT_LENGTH:
        raw = _extract_with_ocr(pdf_path)

    return _clean(raw)
