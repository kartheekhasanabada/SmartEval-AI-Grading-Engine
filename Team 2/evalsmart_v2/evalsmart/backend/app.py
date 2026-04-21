"""
app.py — EvalSmart Flask API
Roles: admin / teacher / student
Grading is done from pre-scored Excel (cosine_score, keyword_score, final_score).
No BERT/SBERT needed here — scores come in from the upstream ML pipeline.

Note:
The integrated RTP deployment runs through Team 3/portal.py on port 5000.
This Team 2 app remains available as a legacy standalone backend on port 5001.
"""

from __future__ import annotations
import os, uuid, hashlib
from pathlib import Path
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import pandas as pd

import sys
import threading
import subprocess
import shutil

BASE_DIR    = Path(__file__).parent
UPLOAD_DIR  = BASE_DIR / "uploads"
STATIC_DIR  = BASE_DIR.parent / "frontend" / "dist"
WORKSPACE_ROOT = BASE_DIR.parents[3]
TEAM1_WORKER = WORKSPACE_ROOT / "Team 1" / "neww" / "answer_sheet_app" / "backend" / "pipeline_worker.py"
TEAM1_PYTHON = os.environ.get("TEAM1_PYTHON", sys.executable)
TEAM3_EVALUATOR = WORKSPACE_ROOT / "Team 3" / "evaluator.py"
TEAM3_PYTHON = os.environ.get("TEAM3_PYTHON", sys.executable)
TEAM3_DYNAMIC_KEY = WORKSPACE_ROOT / "Team 3" / "scanned_jsons" / "dynamic_answer_key.json"
LEGACY_PORT = int(os.environ.get("TEAM2_PORT", "5001"))

PIPELINE_DIR = BASE_DIR / "pipeline"
DIR_IMAGES   = PIPELINE_DIR / "1_images"
DIR_JSONS    = PIPELINE_DIR / "2_jsons"
DIR_EXCELS   = PIPELINE_DIR / "3_excels"
DIR_KEYS     = PIPELINE_DIR / "answer_keys"

for d in [UPLOAD_DIR, DIR_IMAGES, DIR_JSONS, DIR_EXCELS, DIR_KEYS]:
    d.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/")
CORS(app)

# ── In-memory stores ──────────────────────────────────────────────────────
_sessions: dict[str, dict] = {}
_tokens:   dict[str, dict] = {}
_jobs:     dict[str, dict] = {}

