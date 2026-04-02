"""
ai_extractor.py
Uses Gemini to extract structured assignment data and grade breakdowns
from raw syllabus text.
"""

import json
import logging
import os
import re
import time

from google import genai
from google.genai.errors import ClientError

logger = logging.getLogger(__name__)

_client: genai.Client | None = None

# Model priority list — tried in order on quota exhaustion.
_MODELS = [
    "gemini-2.5-flash-lite",    # cheapest, most permissive quota
    "gemini-2.5-flash",         # fallback
    "gemini-flash-lite-latest", # alias fallback
]
_MAX_RETRIES = 3

# Max characters per single API call.
# gemini-2.5-flash-lite window ~1M tokens; 30k chars ~= 7,500 tokens.
_MAX_TEXT_CHARS = 30_000

# Chunk / overlap sizes for syllabi that exceed _MAX_TEXT_CHARS after filtering.
_CHUNK_SIZE = 28_000
_CHUNK_OVERLAP = 2_000

# Regex that matches lines/paragraphs relevant to assignments & schedule.
_SCHEDULE_KEYWORDS = re.compile(
    r"(due|assignment|homework|exam|quiz|midterm|final|project|lab|paper|"
    r"deadline|schedule|week\s*\d|module\s*\d|unit\s*\d|lecture\s*\d)",
    re.IGNORECASE,
)


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def _chat(system: str, user: str) -> str:
    """Send a prompt to Gemini, cycling through _MODELS on 429 errors."""
    prompt = f"{system}\n\n{user}"

    for model_name in _MODELS:
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                response = _get_client().models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                logger.info("Gemini responded via model=%s", model_name)
                return response.text or ""

            except ClientError as exc:
                status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
                if status == 429:
                    wait = 2 ** attempt
                    logger.warning(
                        "Gemini 429 on model=%s attempt %d/%d, retrying in %ds",
                        model_name, attempt, _MAX_RETRIES, wait,
                    )
                    if attempt == _MAX_RETRIES:
                        logger.warning("Quota exhausted on %s, trying next model", model_name)
                        break
                    time.sleep(wait)
                else:
                    logger.error("Gemini ClientError model=%s: %s", model_name, exc)
                    if attempt == _MAX_RETRIES:
                        raise
                    time.sleep(2 ** attempt)

            except Exception as exc:
                logger.error("Unexpected error model=%s: %s", model_name, exc)
                if attempt == _MAX_RETRIES:
                    raise
                time.sleep(2 ** attempt)

    raise RuntimeError(
        "All Gemini models exhausted their quota. "
        "Check https://aistudio.google.com/rate-limits"
    )


def _parse_json(raw: str) -> object:
    """Parse JSON from a model response, stripping any markdown fences."""
    text = raw.strip()
    if text.startswith("```"):
        inner, inside = [], False
        for line in text.splitlines():
            if line.startswith("```") and not inside:
                inside = True
                continue
            if line.startswith("```") and inside:
                break
            if inside:
                inner.append(line)
        text = "\n".join(inner).strip()
    return json.loads(text)


def _smart_truncate(text: str) -> str:
    """
    Return the most relevant portion of *text* for assignment extraction.

    If the text is short enough, return it unchanged.
    Otherwise score each paragraph by assignment-keyword density and return
    the highest-scoring paragraphs up to _MAX_TEXT_CHARS, in document order.
    """
    if len(text) <= _MAX_TEXT_CHARS:
        return text

    paragraphs = re.split(r"\n{2,}", text)
    scored = []
    for i, para in enumerate(paragraphs):
        hits = len(_SCHEDULE_KEYWORDS.findall(para))
        density = hits / max(len(para), 1) * 1000
        position_bonus = max(0.0, 1.0 - i / max(len(paragraphs), 1))
        scored.append((density + position_bonus, i, para))

    scored.sort(key=lambda x: -x[0])

    selected: list[tuple[int, str]] = []
    budget = _MAX_TEXT_CHARS
    for _, idx, para in scored:
        cost = len(para) + 2
        if cost > budget:
            continue
        selected.append((idx, para))
        budget -= cost

    selected.sort(key=lambda x: x[0])
    result = "\n\n".join(p for _, p in selected)
    logger.info(
        "smart_truncate: %d -> %d chars (%d/%d paragraphs kept)",
        len(text), len(result), len(selected), len(paragraphs),
    )
    return result


def _chunk_text(text: str) -> list[str]:
    """Split *text* into overlapping chunks of _CHUNK_SIZE chars."""
    if len(text) <= _CHUNK_SIZE:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + _CHUNK_SIZE, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start += _CHUNK_SIZE - _CHUNK_OVERLAP
    return chunks


_ASSIGNMENTS_SYSTEM = (
    "You are an academic assistant. "
    "Extract EVERY assignment, exam, quiz, paper, lab, and homework deadline "
    "from this syllabus. Include every individual item — do not group or summarise. "
    "Return ONLY a valid JSON array with no text outside it. "
    "Each element must have exactly these keys:\n"
    '  "title"       : string (full name of the item)\n'
    '  "type"        : one of "exam" | "paper" | "quiz" | "lab" | "homework"\n'
    '  "dueDate"     : ISO 8601 date string (e.g. "2026-11-14") or null\n'
    '  "gradeWeight" : number 0-100 or null\n'
    '  "notes"       : string or null\n'
)

