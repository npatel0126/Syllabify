"""
main.py
Firebase Cloud Functions entry point for Syllabify.

Registered functions
--------------------
on_syllabus_uploaded  – Storage trigger: fires when a PDF lands at
                        users/{userId}/syllabi/{filename}
                        Extracts text → parses assignments via GPT-4o →
                        saves to Firestore → marks syllabus "ready".
"""

import logging
import os
import tempfile

# Must be set before any imports that use subprocess/fork (pdfplumber, pytesseract).
# This prevents the macOS ObjC runtime from killing forked worker processes.
os.environ.setdefault("OBJC_DISABLE_INITIALIZE_FORK_SAFETY", "YES")

# ── Local dev: load secrets from functions/.env.local if present.
# This file is gitignored and never committed.
_env_local = os.path.join(os.path.dirname(__file__), ".env.local")
if os.path.exists(_env_local):
    with open(_env_local) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

import firebase_admin
from firebase_admin import firestore, storage as admin_storage
from firebase_functions import storage_fn
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from pdf_processor import extract_text
from ai_extractor import extract_assignments, extract_grade_breakdown
from embedder import embed_syllabus

# ── Firebase Admin init ───────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Initialise once at module load so the Functions framework can introspect
# triggers without timing out.  All network calls happen inside the handler.
if not firebase_admin._apps:
    firebase_admin.initialize_app()

_db = None


def _get_db():
    """Return a cached Firestore client."""
    global _db
    if _db is None:
        _db = firestore.client()
    return _db

# ── Helpers ───────────────────────────────────────────────────────────────────

_ASSIGNMENT_TYPES = {"exam", "paper", "quiz", "lab", "homework"}


def _coerce_type(raw: str | None) -> str:
    """Ensure the type value is one of the allowed enum values."""
    if raw and raw.lower() in _ASSIGNMENT_TYPES:
        return raw.lower()
    return "homework"


def _syllabus_ref(syllabus_id: str):
    return _get_db().collection("syllabi").document(syllabus_id)


def _find_syllabus_id(user_id: str, filename: str) -> str | None:
    """
    Look up the Firestore syllabus doc that matches this upload.
    The API route creates the doc before the upload starts; we match on
    userId and the storage path suffix (filename).
    """
    db = _get_db()
    docs = (
        db.collection("syllabi")
        .where("userId", "==", user_id)
        .where("status", "in", ["uploading", "processing"])
        .order_by("createdAt", direction="DESCENDING")
        .limit(1)
        .stream()
    )
    for doc in docs:
        return doc.id
    return None


# ── Cloud Function ────────────────────────────────────────────────────────────

# No bucket= restriction — lets the emulator match regardless of bucket name.
@storage_fn.on_object_finalized()
def on_syllabus_uploaded(event: storage_fn.CloudEvent) -> None:  # type: ignore[type-arg]
    """
    Fires when any object is finalised in the default Storage bucket.
    We only process files at  users/{userId}/syllabi/{filename}.
    """
    object_name: str = event.data.name or ""

    # Log the full path immediately so we can confirm the trigger fired.
    logger.info("Storage trigger fired — full path: %s", object_name)

    # ── Gate: only process syllabus uploads ──────────────────────────────────
    parts = object_name.split("/")
    if len(parts) != 4 or parts[0] != "users" or parts[2] != "syllabi":
        logger.info("Skipping non-syllabus object: %s", object_name)
        return

    user_id: str = parts[1]
    filename: str = parts[3]
    logger.info("Processing upload — userId=%s  file=%s", user_id, filename)

    # ── Resolve syllabus document ─────────────────────────────────────────────
    syllabus_id = _find_syllabus_id(user_id, filename)
    if not syllabus_id:
        logger.error("No matching syllabus doc found for %s / %s", user_id, filename)
        return

    syllabus_ref = _syllabus_ref(syllabus_id)
    syllabus_ref.update({"status": "processing", "updatedAt": SERVER_TIMESTAMP})

    tmp_path: str | None = None
    try:
        # ── 1. Download PDF to a temp file ────────────────────────────────────
        logger.info("[%s] Downloading PDF from Storage…", syllabus_id)
        bucket = admin_storage.bucket()
        blob = bucket.blob(object_name)

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp_path = tmp.name
        blob.download_to_filename(tmp_path)
        logger.info("[%s] PDF saved to %s", syllabus_id, tmp_path)

        # ── 2. Extract text ───────────────────────────────────────────────────
        logger.info("[%s] Extracting text…", syllabus_id)
        text = extract_text(tmp_path)
        logger.info("[%s] Extracted %d characters", syllabus_id, len(text))

        # ── 3. Parse assignments and grade breakdown via GPT-4o ───────────────
        logger.info("[%s] Calling GPT-4o for assignment extraction…", syllabus_id)
        assignments = extract_assignments(text)
        logger.info("[%s] Found %d assignments", syllabus_id, len(assignments))

        logger.info("[%s] Calling GPT-4o for grade breakdown…", syllabus_id)
        grade_breakdown = extract_grade_breakdown(text)
        logger.info("[%s] Grade breakdown: %s", syllabus_id, grade_breakdown)

        # ── 4. Save assignments to Firestore ──────────────────────────────────
        batch = _get_db().batch()
        assignments_ref = _get_db().collection("assignments")

        for item in assignments:
            doc_ref = assignments_ref.document()          # auto-ID
            batch.set(doc_ref, {
                "assignmentId":    doc_ref.id,
                "syllabusId":      syllabus_id,
                "userId":          user_id,
                "title":           item.get("title") or "Untitled",
                "type":            _coerce_type(item.get("type")),
                "dueDate":         item.get("dueDate"),   # ISO string or None
                "dueDateConfirmed": item.get("dueDateConfirmed", False),
                "gradeWeight":     item.get("gradeWeight"),
                "notes":           item.get("notes") or "",
                "calendarEventId": "",
                "reminderTaskIds": [],
                "createdAt":       SERVER_TIMESTAMP,
            })

        batch.commit()
        logger.info("[%s] Wrote %d assignment docs to Firestore", syllabus_id, len(assignments))

        # ── 5. Embed for RAG (Pinecone) ───────────────────────────────────────
        logger.info("[%s] Embedding syllabus for RAG…", syllabus_id)
        pinecone_namespace = embed_syllabus(syllabus_id, text)

        # ── 6. Fetch course name for context (best-effort) ────────────────────
        syllabus_snap = syllabus_ref.get()
        course_name = (syllabus_snap.to_dict() or {}).get("courseName", "")

        # ── 7. Mark syllabus ready ────────────────────────────────────────────
        syllabus_ref.update({
            "status":             "ready",
            "courseName":         course_name,
            "gradeBreakdown":     grade_breakdown,
            "pineconeNamespace":  pinecone_namespace,
            "updatedAt":          SERVER_TIMESTAMP,
        })
        logger.info("[%s] Syllabus marked ready ✓", syllabus_id)

    except Exception as exc:  # noqa: BLE001
        error_msg = str(exc)
        logger.exception("[%s] Processing failed: %s", syllabus_id, error_msg)
        syllabus_ref.update({
            "status": "error",
            "errorMessage": error_msg,
            "updatedAt": SERVER_TIMESTAMP,
        })

    finally:
        # Clean up the temp file
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:  # noqa: BLE001
                pass