def run_pipeline(job_id: str, image_path: Path, ref_path: Path | None, current_user: dict):
    """Background worker that calls the submodules through standard sys.executable CLI"""
    if not TEAM1_WORKER.exists():
        _jobs[job_id]["status"] = "Error"
        _jobs[job_id]["error"] = f"Team 1 OCR worker not found: {TEAM1_WORKER}"
        return
    if not TEAM3_EVALUATOR.exists():
        _jobs[job_id]["status"] = "Error"
        _jobs[job_id]["error"] = f"Evaluator not found: {TEAM3_EVALUATOR}"
        return

    _jobs[job_id]["status"] = "Digitizing"
    
    # 1. Team 1 OCR digitization
    json_out = DIR_JSONS / f"{job_id}.json"
    
    cmd_neww = [TEAM1_PYTHON, str(TEAM1_WORKER), "--image", str(image_path), "--out", str(json_out)]
    try:
        subprocess.run(cmd_neww, check=True, cwd=str(TEAM1_WORKER.parent), stderr=subprocess.PIPE, text=True)
    except subprocess.CalledProcessError as e:
        _jobs[job_id]["status"] = "Error"
        _jobs[job_id]["error"] = f"Digitization failed: {e.stderr.strip() or e}"
        return
    except Exception as e:
        _jobs[job_id]["status"] = "Error"
        _jobs[job_id]["error"] = f"Digitization failed: {e}"
        return

    # If reference image was provided, process it too
    key_file = None
    if ref_path:
        if ref_path.suffix.lower() in [".jpg", ".jpeg", ".png", ".pdf"]:
            _jobs[job_id]["status"] = "Digitizing Answer Key"
            key_file = DIR_KEYS / f"{job_id}_key.json"
            cmd_key = [TEAM1_PYTHON, str(TEAM1_WORKER), "--image", str(ref_path), "--out", str(key_file), "--is_key"]
            try:
                subprocess.run(cmd_key, check=True, cwd=str(TEAM1_WORKER.parent), stderr=subprocess.PIPE, text=True)
            except subprocess.CalledProcessError as e:
                _jobs[job_id]["status"] = "Error"
                _jobs[job_id]["error"] = f"Key Digitization failed: {e.stderr.strip() or e}"
                return
            except Exception as e:
                _jobs[job_id]["status"] = "Error"
                _jobs[job_id]["error"] = f"Key Digitization failed: {e}"
                return
        else:
            key_file = DIR_KEYS / f"{job_id}_key.json"
            shutil.copy(ref_path, key_file)

    _jobs[job_id]["status"] = "Evaluating"
    
    # 2. Reuse the integrated evaluator that powers Team 3
    answer_key_path = key_file or TEAM3_DYNAMIC_KEY
    if not answer_key_path.exists():
        _jobs[job_id]["status"] = "Error"
        _jobs[job_id]["error"] = (
            "No answer key was available. Upload a reference image or generate "
            "Team 3/scanned_jsons/dynamic_answer_key.json first."
        )
        return

    excel_out = DIR_EXCELS / f"{job_id}.xlsx"
    generated_excel = TEAM3_EVALUATOR.parent / f"{json_out.stem}_graded.xlsx"
    generated_summary = TEAM3_EVALUATOR.parent / f"{json_out.stem}_summary.json"
    cmd_eval = [TEAM3_PYTHON, str(TEAM3_EVALUATOR), str(json_out), str(answer_key_path)]
         
    try:
        subprocess.run(cmd_eval, check=True, cwd=str(TEAM3_EVALUATOR.parent), stderr=subprocess.PIPE, text=True)
    except subprocess.CalledProcessError as e:
        _jobs[job_id]["status"] = "Error"
        _jobs[job_id]["error"] = f"Evaluation failed: {e.stderr.strip() or e}"
        return
    except Exception as e:
        _jobs[job_id]["status"] = "Error"
        _jobs[job_id]["error"] = f"Evaluation failed: {e}"
        return

    if not generated_excel.exists():
        _jobs[job_id]["status"] = "Error"
        _jobs[job_id]["error"] = f"Expected graded Excel was not generated: {generated_excel}"
        return

    shutil.copy2(generated_excel, excel_out)
    if generated_summary.exists():
        shutil.copy2(generated_summary, DIR_EXCELS / f"{job_id}_summary.json")
         
    # 3. Read final excel and finalize
    try:
        students = process_excel(str(excel_out))
        session_id = job_id
        _sessions[session_id] = {
            "session_id":    session_id,
            "filename":      image_path.name,
            "uploaded_by":   current_user["name"],
            "students":      students,
        }
        _jobs[job_id]["status"] = "Ready"
        _jobs[job_id]["results"] = _sessions[session_id]
    except Exception as e:
        _jobs[job_id]["status"] = "Error"
        _jobs[job_id]["error"] = f"Parsing Excel failed: {e}"

# ── Users (replace with DB in production) ────────────────────────────────
def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

USERS = {
    "admin":    {"password": _hash("admin123"),  "role": "admin",   "name": "Admin"},
    "teacher1": {"password": _hash("teach123"),  "role": "teacher", "name": "Ms. Priya"},
    "teacher2": {"password": _hash("teach456"),  "role": "teacher", "name": "Mr. Rajan"},
    "student1": {"password": _hash("stud123"),   "role": "student", "name": "Aarav Sharma", "roll_no": "R001"},
    "student2": {"password": _hash("stud456"),   "role": "student", "name": "Riya Patel",   "roll_no": "R002"},
    "student3": {"password": _hash("stud789"),   "role": "student", "name": "Arjun Singh",  "roll_no": "R003"},
}

# ── Auth ──────────────────────────────────────────────────────────────────
def _get_user(req) -> dict | None:
    auth = req.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return _tokens.get(auth.split(" ", 1)[1])

def require_auth(*roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = _get_user(request)
            if not user:
                return jsonify({"error": "Unauthorized"}), 401
            if roles and user["role"] not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs, current_user=user)
        return wrapper
    return decorator

# ── Grading ───────────────────────────────────────────────────────────────
GRADE_BANDS = [(0.90,"A+"),(0.75,"A"),(0.60,"B"),(0.45,"C"),(0.30,"D")]

