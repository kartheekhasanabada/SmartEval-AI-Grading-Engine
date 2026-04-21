"""
FastAPI Backend — Answer Sheet Evaluation API
=============================================
Wraps run_hybrid_pipeline() as a REST service.
POST /upload  →  call pipeline  →  return JSON
"""

import os
import uuid
import shutil
import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Add utils to path so we can import the pipeline
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.pipeline import run_hybrid_pipeline, run_pdf_pipeline

# ── App Setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Hybrid Answer Sheet Evaluation API",
    description="Wraps the CRNN + Gemini hybrid OCR pipeline as a REST API.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory result history (last 50 entries)
_history: list[dict] = []


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "answer-sheet-evaluator"}


# ── Upload & Process ──────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf"}

@app.post("/upload")
async def upload_answer_sheet(file: UploadFile = File(...)):
    """
    Accept an image file, run the hybrid pipeline, return structured JSON.
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Use PNG, JPG, or PDF."
        )

    # Save to uploads/
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / unique_name
    try:
        with dest.open("wb") as buf:
            shutil.copyfileobj(file.file, buf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {e}")

    # Run pipeline — PDF gets multi-page handler; images use original single-page pipeline
    try:
        if ext == '.pdf':
            result = run_pdf_pipeline(str(dest))
        else:
            result = run_hybrid_pipeline(str(dest))
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

    # Attach original filename for display
    result["original_filename"] = file.filename

    # Store in history (cap at 50)
    _history.append(result)
    if len(_history) > 50:
        _history.pop(0)

    # Clean up uploaded file (keep only results)
    dest.unlink(missing_ok=True)

    return JSONResponse(content=result)


# ── History ───────────────────────────────────────────────────────────────────
@app.get("/history")
def get_history():
    """Return the in-memory result history (most recent first)."""
    return JSONResponse(content=list(reversed(_history)))


@app.delete("/history")
def clear_history():
    _history.clear()
    return {"message": "History cleared"}


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
