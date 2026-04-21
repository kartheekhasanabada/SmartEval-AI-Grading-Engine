import json
import os
import subprocess
import sys
import time
from datetime import datetime
from functools import wraps
from pathlib import Path

import pandas as pd
import pypdfium2 as pdfium
from PIL import Image
from flask import Flask, request, render_template, redirect, url_for, session
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "smart_eval_demo_secret_key")

TEACHER_CREDENTIALS = {"teacher1": "admin123"}
STUDENT_CREDENTIALS = {"student": "student123"}

# Paths
BASE_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = BASE_DIR.parent
SCANNED_JSON_DIR = BASE_DIR / "scanned_jsons"
TEMP_UPLOAD_FOLDER = BASE_DIR / "incoming_uploads"
LATEST_RUN_CONTEXT_PATH = BASE_DIR / "latest_run_context.json"
TEAM1_APP_DIR = WORKSPACE_ROOT / "Team 1" / "neww" / "answer_sheet_app"
TEAM1_WORKER = TEAM1_APP_DIR / "backend" / "pipeline_worker.py"
TEAM1_PROJECT_DIR = TEAM1_WORKER.parent
EVALUATOR_SCRIPT = BASE_DIR / "evaluator.py"
DYNAMIC_ANSWER_KEY_PATH = SCANNED_JSON_DIR / "dynamic_answer_key.json"
DYNAMIC_STUDENT_SCAN_PATH = SCANNED_JSON_DIR / "student_scan.json"
TEAM1_PYTHON = os.environ.get("TEAM1_PYTHON", sys.executable)

os.makedirs(SCANNED_JSON_DIR, exist_ok=True)
os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)

def teacher_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if session.get("role") != "teacher":
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper


def student_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if session.get("role") != "student":
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper


def allowed_student_file(filename: str) -> bool:
    return filename.lower().endswith((".png", ".jpg", ".jpeg", ".pdf"))


def run_team1_scan(input_path: Path, output_json: Path, is_answer_key: bool = False):
    command = [
        TEAM1_PYTHON,
        str(TEAM1_WORKER),
        "--image",
        str(input_path),
        "--out",
        str(output_json),
    ]
    if is_answer_key:
        command.append("--is_key")

    result = subprocess.run(
        command,
        cwd=str(TEAM1_PROJECT_DIR),
        check=True,
        capture_output=True,
        text=True,
        timeout=240,
        env=dict(
            os.environ,
            PYTHONIOENCODING="utf-8",
            GEMINI_API_KEY=os.environ.get("GEMINI_API_KEY", "")
        ),
    )
    return result


def has_usable_ocr_output(json_path: Path, is_answer_key: bool) -> bool:
    if not json_path.exists():
        return False
    try:
        with open(json_path, "r", encoding="utf-8") as input_file:
            payload = json.load(input_file)
    except Exception:
        return False

    if is_answer_key:
        return isinstance(payload, dict) and any(str(v).strip() for v in payload.values())

    if isinstance(payload, list) and payload:
        answers = payload[0].get("answers", {}) if isinstance(payload[0], dict) else {}
        return isinstance(answers, dict) and any(str(v).strip() for v in answers.values())

    return False


def run_team1_scan_with_retry(input_path: Path, output_json: Path, is_answer_key: bool = False):
    result = run_team1_scan(input_path, output_json, is_answer_key=is_answer_key)
    stdout_text = (result.stdout or "").lower()
    retry_needed = ("429" in stdout_text or "quota exceeded" in stdout_text) and not has_usable_ocr_output(output_json, is_answer_key)
    if retry_needed:
        print("[INFO] Gemini quota/rate limit detected. Retrying OCR after 25 seconds...")
        time.sleep(25)
        result = run_team1_scan(input_path, output_json, is_answer_key=is_answer_key)
    return result


def classify_ocr_mode(scan_stdout: str) -> str:
    text = (scan_stdout or "").lower()
    if "pipeline complete | mode: local_refined" in text:
        return "local_refined"
    if "gemini fallback unavailable/empty -> using crnn answers instead" in text:
        return "crnn_fallback"
    if "quota exceeded" in text or "429" in text:
        return "crnn_fallback"
    if "pipeline complete | mode: gemini_fallback" in text:
        return "gemini"
    if "pipeline complete | mode: crnn_local" in text:
        return "crnn_fallback"
    return "unknown"