_ASSIGNMENTS_CHUNK_SYSTEM = (
    "You are an academic assistant. "
    "The text below is a PARTIAL excerpt from a syllabus. "
    "Extract EVERY assignment, exam, quiz, paper, lab, and homework deadline "
    "visible in this excerpt. Return ONLY a valid JSON array (may be []). "
    "Each element must have exactly these keys:\n"
    '  "title"       : string\n'
    '  "type"        : one of "exam" | "paper" | "quiz" | "lab" | "homework"\n'
    '  "dueDate"     : ISO 8601 date string or null\n'
    '  "gradeWeight" : number 0-100 or null\n'
    '  "notes"       : string or null\n'
)

_GRADE_BREAKDOWN_SYSTEM = (
    "You are an academic assistant. "
    "Extract the complete grading breakdown from this syllabus. "
    "Return ONLY a valid JSON object where each key is a grade component name "
    '(e.g. "Midterm Exam", "Homework", "Final Project") '
    "and each value is its percentage weight as a number (e.g. 25 for 25%). "
    "The values should sum to 100. "
    "Do not include any text outside the JSON object."
)


def extract_assignments(text: str) -> list[dict]:
    """
    Extract all assignments from *text* using Gemini.

    For long syllabi the text is smart-truncated to keep assignment-dense
    paragraphs. If still too large we chunk and merge, deduplicating by title.
    """
    filtered = _smart_truncate(text)

    if len(filtered) <= _MAX_TEXT_CHARS:
        raw = _chat(_ASSIGNMENTS_SYSTEM, filtered)
        all_items: list[dict] = _parse_json(raw)  # type: ignore[assignment]
    else:
        chunks = _chunk_text(filtered)
        logger.info("Multi-chunk extraction: %d chunks", len(chunks))
        all_items = []
        seen_titles: set[str] = set()
        for i, chunk in enumerate(chunks):
            logger.info("Chunk %d/%d (%d chars)...", i + 1, len(chunks), len(chunk))
            try:
                raw = _chat(_ASSIGNMENTS_CHUNK_SYSTEM, chunk)
                items: list[dict] = _parse_json(raw)  # type: ignore[assignment]
                for item in items:
                    key = (item.get("title") or "").strip().lower()
                    if key and key not in seen_titles:
                        seen_titles.add(key)
                        all_items.append(item)
            except Exception as exc:
                logger.warning("Chunk %d failed (skipping): %s", i + 1, exc)

    for item in all_items:
        item.setdefault("title", "Untitled")
        item.setdefault("type", "homework")
        item.setdefault("dueDate", None)
        item.setdefault("gradeWeight", None)
        item.setdefault("notes", None)
        item["dueDateConfirmed"] = item["dueDate"] is not None

    return all_items


def extract_grade_breakdown(text: str) -> dict[str, float]:
    """
    Extract the grading breakdown from *text*.
    Grade policy is near the top so we send the first _MAX_TEXT_CHARS chars.
    """
    raw = _chat(_GRADE_BREAKDOWN_SYSTEM, text[:_MAX_TEXT_CHARS])
    breakdown: dict[str, float] = _parse_json(raw)  # type: ignore[assignment]
    return breakdown


_COURSE_META_SYSTEM = (
    "You are an academic assistant. "
    "Extract course metadata from this syllabus. "
    "Return ONLY a valid JSON object with these keys (use null for any field not found):\n"
    '  "professor"    : string  — full name of the instructor/professor\n'
    '  "email"        : string  — professor\'s email address\n'
    '  "officeHours"  : string  — office hours (days/times/location)\n'
    '  "officeLocation": string — office room number or building\n'
    '  "phone"        : string  — professor\'s phone/office number\n'
    '  "courseCode"   : string  — course code/number (e.g. "CS 101")\n'
    '  "semester"     : string  — semester and year (e.g. "Fall 2026")\n'
    '  "courseName"   : string  — full course title\n'
    "Do not include any text outside the JSON object."
)


def extract_course_metadata(text: str) -> dict:
    """
    Extract professor name, email, office hours, and other course metadata.
    Instructor info is almost always in the first few pages so we only
    send the first _MAX_TEXT_CHARS chars (already covers the full header).
    """
    try:
        raw = _chat(_COURSE_META_SYSTEM, text[:_MAX_TEXT_CHARS])
        meta: dict = _parse_json(raw)  # type: ignore[assignment]
        # Ensure all expected keys exist
        for key in ("professor", "email", "officeHours", "officeLocation", "phone", "courseCode", "semester", "courseName"):
            meta.setdefault(key, None)
        return meta
    except Exception as exc:
        logger.warning("Course metadata extraction failed (non-fatal): %s", exc)
        return {k: None for k in ("professor", "email", "officeHours", "officeLocation", "phone", "courseCode", "semester", "courseName")}