def pct_to_grade(pct: float) -> str:
    for t, g in GRADE_BANDS:
        if pct >= t: return g
    return "F"

def process_excel(filepath: str) -> list[dict]:
    """
    Read the pre-scored Excel. Expected columns (case-insensitive):
      Question ID | Student Answer | Cosine Score | Keyword Score | Final Score
    Optional: Student Name, Roll No, Max Marks
    Returns list of student result dicts.
    """
    df = pd.read_excel(filepath)
    df.columns = (df.columns.str.strip()
                             .str.lower()
                             .str.replace(r"[\s]+", "_", regex=True))

    # Normalise varied column names
    renames = {}
    for col in df.columns:
        if "question" in col and "id" in col:     renames[col] = "q_id"
        elif "cosine" in col:                      renames[col] = "cosine_score"
        elif "keyword" in col:                     renames[col] = "keyword_score"
        elif "final" in col:                       renames[col] = "final_score"
        elif "student" in col and "answer" in col: renames[col] = "student_answer"
        elif "student" in col and "name" in col:   renames[col] = "student_name"
        elif "roll" in col:                        renames[col] = "roll_no"
        elif "max" in col and "mark" in col:       renames[col] = "max_marks"
    df.rename(columns=renames, inplace=True)

    required = {"q_id", "student_answer", "cosine_score", "keyword_score", "final_score"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in Excel: {missing}. Found: {list(df.columns)}")

    if "max_marks"    not in df.columns: df["max_marks"]    = 10.0
    if "roll_no"      not in df.columns: df["roll_no"]      = "STUDENT"
    if "student_name" not in df.columns: df["student_name"] = df.get("roll_no", "Student")

    for col in ["cosine_score","keyword_score","final_score","max_marks"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    results = []
    for roll_no, grp in df.groupby("roll_no"):
        roll_no = str(roll_no)
        name = str(grp.iloc[0].get("student_name", roll_no))
        questions = []
        for _, row in grp.iterrows():
            max_m  = float(row["max_marks"])
            fscore = min(max(float(row["final_score"]), 0), 1)
            marks  = round(fscore * max_m, 2)
            questions.append({
                "q_id":           str(row["q_id"]),
                "student_answer": str(row.get("student_answer", "")),
                "cosine_score":   round(float(row["cosine_score"]), 4),
                "keyword_score":  round(float(row["keyword_score"]), 4),
                "final_score":    round(fscore, 4),
                "max_marks":      max_m,
                "marks_awarded":  marks,
            })
        total_max   = sum(q["max_marks"]    for q in questions)
        total_marks = sum(q["marks_awarded"] for q in questions)
        pct = total_marks / total_max if total_max else 0
        results.append({
            "roll_no":      roll_no,
            "student_name": name,
            "questions":    questions,
            "summary": {
                "total_max_marks": round(total_max, 2),
                "total_marks":     round(total_marks, 2),
                "percentage":      round(pct * 100, 2),
                "grade":           pct_to_grade(pct),
                "question_count":  len(questions),
            },
        })
    results.sort(key=lambda x: x["summary"]["total_marks"], reverse=True)
    return results

# ══════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════

@app.route("/api/health")
def health(): return jsonify({"status": "ok"})

@app.route("/api/login", methods=["POST"])
def login():
    body = request.get_json() or {}
    user = USERS.get(body.get("username","").strip())
    if not user or user["password"] != _hash(body.get("password","")):
        return jsonify({"error": "Invalid credentials"}), 401
    token = str(uuid.uuid4())
    _tokens[token] = {
        "username": body["username"],
        "role":  user["role"],
        "name":  user["name"],
        "roll_no": user.get("roll_no"),
    }
    return jsonify({**_tokens[token], "token": token})

@app.route("/api/logout", methods=["POST"])
def logout():
    auth = request.headers.get("Authorization","")
    if auth.startswith("Bearer "): _tokens.pop(auth.split(" ",1)[1], None)
    return jsonify({"ok": True})

@app.route("/api/me")
def me():
    user = _get_user(request)
    return jsonify(user) if user else (jsonify({"error":"Unauthorized"}), 401)

# ── Upload (teacher / admin only) ─────────────────────────────────────────
@app.route("/api/upload", methods=["POST"])
@require_auth("teacher", "admin")
def upload(current_user):
    if "file" not in request.files:
        return jsonify({"error": "No file field"}), 400
    file = request.files["file"]
    if not file.filename.lower().endswith((".xlsx",".xls")):
        return jsonify({"error": "Only .xlsx / .xls accepted"}), 400
    path = UPLOAD_DIR / secure_filename(file.filename)
    file.save(path)
    try:
        students = process_excel(str(path))
    except Exception as e:
        return jsonify({"error": str(e)}), 422
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "session_id":    session_id,
        "filename":      file.filename,
        "uploaded_by":   current_user["name"],
        "students":      students,
    }
    return jsonify({
        "session_id":    session_id,
        "student_count": len(students),
        "filename":      file.filename,
        "students":      students,
    })

# ── Upload Pipeline (Image to Dashboard) ──────────────────────────────────
@app.route("/api/upload_pipeline", methods=["POST"])
@require_auth("teacher", "admin")
def upload_pipeline(current_user):
    if "student_image" not in request.files:
        return jsonify({"error": "No student_image field"}), 400
        
    s_file = request.files["student_image"]
    r_file = request.files.get("reference_image") # optional
    
    job_id = str(uuid.uuid4())
    s_path = DIR_IMAGES / f"{job_id}_{secure_filename(s_file.filename)}"
    s_file.save(s_path)
    
    r_path = None
    if r_file and r_file.filename:
        r_path = DIR_IMAGES / f"key_{job_id}_{secure_filename(r_file.filename)}"
        r_file.save(r_path)
        
    _jobs[job_id] = {
        "job_id": job_id,
        "status": "Queued",
        "filename": s_file.filename,
        "error": None
    }
    
    threading.Thread(target=run_pipeline, args=(job_id, s_path, r_path, current_user), daemon=True).start()
    return jsonify({"job_id": job_id, "status": "Queued"})

@app.route("/api/pipeline_status/<job_id>")
@require_auth("teacher", "admin")
def get_pipeline_status(job_id, current_user):
    job = _jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)