def prepare_scanner_input(file_path: Path) -> Path:
    if file_path.suffix.lower() != ".pdf":
        return file_path

    output_image = file_path.with_suffix(".png")
    pdf_doc = pdfium.PdfDocument(str(file_path))
    if len(pdf_doc) == 0:
        raise ValueError(f"PDF has no pages: {file_path.name}")

    # Render and vertically stitch all pages so multi-page sheets are preserved.
    rendered_pages = []
    for page_index in range(len(pdf_doc)):
        page = pdf_doc[page_index]
        bitmap = page.render(scale=2.0)
        rendered_pages.append(bitmap.to_pil().convert("RGB"))

    max_width = max(img.width for img in rendered_pages)
    total_height = sum(img.height for img in rendered_pages)
    stitched = Image.new("RGB", (max_width, total_height), "white")
    y_offset = 0
    for img in rendered_pages:
        if img.width < max_width:
            padded = Image.new("RGB", (max_width, img.height), "white")
            padded.paste(img, (0, 0))
            img = padded
        stitched.paste(img, (0, y_offset))
        y_offset += img.height

    stitched.save(str(output_image))
    pdf_doc.close()
    return output_image


def safe_text(value):
    if pd.isna(value):
        return ""
    return str(value)


def safe_float(value, default=0.0):
    try:
        if pd.isna(value):
            return default
        return float(value)
    except Exception:
        return default

@app.route('/')
def index():
    return redirect(url_for("login"))


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = ""
    if request.method == "POST":
        role = request.form.get("role", "").strip().lower()
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        if role == "teacher" and TEACHER_CREDENTIALS.get(username) == password:
            session["role"] = "teacher"
            session["username"] = username
            return redirect(url_for("teacher_upload"))

        if role == "student" and STUDENT_CREDENTIALS.get(username) == password:
            session["role"] = "student"
            session["username"] = username
            return redirect(url_for("student_dashboard"))

        error = "Invalid role or credentials."

    return render_template("login.html", error=error)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for("login"))


