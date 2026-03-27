"""
embedder.py
RAG pipeline: splits syllabus text into overlapping chunks, embeds each
chunk with Gemini text-embedding-004, and upserts them into Pinecone
under a per-syllabus namespace so the chat function can retrieve context.

Usage (called from main.py after text extraction):
    from embedder import embed_syllabus
    namespace = embed_syllabus(syllabus_id, full_text)
"""

import logging
import os
from typing import Iterator

from google import genai
from pinecone import Pinecone, ServerlessSpec

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
_EMBED_MODEL = "text-embedding-004"
_EMBED_DIMS = 768          # text-embedding-004 output dimension
_INDEX_NAME = os.environ.get("PINECONE_INDEX", "syllabify")
_CHUNK_SIZE = 800
_CHUNK_OVERLAP = 100
_UPSERT_BATCH = 100

# ── Lazy singletons ───────────────────────────────────────────────────────────
_genai_client: genai.Client | None = None
_pinecone_index = None


def _get_genai() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _genai_client


def _get_index():
    """Return (and lazily create) the Pinecone index."""
    global _pinecone_index
    if _pinecone_index is not None:
        return _pinecone_index

    api_key = os.environ.get("PINECONE_API_KEY", "")
    if not api_key:
        raise EnvironmentError("PINECONE_API_KEY environment variable is not set.")

    pc = Pinecone(api_key=api_key)

    existing = {idx.name for idx in pc.list_indexes()}
    if _INDEX_NAME not in existing:
        logger.info("Creating Pinecone index '%s'…", _INDEX_NAME)
        pc.create_index(
            name=_INDEX_NAME,
            dimension=_EMBED_DIMS,
            metric="cosine",
            spec=ServerlessSpec(
                cloud=os.environ.get("PINECONE_CLOUD", "aws"),
                region=os.environ.get("PINECONE_REGION", "us-east-1"),
            ),
        )

    _pinecone_index = pc.Index(_INDEX_NAME)
    return _pinecone_index


# ── Chunking ──────────────────────────────────────────────────────────────────

def _chunk_text(text: str, size: int = _CHUNK_SIZE, overlap: int = _CHUNK_OVERLAP) -> Iterator[str]:
    """Yield overlapping character-level chunks of *text*."""
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        yield text[start:end]
        if end == len(text):
            break
        start += size - overlap


# ── Embedding ─────────────────────────────────────────────────────────────────

def _embed_chunks(chunks: list[str]) -> list[list[float]]:
    """Embed a list of text chunks using Gemini text-embedding-004."""
    client = _get_genai()
    result = []
    for chunk in chunks:
        response = client.models.embed_content(
            model=_EMBED_MODEL,
            contents=chunk,
        )
        result.append(response.embeddings[0].values)
    return result


# ── Public API ────────────────────────────────────────────────────────────────

def embed_syllabus(syllabus_id: str, text: str) -> str:
    """
    Embed *text* and upsert all vectors into Pinecone under a namespace
    derived from *syllabus_id*.

    Returns the Pinecone namespace string so the caller can store it in
    Firestore for later retrieval.

    Raises if PINECONE_API_KEY is not set (skips gracefully when not
    configured so the emulator pipeline still works without Pinecone).
    """
    namespace = f"syllabus-{syllabus_id}"

    if not os.environ.get("PINECONE_API_KEY"):
        logger.warning(
            "[%s] PINECONE_API_KEY not set — skipping embedding.", syllabus_id
        )
        return namespace

    chunks = list(_chunk_text(text))
    if not chunks:
        logger.warning("[%s] No text to embed.", syllabus_id)
        return namespace

    logger.info("[%s] Embedding %d chunks…", syllabus_id, len(chunks))

    # Embed all chunks
    vectors: list[tuple[str, list[float], dict]] = []
    for i, chunk in enumerate(chunks):
        embedding = _embed_chunks([chunk])[0]
        vectors.append((
            f"{syllabus_id}-chunk-{i}",
            embedding,
            {
                "syllabusId": syllabus_id,
                "chunkIndex": i,
                "text": chunk[:500],  # store a preview for citation
            },
        ))

    # Upsert in batches
    index = _get_index()
    for batch_start in range(0, len(vectors), _UPSERT_BATCH):
        batch = vectors[batch_start : batch_start + _UPSERT_BATCH]
        index.upsert(
            vectors=[
                {"id": vid, "values": emb, "metadata": meta}
                for vid, emb, meta in batch
            ],
            namespace=namespace,
        )
        logger.info(
            "[%s] Upserted vectors %d–%d",
            syllabus_id,
            batch_start,
            batch_start + len(batch) - 1,
        )

    logger.info("[%s] Embedding complete — namespace: %s", syllabus_id, namespace)
    return namespace


def query_syllabus(syllabus_id: str, question: str, top_k: int = 5) -> list[dict]:
    """
    Embed *question* and return the top-k most relevant chunks from
    the syllabus namespace.

    Returns a list of dicts with keys: id, score, text, chunkIndex.
    Returns [] if Pinecone is not configured.
    """
    if not os.environ.get("PINECONE_API_KEY"):
        return []

    namespace = f"syllabus-{syllabus_id}"
    client = _get_genai()
    response = client.models.embed_content(model=_EMBED_MODEL, contents=question)
    embedding = response.embeddings[0].values
    index = _get_index()

    results = index.query(
        vector=embedding,
        top_k=top_k,
        namespace=namespace,
        include_metadata=True,
    )

    return [
        {
            "id": match["id"],
            "score": match["score"],
            "text": (match.get("metadata") or {}).get("text", ""),
            "chunkIndex": (match.get("metadata") or {}).get("chunkIndex", -1),
        }
        for match in results.get("matches", [])
    ]
