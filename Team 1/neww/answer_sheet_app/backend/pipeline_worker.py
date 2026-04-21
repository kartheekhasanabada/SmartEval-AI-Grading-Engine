import sys
import os
import json
import argparse
import re
from pathlib import Path

# Add utils to path so we can import the pipeline
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.pipeline import run_hybrid_pipeline, run_pdf_pipeline

def canonical_qid(raw_q, default_index):
    text = str(raw_q or "").strip()
    match = re.search(r"\d+", text)
    if match:
        return f"q{int(match.group())}"
    return f"q{default_index}"

def main():
    parser = argparse.ArgumentParser(description="EvalSmart OCR Pipeline Worker")
    parser.add_argument("--image", required=True, help="Path to input image/pdf")
    parser.add_argument("--out", required=True, help="Path to output json file")
    parser.add_argument("--is_key", action="store_true", help="If this is an answer key image")
    args = parser.parse_args()

    image_path = args.image
    out_path = args.out
    is_key = args.is_key

    try:
        ext = Path(image_path).suffix.lower()
        if ext == '.pdf':
            raw_result = run_pdf_pipeline(image_path)
        else:
            raw_result = run_hybrid_pipeline(image_path)
    except Exception as e:
        print(f"Pipeline error: {e}")
        # Complete failure
        raw_result = {
            "student": {"roll_no": "ERROR"},
            "answers": []
        }

    # Format the result to the requested schema
    # { "roll_no": "R001", "answers": [{ "q_id": "q1", "answer": "...", "ocr_confidence": 0.0 }] }
    
    roll_no = raw_result.get("student", {}).get("roll_no", "UNKNOWN")
    raw_answers = raw_result.get("answers", [])

    formatted_answers = []
    
    if not isinstance(raw_answers, list):
        raw_answers = []
        
    for ans in raw_answers:
        q_id = canonical_qid(ans.get("q", ""), len(formatted_answers) + 1)
        text = str(ans.get("text", "")).strip()
        conf = float(ans.get("confidence", 0.0))
        
        # If OCR fails on a question
        if not text:
            text = ""
            conf = 0.0
            
        formatted_answers.append({
            "q_id": q_id,
            "answer": text,
            "ocr_confidence": conf
        })

    # Output for Student vs Answer Key
    if is_key:
        # If it's an answer key, the evaluator expects a simple dict: {"q1": "...", "q2": "..."}
        # according to smart_eval_v2/evaluator.py (line 63)
        final_out = {}
        for ans in formatted_answers:
            final_out[ans["q_id"]] = ans["answer"]
    else:
        # Need to match auto_grader output wrapper: usually evaluating takes a list of students?
        # Actually `smart_eval_v2/evaluator.py` expects a list for students!
        # `with open(target_file, 'r') as f: students_data = json.load(f)`
        # `for student in students_data:`
        # Yes, students_data is a list of student dicts.
        final_out = [{
            "student_id": roll_no, 
            "roll_no": roll_no,
            "answers": {a["q_id"]: a["answer"] for a in formatted_answers}
        }]

    # Save to out_path
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final_out, f, indent=2)

    print(f"SUCCESS: Pre-processed successfully. Output saved to {out_path}")

if __name__ == "__main__":
    main()
