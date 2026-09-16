"""
main.py
Firebase Cloud Functions entry point for Syllabify.

Registered functions
--------------------
on_syllabus_uploaded  – Storage trigger: fires when a file lands at
                        users/{userId}/syllabi/{filename}
                        Extracts text → parses assignments via Gemini →
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
from ai_extractor import extract_assignments, extract_grade_breakdown, extract_course_metadata
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
    userId and the most recent uploading/processing doc.
    """
    db = _get_db()
    try:
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
    except Exception as exc:  # noqa: BLE001
        logger.warning("Indexed query failed (%s), falling back to manual filter", exc)

    # Fallback: fetch all docs for this user and filter/sort in Python.
    # Avoids needing a composite index in dev/emulator environments.
    all_docs = list(db.collection("syllabi").where("userId", "==", user_id).stream())
    candidates = [
        d for d in all_docs
        if (d.to_dict() or {}).get("status") in ("uploading", "processing")
    ]
    if not candidates:
        return None
    candidates.sort(
        key=lambda d: (d.to_dict() or {}).get("createdAt") or 0,
        reverse=True,
    )
    return candidates[0].id


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
        # ── 1. Download file to a temp file (preserve real extension) ────────
        logger.info("[%s] Downloading file from Storage…", syllabus_id)
        bucket = admin_storage.bucket()
        blob = bucket.blob(object_name)

        _, ext = os.path.splitext(filename)
        ext = ext.lower() if ext.lower() in (".pdf", ".png", ".jpg", ".jpeg") else ".pdf"

        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp_path = tmp.name
        blob.download_to_filename(tmp_path)
        logger.info("[%s] File saved to %s (ext=%s)", syllabus_id, tmp_path, ext)

        # ── 2. Extract text ───────────────────────────────────────────────────
        logger.info("[%s] Extracting text…", syllabus_id)
        text = extract_text(tmp_path)
        logger.info("[%s] Extracted %d characters", syllabus_id, len(text))

        if not text.strip():
            raise RuntimeError("No text could be extracted from this file.")

        # ── 3. Parse assignments and grade breakdown via Gemini ───────────────
        logger.info("[%s] Calling Gemini for assignment extraction…", syllabus_id)
        assignments = extract_assignments(text)
        logger.info("[%s] Found %d assignments", syllabus_id, len(assignments))

        logger.info("[%s] Calling Gemini for grade breakdown…", syllabus_id)
        grade_breakdown = extract_grade_breakdown(text)
        logger.info("[%s] Grade breakdown: %s", syllabus_id, grade_breakdown)

        # ── 3b. Extract course metadata (professor, email, office hours…) ────
        logger.info("[%s] Extracting course metadata…", syllabus_id)
        course_meta = extract_course_metadata(text)
        logger.info("[%s] Course metadata: %s", syllabus_id, course_meta)

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

        # ── 5. Embed for RAG (Pinecone) — non-fatal ──────────────────────────
        logger.info("[%s] Embedding syllabus for RAG…", syllabus_id)
        pinecone_namespace = None
        try:
            pinecone_namespace = embed_syllabus(syllabus_id, text)
        except Exception as embed_exc:  # noqa: BLE001
            logger.warning(
                "[%s] RAG embedding failed (skipping, syllabus still marked ready): %s",
                syllabus_id, embed_exc,
            )

        # ── 6. Fetch existing course name (user may have set it manually) ──────
        syllabus_snap = syllabus_ref.get()
        existing = syllabus_snap.to_dict() or {}
        # Prefer AI-extracted name only if the user hasn't already set one
        course_name = existing.get("courseName") or course_meta.get("courseName") or ""

        # ── 7. Mark syllabus ready + persist all extracted metadata ──────────
        syllabus_ref.update({
            "status":            "ready",
            "courseName":        course_name,
            "gradeBreakdown":    grade_breakdown,
            "pineconeNamespace": pinecone_namespace,
            # Course metadata from AI
            "professor":         course_meta.get("professor"),
            "professorEmail":    course_meta.get("email"),
            "officeHours":       course_meta.get("officeHours"),
            "officeLocation":    course_meta.get("officeLocation"),
            "professorPhone":    course_meta.get("phone"),
            "courseCode":        course_meta.get("courseCode"),
            "semester":          existing.get("semester") or course_meta.get("semester"),
            "updatedAt":         SERVER_TIMESTAMP,
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