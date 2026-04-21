import json
import os
import re
import sys

import pandas as pd
from sentence_transformers import SentenceTransformer, util

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ANSWER_KEY_JSON = os.path.join(BASE_DIR, "scanned_jsons", "dynamic_answer_key.json")

print("[INFO] Loading AI Grading Model...")
model = SentenceTransformer(os.path.join(BASE_DIR, "smart_eval_custom_model"))

STOP_WORDS = {
    "the", "is", "in", "at", "of", "on", "and", "a", "an", "to",
    "it", "for", "with", "as", "by", "this", "that"
}


def extract_keywords(text):
    if not text or not isinstance(text, str):
        return set()
    text = re.sub(r"[^\w\s]", "", text.lower())
    words = text.split()
    return {word for word in words if word not in STOP_WORDS}


def calculate_keyword_score(student_ans, correct_ans):
    student_keywords = extract_keywords(student_ans)
    correct_keywords = extract_keywords(correct_ans)
    if not correct_keywords:
        return 0.0
    matches = student_keywords.intersection(correct_keywords)
    return round(len(matches) / len(correct_keywords), 2)


def calculate_cosine_score(student_ans, correct_ans):
    if not student_ans or not isinstance(student_ans, str):
        return 0.0
    emb1 = model.encode(student_ans, convert_to_tensor=True)
    emb2 = model.encode(correct_ans, convert_to_tensor=True)
    cosine_score = util.cos_sim(emb1, emb2).item()
    return round(max(0.0, min(1.0, cosine_score)), 2)


def normalize_students(students_data):
    if isinstance(students_data, dict):
        return [students_data]
    if isinstance(students_data, list):
        return students_data
    return []

def canonical_qid(q_id, default_qid=None):
    text = str(q_id or "").strip().lower()
    match = re.search(r"\d+", text)
    if match:
        return f"q{int(match.group())}"
    if default_qid is not None:
        return default_qid
    return text


def normalize_answer_key(answer_key_data):
    normalized = {}
    if isinstance(answer_key_data, dict):
        for q_id, value in answer_key_data.items():
            subject = "General"
            max_marks = 1.0
            answer_text = ""
            if isinstance(value, dict):
                answer_text = str(value.get("answer", value.get("text", ""))).strip()
                subject = str(value.get("subject", "General")).strip() or "General"
                max_marks = float(value.get("max_marks", 1.0))
            else:
                answer_text = str(value).strip()
            canonical_id = canonical_qid(q_id)
            normalized[canonical_id] = {
                "answer": answer_text,
                "subject": subject,
                "max_marks": max_marks,
            }
        return normalized

    if isinstance(answer_key_data, list):
        for idx, item in enumerate(answer_key_data, start=1):
            if not isinstance(item, dict):
                continue
            q_id = canonical_qid(item.get("q_id", f"q{idx}"), default_qid=f"q{idx}")
            normalized[q_id] = {
                "answer": str(item.get("answer", item.get("text", ""))).strip(),
                "subject": str(item.get("subject", "General")).strip() or "General",
                "max_marks": float(item.get("max_marks", 1.0)),
            }
    return normalized


def get_feedback(cosine_score, keyword_score, student_answer, correct_answer):
    if not correct_answer and not student_answer:
        return "Both answer key and student OCR were unclear for this question."
    if not correct_answer:
        return "Answer key OCR could not read this question clearly."
    if not student_answer:
        return "Student answer was empty or unreadable in OCR."
    final_score = (cosine_score * 0.70) + (keyword_score * 0.30)
    if final_score >= 0.85:
        return "Excellent semantic alignment with the model answer."
    if final_score >= 0.6:
        return "Good attempt; concept is partially aligned."
    if final_score >= 0.35:
        return "Limited alignment; key points are missing."
    return "Low alignment; answer may be incorrect or OCR quality is poor."