def run_pipeline(answer_key, student_sheet):
    if not answer_key or not answer_key.filename:
        return None, ("Model answer key image/PDF is required.", 400)
    if not allowed_student_file(answer_key.filename):
        return None, ("Answer key must be an image (.png/.jpg/.jpeg) or .pdf.", 400)
    if not student_sheet or not student_sheet.filename:
        return None, ("Student answer sheet file is required.", 400)
    if not allowed_student_file(student_sheet.filename):
        return None, ("Student sheet must be an image (.png/.jpg/.jpeg) or .pdf.", 400)
    if not TEAM1_WORKER.exists():
        return None, (f"Team 1 scanner not found at {TEAM1_WORKER}", 500)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    key_ext = Path(answer_key.filename).suffix.lower()
    sheet_ext = Path(student_sheet.filename).suffix.lower()
    temp_key_input = TEMP_UPLOAD_FOLDER / f"answer_key_input_{timestamp}{key_ext}"
    temp_student_input = TEMP_UPLOAD_FOLDER / f"student_input_{timestamp}{sheet_ext}"
    key_json_path = DYNAMIC_ANSWER_KEY_PATH
    scanned_json_path = DYNAMIC_STUDENT_SCAN_PATH

    answer_key.save(temp_key_input)
    student_sheet.save(temp_student_input)

    try:
        key_scan_input = prepare_scanner_input(temp_key_input)
        student_scan_input = prepare_scanner_input(temp_student_input)

        key_scan_result = run_team1_scan_with_retry(key_scan_input, key_json_path, is_answer_key=True)
        if not key_json_path.exists():
            return None, ("OCR failed: answer key JSON was not generated.", 500)

        student_scan_result = run_team1_scan_with_retry(student_scan_input, scanned_json_path, is_answer_key=False)
        if not scanned_json_path.exists():
            return None, ("OCR failed: student scan JSON was not generated.", 500)

        key_mode = classify_ocr_mode(key_scan_result.stdout)
        student_mode = classify_ocr_mode(student_scan_result.stdout)
        if (key_mode, student_mode) in {("gemini", "crnn_fallback"), ("crnn_fallback", "gemini")}:
            return None, (
                "OCR consistency check failed: one file used Gemini OCR while the other fell back to CRNN. "
                "This can produce misleading scores. Please retry after Gemini quota resets.",
                503,
            )

        evaluator_cmd = [
            sys.executable,
            str(EVALUATOR_SCRIPT),
            str(scanned_json_path),
            str(key_json_path),
        ]
        evaluator_result = subprocess.run(
            evaluator_cmd,
            cwd=str(BASE_DIR),
            check=True,
            capture_output=True,
            text=True,
        )

        graded_excel = BASE_DIR / "student_scan_graded.xlsx"
        graded_summary = BASE_DIR / "student_scan_summary.json"
        if not graded_excel.exists() or not graded_summary.exists():
            return None, ("Grading completed but output files were not generated.", 500)

        df = pd.read_excel(graded_excel)
        if df.empty:
            return None, ("Grading output is empty. OCR may not have detected valid answers.", 500)

        with open(graded_summary, "r", encoding="utf-8") as summary_file:
            summary_payload = json.load(summary_file)

        student_summary = (summary_payload.get("students") or [{}])[0]
        summary_rows = summary_payload.get("rows") or []
        student_id = str(student_summary.get("student_id", "Unknown"))
        total_obtained = float(student_summary.get("total_obtained", 0.0))
        total_max = float(student_summary.get("total_max", 0.0))
        subject_totals = student_summary.get("subject_totals", {"General": {"obtained": 0.0, "max": 0.0}})

        low_confidence_markers = (
            "both answer key and student ocr were unclear",
            "ocr could not extract readable answer key/student content",
            "answer key ocr could not read this question clearly",
            "student answer was empty or unreadable in ocr",
        )
        ocr_warning = False
        if student_id.upper() == "ERROR":
            ocr_warning = True
        if summary_rows:
            if all(
                not str(row.get("Student Answer", "")).strip()
                and not str(row.get("Model Answer", "")).strip()
                for row in summary_rows
            ):
                ocr_warning = True
            if any(
                any(marker in str(row.get("Feedback", "")).lower() for marker in low_confidence_markers)
                for row in summary_rows
            ):
                ocr_warning = True

        subject_cards = []
        for subject, values in subject_totals.items():
            obtained = float(values.get("obtained", 0.0))
            max_marks = float(values.get("max", 0.0))
            percent = round((obtained / max_marks) * 100, 2) if max_marks else 0.0
            subject_cards.append(
                {"name": subject, "obtained": round(obtained, 2), "max": round(max_marks, 2), "percent": percent}
            )

        question_rows = []
        for _, row in df.iterrows():
            question_rows.append(
                {
                    "subject": row.get("Subject", "General"),
                    "question_id": safe_text(row.get("Question ID", "")),
                    "student_answer": safe_text(row.get("Student Answer", "")),
                    "model_answer": safe_text(row.get("Model Answer", "")),
                    "marks_obtained": safe_float(row.get("Marks Obtained", 0)),
                    "max_marks": safe_float(row.get("Max Marks", 0)),
                    "similarity_percent": safe_float(row.get("Similarity %", 0)),
                    "feedback": safe_text(row.get("Feedback", "")),
                }
            )

        context = {
            "student_id": student_id,
            "total_obtained": round(total_obtained, 2),
            "total_max": round(total_max, 2),
            "overall_percent": round((total_obtained / total_max) * 100, 2) if total_max else 0.0,
            "ocr_warning": ocr_warning,
            "subject_cards": subject_cards,
            "question_rows": question_rows,
            "sheet_filename": student_sheet.filename,
            "key_filename": answer_key.filename,
            "scanner_log": "\n".join(
                ["Answer Key OCR:", key_scan_result.stdout.strip(), "", "Student OCR:", student_scan_result.stdout.strip()]
            ).strip(),
            "evaluator_log": evaluator_result.stdout.strip(),
            "teacher_name": session.get("username", "teacher"),
        }
        with open(LATEST_RUN_CONTEXT_PATH, "w", encoding="utf-8") as output_file:
            json.dump(context, output_file, indent=2)
        return context, None
    except subprocess.TimeoutExpired:
        return None, (
            "OCR processing timed out after 4 minutes. Please retry with clearer cropped pages or lower-resolution PDFs.",
            504,
        )
    except subprocess.CalledProcessError as err:
        combined_log = "\n".join(part for part in [err.stdout or "", err.stderr or ""] if part.strip())
        return None, (f"Pipeline failed:\n{combined_log}", 500)
    finally:
        temp_key_png = temp_key_input.with_suffix(".png")
        temp_student_png = temp_student_input.with_suffix(".png")
        if temp_key_png.exists():
            temp_key_png.unlink()
        if temp_student_png.exists():
            temp_student_png.unlink()
        if temp_key_input.exists():
            temp_key_input.unlink()
        if temp_student_input.exists():
            temp_student_input.unlink()

