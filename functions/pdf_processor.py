"""
pdf_processor.py
Extracts text from a PDF or image file.

Primary path  : pdfplumber  (works for digital / text-based PDFs)
Fallback path : pdf2image + pytesseract  (scanned / image-only PDFs)
Images        : pytesseract directly (PNG/JPG)
"""

import os
import re

# Minimum character count to consider pdfplumber output usable.
_MIN_TEXT_LENGTH = 100

_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}


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
    import pdfplumber

    pages: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            pages.append(page_text)
    return "\n".join(pages)


def _extract_with_ocr_pdf(pdf_path: str) -> str:
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


def _extract_with_ocr_image(image_path: str) -> str:
    """Run Tesseract OCR directly on a single image file (PNG/JPG)."""
    import pytesseract
    from PIL import Image

    with Image.open(image_path) as img:
        return pytesseract.image_to_string(img)


def extract_text(file_path: str) -> str:
    """
    Extract text from a PDF or image file.

    - Images (.png/.jpg/.jpeg): OCR directly.
    - PDFs: try pdfplumber first; fall back to OCR if output is too short
      (e.g. scanned/image-only PDF).
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext in _IMAGE_EXTENSIONS:
        text = _extract_with_ocr_image(file_path)
        return _clean(text)

    # Default: treat as PDF
    try:
        text = _extract_with_pdfplumber(file_path)
    except Exception:
        text = ""

    if len(text.strip()) < _MIN_TEXT_LENGTH:
        text = _extract_with_ocr_pdf(file_path)

    return _clean(text)