def main(student_json_path="students.json", answer_key_json_path=None):
    if answer_key_json_path is None:
        answer_key_json_path = DEFAULT_ANSWER_KEY_JSON

    try:
        with open(answer_key_json_path, "r", encoding="utf-8") as key_file:
            answer_key_data = json.load(key_file)
        question_bank = normalize_answer_key(answer_key_data)
    except Exception as err:
        print(f"[ERROR] Loading answer key JSON failed: {err}")
        return 1

    try:
        with open(student_json_path, "r", encoding="utf-8") as student_file:
            students_data = normalize_students(json.load(student_file))
    except Exception as err:
        print(f"[ERROR] Loading student JSON failed: {err}")
        return 1

    if not students_data:
        print("[INFO] Student OCR output empty; creating placeholder student result.")
        students_data = [{"student_id": "UNKNOWN", "answers": {}}]

    if not question_bank:
        derived_questions = {}
        first_answers = students_data[0].get("answers", {}) if isinstance(students_data[0], dict) else {}
        if isinstance(first_answers, dict) and first_answers:
            for q_id in first_answers.keys():
                derived_questions[str(q_id)] = {"answer": "", "subject": "General", "max_marks": 1.0}
        else:
            derived_questions["q1"] = {"answer": "", "subject": "General", "max_marks": 1.0}
        question_bank = derived_questions
        print("[INFO] Answer key OCR had no usable questions; using fallback question map.")

    all_rows = []
    student_summaries = []

    for student in students_data:
        student_id = student.get("student_id") or student.get("roll_no") or "Unknown"
        raw_answers = student.get("answers", {})
        answers = {}
        if isinstance(raw_answers, dict):
            for key, value in raw_answers.items():
                answers[canonical_qid(key)] = str(value).strip()

        subject_totals = {}
        total_obtained = 0.0
        total_max = 0.0

        common_qids = [q_id for q_id in question_bank.keys() if q_id in answers]
        pairings = [(q, q) for q in common_qids]

        # Only evaluate matching question numbers from key and student sheet.
        for key_qid, student_qid in pairings:
            q_meta = question_bank[key_qid]
            correct_answer = q_meta["answer"]
            subject = q_meta["subject"] or "General"
            max_marks = float(q_meta["max_marks"])
            student_answer = str(answers.get(student_qid, "")).strip()

            cosine_score = calculate_cosine_score(student_answer, correct_answer)
            keyword_score = calculate_keyword_score(student_answer, correct_answer)
            final_score = round((cosine_score * 0.70) + (keyword_score * 0.30), 2)
            marks_obtained = round(final_score * max_marks, 2)
            feedback = get_feedback(cosine_score, keyword_score, student_answer, correct_answer)

            if subject not in subject_totals:
                subject_totals[subject] = {"obtained": 0.0, "max": 0.0}
            subject_totals[subject]["obtained"] += marks_obtained
            subject_totals[subject]["max"] += max_marks
            total_obtained += marks_obtained
            total_max += max_marks

            all_rows.append(
                {
                    "Student ID": student_id,
                    "Subject": subject,
                    "Question ID": key_qid,
                    "Student Answer": student_answer,
                    "Model Answer": correct_answer,
                    "Cosine Score": cosine_score,
                    "Keyword Score": keyword_score,
                    "Final Score": final_score,
                    "Similarity %": round(final_score * 100, 2),
                    "Max Marks": max_marks,
                    "Marks Obtained": marks_obtained,
                    "Feedback": feedback,
                }
            )

        summary_subjects = {}
        for subject, values in subject_totals.items():
            summary_subjects[subject] = {
                "obtained": round(values["obtained"], 2),
                "max": round(values["max"], 2),
            }

        student_summaries.append(
            {
                "student_id": student_id,
                "total_obtained": round(total_obtained, 2),
                "total_max": round(total_max, 2),
                "subject_totals": summary_subjects,
            }
        )

    if not all_rows:
        print("[INFO] No matching question numbers between answer key and student answers.")
        all_rows.append(
            {
                "Student ID": "UNKNOWN",
                "Subject": "General",
                "Question ID": "q1",
                "Student Answer": "",
                "Model Answer": "",
                "Cosine Score": 0.0,
                "Keyword Score": 0.0,
                "Final Score": 0.0,
                "Similarity %": 0.0,
                "Max Marks": 1.0,
                "Marks Obtained": 0.0,
                "Feedback": "No matching question numbers found between key and student OCR.",
            }
        )
        student_summaries.append(
            {
                "student_id": "UNKNOWN",
                "total_obtained": 0.0,
                "total_max": 1.0,
                "subject_totals": {"General": {"obtained": 0.0, "max": 1.0}},
            }
        )

    base_name = os.path.splitext(os.path.basename(student_json_path))[0]
    excel_output = os.path.join(BASE_DIR, f"{base_name}_graded.xlsx")
    summary_output = os.path.join(BASE_DIR, f"{base_name}_summary.json")

    try:
        df = pd.DataFrame(all_rows)
        df.to_excel(excel_output, index=False)
        payload = {"students": student_summaries, "rows": all_rows}
        with open(summary_output, "w", encoding="utf-8") as out_file:
            json.dump(payload, out_file, indent=2)
    except Exception as err:
        print(f"[ERROR] Saving outputs failed: {err}")
        return 1

    print(f"[SUCCESS] Grading complete. Excel: {excel_output}")
    print(f"[SUCCESS] Summary JSON: {summary_output}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        raise SystemExit(main(sys.argv[1], sys.argv[2]))
    if len(sys.argv) == 2:
        raise SystemExit(main(sys.argv[1]))
    raise SystemExit(main())