# ── Sessions list ─────────────────────────────────────────────────────────
@app.route("/api/sessions")
@require_auth("teacher","admin","student")
def list_sessions(current_user):
    return jsonify([
        {"session_id": sid, "filename": s["filename"],
         "uploaded_by": s["uploaded_by"], "student_count": len(s["students"])}
        for sid, s in _sessions.items()
    ])

# ── Full session results ───────────────────────────────────────────────────
@app.route("/api/results/<session_id>")
@require_auth("teacher","admin","student")
def get_results(session_id, current_user):
    s = _sessions.get(session_id)
    if not s: return jsonify({"error":"Session not found"}), 404
    if current_user["role"] == "student":
        roll = current_user.get("roll_no","")
        student = next((st for st in s["students"] if st["roll_no"]==roll), None)
        if not student: return jsonify({"error":"No results for your roll number"}), 404
        return jsonify({**s, "students": [student]})
    return jsonify(s)

# ── Admin: user list ──────────────────────────────────────────────────────
@app.route("/api/admin/users")
@require_auth("admin")
def admin_users(current_user):
    return jsonify([{"username":u,"role":d["role"],"name":d["name"]} for u,d in USERS.items()])

# ── Serve React ────────────────────────────────────────────────────────────
@app.route("/", defaults={"path":""})
@app.route("/<path:path>")
def serve_frontend(path):
    if STATIC_DIR.exists():
        t = STATIC_DIR / path
        if path and t.exists(): return send_from_directory(str(STATIC_DIR), path)
        return send_from_directory(str(STATIC_DIR), "index.html")
    return jsonify({"message":"EvalSmart API running. Build frontend first."}), 200

if __name__ == "__main__":
    print("\nEvalSmart Team 2 Standalone Backend")
    print("=" * 44)
    print("Integrated RTP portal: Team 3/portal.py -> http://localhost:5000")
    print(f"Legacy Team 2 API: http://localhost:{LEGACY_PORT}/api")
    print("\nLogins:")
    print("  admin    / admin123  (Admin)")
    print("  teacher1 / teach123  (Teacher)")
    print("  teacher2 / teach456  (Teacher)")
    print("  student1 / stud123   (Student R001)")
    print("  student2 / stud456   (Student R002)")
    print("  student3 / stud789   (Student R003)")
    print("=" * 44 + "\n")
    app.run(debug=True, use_reloader=False, port=LEGACY_PORT, host="0.0.0.0")
