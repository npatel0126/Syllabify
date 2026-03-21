"""
ai_extractor.py
Uses GPT-4o to extract structured assignment data and grade breakdowns
from raw syllabus text.
"""

import json
import os
from openai import OpenAI

_client: OpenAI | None = None
_MODEL = "gpt-4o"


def _get_client() -> OpenAI:
    """Return a cached OpenAI client, initialising it on first use."""
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


def _chat(system: str, user: str) -> str:
    """Send a single-turn chat request and return the assistant's text."""
    response = _get_client().chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0,
    )
    return response.choices[0].message.content or ""


def _parse_json(raw: str) -> object:
    """
    Extract and parse the first JSON value from *raw*.
    Handles cases where the model wraps JSON in a markdown code block.
    """
    # Strip markdown fences if present
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Drop the opening fence (```json or ```) and the closing ```
        inner = []
        inside = False
        for line in lines:
            if line.startswith("```") and not inside:
                inside = True
                continue
            if line.startswith("```") and inside:
                break
            if inside:
                inner.append(line)
        text = "\n".join(inner).strip()

    return json.loads(text)


# ── Public API ────────────────────────────────────────────────────────────────

_ASSIGNMENTS_SYSTEM = (
    "You are an academic assistant. "
    "Extract every assignment, exam, quiz, paper, lab, and homework deadline "
    "from this syllabus. "
    "Return ONLY a valid JSON array. "
    "Each object must have exactly these keys:\n"
    '  "title"       : string\n'
    '  "type"        : one of "exam" | "paper" | "quiz" | "lab" | "homework"\n'
    '  "dueDate"     : ISO 8601 date string (e.g. "2025-11-14") or null if not found\n'
    '  "gradeWeight" : number 0-100 or null\n'
    '  "notes"       : string or null\n'
    "Do not include any text outside the JSON array."
)


def extract_assignments(text: str) -> list[dict]:
    """
    Extract all assignments from *text* using GPT-4o.

    Returns a list of dicts, each with keys:
        title, type, dueDate, gradeWeight, notes, dueDateConfirmed
    """
    raw = _chat(_ASSIGNMENTS_SYSTEM, text)
    items: list[dict] = _parse_json(raw)  # type: ignore[assignment]

    # Normalise: add dueDateConfirmed flag
    for item in items:
        item.setdefault("title", "Untitled")
        item.setdefault("type", "homework")
        item.setdefault("dueDate", None)
        item.setdefault("gradeWeight", None)
        item.setdefault("notes", None)
        item["dueDateConfirmed"] = item["dueDate"] is not None

    return items


_GRADE_BREAKDOWN_SYSTEM = (
    "You are an academic assistant. "
    "Extract the grading breakdown from this syllabus. "
    "Return ONLY a valid JSON object where each key is a grade component name "
    "(e.g. \"Midterm Exam\", \"Homework\", \"Final Project\") "
    "and each value is its percentage weight as a number (e.g. 25 for 25%). "
    "The values should sum to 100. "
    "Do not include any text outside the JSON object."
)


def extract_grade_breakdown(text: str) -> dict[str, float]:
    """
    Extract the grading breakdown table from *text* using GPT-4o.

    Returns a dict mapping component name → weight percentage, e.g.:
        {"Midterm": 25, "Final": 35, "Homework": 40}
    """
    raw = _chat(_GRADE_BREAKDOWN_SYSTEM, text)
    breakdown: dict[str, float] = _parse_json(raw)  # type: ignore[assignment]
    return breakdown