@app.route('/teacher/upload', methods=['GET', 'POST'])
@teacher_required
def teacher_upload():
    if request.method == "GET":
        return render_template("index.html", teacher_name=session.get("username", "teacher"))
    _, error = run_pipeline(request.files.get("answer_key"), request.files.get("student_sheet"))
    if error:
        return error
    return redirect(url_for("teacher_dashboard"))


@app.route('/teacher/dashboard')
@teacher_required
def teacher_dashboard():
    if not LATEST_RUN_CONTEXT_PATH.exists():
        return render_template("dashboard.html", no_data=True, teacher_name=session.get("username", "teacher"))
    with open(LATEST_RUN_CONTEXT_PATH, "r", encoding="utf-8") as input_file:
        context = json.load(input_file)
    context["teacher_name"] = session.get("username", "teacher")
    context["no_data"] = False
    return render_template("dashboard.html", **context)


@app.route('/student/dashboard')
@student_required
def student_dashboard():
    summary_path = BASE_DIR / "student_scan_summary.json"
    if not summary_path.exists():
        return render_template(
            "student_dashboard.html",
            no_data=True,
            student_name=session.get("username", "student"),
            student_id="Unknown",
            total_obtained=0.0,
            total_max=0.0,
            overall_percent=0.0,
            subject_cards=[],
        )

    with open(summary_path, "r", encoding="utf-8") as summary_file:
        summary_payload = json.load(summary_file)
    student_summary = (summary_payload.get("students") or [{}])[0]
    student_id = str(student_summary.get("student_id", "Unknown"))
    total_obtained = float(student_summary.get("total_obtained", 0.0))
    total_max = float(student_summary.get("total_max", 0.0))
    subject_totals = student_summary.get("subject_totals", {"General": {"obtained": 0.0, "max": 0.0}})

    subject_cards = []
    for subject, values in subject_totals.items():
        obtained = float(values.get("obtained", 0.0))
        max_marks = float(values.get("max", 0.0))
        percent = round((obtained / max_marks) * 100, 2) if max_marks else 0.0
        subject_cards.append(
            {"name": subject, "obtained": round(obtained, 2), "max": round(max_marks, 2), "percent": percent}
        )

    return render_template(
        "student_dashboard.html",
        no_data=False,
        student_name=session.get("username", "student"),
        student_id=student_id,
        total_obtained=round(total_obtained, 2),
        total_max=round(total_max, 2),
        overall_percent=round((total_obtained / total_max) * 100, 2) if total_max else 0.0,
        subject_cards=subject_cards,
    )

@app.route('/api/receive_scan', methods=['POST'])
def receive_scan():
    scan_json = request.get_json(silent=True)
    if not scan_json:
        return {"status": "error", "message": "Expected JSON payload."}, 400

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"student_scan_{timestamp}.json"
    destination = UPLOAD_FOLDER / filename
    with open(destination, "w", encoding="utf-8") as output_file:
        json.dump(scan_json, output_file, indent=2)

    return {"status": "ok", "saved_as": filename}, 201

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
