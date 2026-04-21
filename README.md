# SmartEval RTP

SmartEval RTP is a 3-tier AI evaluation and grading system that converts handwritten answer sheets into structured data, semantically grades them, and presents results through a role-based Flask portal. The integrated deployment entry point for this repository is `Team 3/portal.py`.

## Architecture

### Team 1: Data Acquisition and OCR
- Location: `Team 1/neww/answer_sheet_app`
- Responsibility: accepts scanned images or PDFs, segments handwritten content, runs CRNN OCR, and uses Gemini Vision fallback when needed.
- Output: structured JSON for answer keys and student sheets.

### Team 2: AI Brain
- Location: `Team 2/evalsmart_v2/evalsmart`
- Responsibility: hosts the semantic grading backend and supporting frontend for team-level work.
- Grading logic: SBERT embeddings, cosine similarity, keyword scoring, and Excel-based reporting.
- Note: the integrated RTP flow reuses the evaluator logic through Team 3 orchestration. The standalone Team 2 Flask app is retained as a legacy backend and defaults to port `5001` to avoid colliding with the main portal.

### Team 3: Orchestration and Frontend
- Location: `Team 3`
- Main entry point: `portal.py`
- Responsibility: role-based access control, file upload flow, routing between OCR and grading, and teacher/student dashboards.
- Runtime flow: Teacher upload -> Team 1 OCR -> Team 3 evaluator -> dashboard results.

## Integrated Runtime Flow

1. A teacher logs into the Team 3 portal.
2. The portal uploads an answer key and a student answer sheet.
3. Team 3 invokes Team 1's `pipeline_worker.py` to generate:
   - `Team 3/scanned_jsons/dynamic_answer_key.json`
   - `Team 3/scanned_jsons/student_scan.json`
4. Team 3 runs the evaluator against those JSON files.
5. The portal renders teacher and student dashboards from the generated grading outputs.

## Requirements

- Python 3.11+ is recommended.
- Windows users can use the optional `torch-directml` package included in the root requirements file.
- For Gemini OCR fallback, set `GEMINI_API_KEY` in your environment.
- For `pdf2image`, install Poppler on the host machine if you want full PDF rasterization support.

## Installation

From the repository root:

```bash
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Set the Gemini API key before starting the portal:

```bash
# Windows PowerShell
$env:GEMINI_API_KEY="your_api_key_here"
```

## Run the Main Flask Portal

Start the integrated application from the repository root:

```bash
python "Team 3\portal.py"
```

The main application runs at:

- `http://localhost:5000`

Demo credentials defined in `Team 3/portal.py`:

- Teacher: `teacher1 / admin123`
- Student: `student / student123`

## Team-Level Apps

These are not required for the integrated GitHub-ready flow, but they remain in the repo:

- Team 1 FastAPI app: `Team 1/neww/answer_sheet_app/backend/main.py`
- Team 2 legacy standalone Flask backend: `Team 2/evalsmart_v2/evalsmart/backend/app.py`

The legacy Team 2 backend now defaults to port `5001` so it does not conflict with the main Team 3 portal.

## Frontend Notes

- The integrated RTP deployment uses Team 3's Flask-rendered templates.
- Team 1 and Team 2 frontend projects are still present for team-level development work.
- If you want to work on those separately, install dependencies with `npm install` inside each frontend directory.

## Repository Hygiene for GitHub

The root `.gitignore` is configured to exclude:

- virtual environments
- `__pycache__`
- `.env` and `.flaskenv`
- Node `node_modules`
- OCR uploads, generated JSON files, and generated Excel outputs
- local binaries and archive artifacts

Required model assets are not ignored by default because they are part of the working system:

- `Team 1/neww/answer_sheet_app/models/crnn_weights.pth`
- `Team 3/smart_eval_custom_model/model.safetensors`

These files are currently under GitHub's 100 MB per-file limit, but Git LFS is recommended if they grow.

## Project Notes

- The SBERT, cosine similarity, and keyword scoring math were left unchanged.
- The deployment cleanup in this repository focuses on structural wiring, entry-point clarity, dependency consolidation, and GitHub readiness.
