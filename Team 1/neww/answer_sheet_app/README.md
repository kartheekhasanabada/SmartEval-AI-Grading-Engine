# AnswerScan AI — Hybrid Answer Sheet Evaluation Web App

> **B.Tech Project | Sai Shobith Chiliveru | 24AG1A6676 | ACE Engineering College**

A production-style full-stack web application that wraps the **Hybrid Handwritten Answer Sheet Evaluation Pipeline** (CRNN + Gemini Vision) as a professional dashboard.

---

## Architecture

```
Frontend (React)          Backend (FastAPI)         Pipeline (utils/)
─────────────────         ─────────────────         ─────────────────
UploadZone                POST /upload          ──▶  run_hybrid_pipeline()
  drag-and-drop     ──▶   saves file                  │
  file preview            calls pipeline               ├─ OpenCV preprocess
                          returns JSON         ◀──     ├─ HPP segmentation
ResultPanel                                            ├─ CRNN OCR
  StudentCard             GET /history                 ├─ Confidence gate
  AnswersTab              GET /health                  └─ Gemini fallback
  ConfidenceChart
  JsonViewer
HistoryPanel
```

## Project Structure

```
answer_sheet_app/
├── backend/
│   ├── main.py              ← FastAPI app (POST /upload, GET /history)
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── index.css        ← Design system (CSS variables, animations)
│       ├── App.jsx          ← Root component, routing state
│       └── components/
│           ├── Header.jsx         ← Nav bar with pipeline status
│           ├── UploadZone.jsx     ← Drag-and-drop + pipeline diagram
│           ├── ResultPanel.jsx    ← Tabbed results (Overview/Answers/Confidence/JSON)
│           ├── ConfidenceChart.jsx ← Recharts bar chart with threshold line
│           ├── JsonViewer.jsx     ← Syntax-highlighted JSON + copy/download
│           └── HistoryPanel.jsx   ← In-memory result history grid
├── utils/
│   └── pipeline.py          ← Your notebook code, zero changes to logic
├── models/
│   └── README.md            ← Place crnn_weights.pth here
└── uploads/                 ← Auto-created, temp files cleaned after processing
```

---

## Quick Start

### 1. Backend

```bash
cd answer_sheet_app/backend

# Install dependencies
pip install -r requirements.txt

# Set Gemini API key (required for fallback)
export GEMINI_API_KEY=your_gemini_api_key_here

# (Optional) Place trained weights
cp /path/to/crnn_weights.pth ../models/

# Start server
python main.py
# ✅ Running at http://localhost:8000
```

### 2. Frontend

```bash
cd answer_sheet_app/frontend

# Install dependencies
npm install

# Start dev server
npm start
# ✅ Running at http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## API Reference

| Method | Endpoint   | Description                              |
|--------|------------|------------------------------------------|
| POST   | `/upload`  | Upload image → run pipeline → return JSON |
| GET    | `/history` | Return last 50 results (most recent first) |
| DELETE | `/history` | Clear in-memory history                  |
| GET    | `/health`  | Health check                             |

### POST /upload — Request
```
Content-Type: multipart/form-data
file: <PNG | JPG | PDF>
```

### POST /upload — Response
```json
{
  "pipeline_mode": "gemini_fallback",
  "crnn_mean_confidence": 0.0136,
  "confidence_threshold": 0.65,
  "student": {
    "name": "Chiliveru Sai Shobith",
    "roll_no": "24AG1A6676",
    "subject": null
  },
  "answers": [
    { "q": 1, "text": "..." }
  ],
  "source": "gemini_vision_refined",
  "lines_detected": 4,
  "timestamp": "2026-04-11T10:00:00",
  "line_confidences": [
    { "line": 1, "confidence": 0.014, "text": "F" }
  ],
  "original_filename": "my_sheet.jpg"
}
```

---

## Frontend Features

| Feature | Description |
|---------|-------------|
| Drag & Drop | Drop PNG/JPG/PDF directly onto the upload zone |
| Image Preview | Live thumbnail before submission |
| Pipeline Diagram | Animated node graph showing the 6-stage pipeline |
| Scan Animation | Scanning line effect while processing |
| Student Card | Name, Roll No, Subject, Lines detected, Source, Timestamp |
| Overview Tab | Stat cards + confidence gauge bar with threshold marker |
| Answers Tab | Per-question cards with confidence badges |
| Confidence Tab | Recharts bar chart, colour-coded by pass/fail/low |
| JSON Tab | Syntax-highlighted viewer with Copy + Download buttons |
| History Panel | Grid of past results, click any to re-view |
| Download JSON | One-click export of full pipeline output |

---

## Notes

- **No pipeline logic was changed.** `utils/pipeline.py` is a direct extraction of the notebook cells.
- The backend calls `run_hybrid_pipeline(image_path)` — one function, no duplication.
- Without `crnn_weights.pth`, the CRNN runs in demo mode (random init → low confidence → Gemini fallback is triggered automatically, exactly matching your notebook output).
- History is in-memory only; it resets when the backend restarts. For persistence, replace `_history: list` with a SQLite/JSON file write.
