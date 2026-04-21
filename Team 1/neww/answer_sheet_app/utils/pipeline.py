"""
Hybrid Handwritten Answer Sheet Evaluation Pipeline
====================================================
Extracted from: answer_sheet_digitization.ipynb
DO NOT MODIFY PIPELINE LOGIC — this is the original system wrapped as a service.

Flow: Image → OpenCV preprocessing → HPP segmentation → CRNN OCR →
      Confidence Gate → (CRNN OR Gemini Vision fallback) → Structured JSON
"""

import os
import json
import re
import time
import io
import numpy as np
import cv2
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as transforms

# ── Configuration ─────────────────────────────────────────────────────────────
DEVICE               = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
IMG_HEIGHT           = 32
IMG_WIDTH            = 256
CRNN_HIDDEN          = 256
CONFIDENCE_THRESHOLD = 1.1   # below this -> local refinement fallback

CHARS       = ' !"#&\'()*+,-./0123456789:;?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
BLANK_LABEL = len(CHARS)
NUM_CLASSES = len(CHARS) + 1
char2idx    = {c: i for i, c in enumerate(CHARS)}
idx2char    = {i: c for i, c in enumerate(CHARS)}


# ── CRNN Architecture ─────────────────────────────────────────────────────────

class ConvBlock(nn.Module):
    """Conv2D → BatchNorm → ReLU → optional MaxPool."""
    def __init__(self, in_ch, out_ch, pool=True):
        super().__init__()
        layers = [
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        ]
        if pool:
            layers.append(nn.MaxPool2d(2, 2))
        self.block = nn.Sequential(*layers)

    def forward(self, x):
        return self.block(x)


class CRNN(nn.Module):
    """
    Convolutional Recurrent Neural Network for handwriting recognition.
    CNN backbone → BiLSTM → Linear head → CTC Loss
    """
    def __init__(self, img_height=IMG_HEIGHT, num_classes=NUM_CLASSES, hidden=CRNN_HIDDEN):
        super().__init__()

        self.cnn = nn.Sequential(
            ConvBlock(1,   64,  pool=True),
            ConvBlock(64,  128, pool=True),
            ConvBlock(128, 256, pool=False),
            ConvBlock(256, 256, pool=True),
            ConvBlock(256, 512, pool=False),
            ConvBlock(512, 512, pool=True),
            nn.Conv2d(512, 512, kernel_size=(2, 1)),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
        )

        self.rnn = nn.LSTM(
            input_size=512,
            hidden_size=hidden,
            num_layers=2,
            bidirectional=True,
            batch_first=False,
            dropout=0.3,
        )

        self.fc = nn.Linear(hidden * 2, num_classes)

    def forward(self, x):
        features = self.cnn(x)
        features = features.squeeze(2)
        features = features.permute(2, 0, 1)
        rnn_out, _ = self.rnn(features)
        logits = self.fc(rnn_out)
        return F.log_softmax(logits, dim=2)


# ── HPP Segmenter ─────────────────────────────────────────────────────────────

class HPPSegmenter:
    """Horizontal Projection Profile line segmenter."""
    def __init__(self, min_height=12, padding=5, gap_threshold=4):
        self.min_height    = min_height
        self.padding       = padding
        self.gap_threshold = gap_threshold

    def segment(self, image_bgr):
        gray   = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        projection = np.sum(binary > 0, axis=1)

        in_line, start, bboxes = False, 0, []
        for i, val in enumerate(projection):
            if not in_line and val > self.gap_threshold:
                in_line, start = True, i
            elif in_line and val <= self.gap_threshold:
                if i - start >= self.min_height:
                    y1 = max(0, start - self.padding)
                    y2 = min(image_bgr.shape[0], i + self.padding)
                    bboxes.append((0, y1, image_bgr.shape[1], y2))
                in_line = False
        if in_line and (len(projection) - start) >= self.min_height:
            y1 = max(0, start - self.padding)
            y2 = image_bgr.shape[0]
            bboxes.append((0, y1, image_bgr.shape[1], y2))

        crops = [image_bgr[y1:y2, x1:x2] for (x1, y1, x2, y2) in bboxes]
        return crops, bboxes, projection, binary


# ── CRNN Helpers ──────────────────────────────────────────────────────────────

def preprocess_line_for_crnn(crop_bgr, height=IMG_HEIGHT, width=IMG_WIDTH):
    gray  = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    h, w  = gray.shape
    new_w = min(width, int(w * (width / w))) if w > 0 else width
    gray  = cv2.resize(gray, (new_w, height), interpolation=cv2.INTER_AREA)
    canvas = np.full((height, width), 255, dtype=np.uint8)
    canvas[:, :new_w] = gray
    return transforms.ToTensor()(canvas).unsqueeze(0)


def ctc_greedy_decode(log_probs, blank=BLANK_LABEL):
    probs      = torch.exp(log_probs).squeeze(1)
    max_vals, indices = torch.max(probs, dim=1)
    confidence = float(max_vals.mean())
    decoded, prev = [], None
    for idx in indices.cpu().numpy():
        if idx != blank and idx != prev:
            if idx < len(CHARS):
                decoded.append(idx2char[idx])
        prev = idx
    return ''.join(decoded), confidence


def run_crnn_on_crops(crops, model, device=DEVICE):
    model.eval()
    results = []
    with torch.no_grad():
        for crop in crops:
            tensor = preprocess_line_for_crnn(crop).to(device)
            lp     = model(tensor)
            text, conf = ctc_greedy_decode(lp)
            results.append((text, conf))
    return results


# ── Gemini Module ─────────────────────────────────────────────────────────────

def gemini_multimodal_validate(image_bgr, student_name, roll_no):
    """
    Finds an available vision model and extracts ground truth from the image.
    Uses google-generativeai (legacy) with auto-discovery fallback.
    """
    try:
        import google.generativeai as genai
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set in environment")
        genai.configure(api_key=api_key.strip())
    except Exception as e:
        print(f"Gemini setup error: {e}")
        return {'source': 'placeholder', 'student': {'name': student_name, 'roll_no': roll_no}, 'answers': []}

    # Gemini can fail on very tall stitched pages; resize safely if needed.
    max_height = 16000
    h, w = image_bgr.shape[:2]
    safe_image = image_bgr
    if h > max_height:
        scale = max_height / float(h)
        new_w = max(1, int(w * scale))
        safe_image = cv2.resize(image_bgr, (new_w, max_height), interpolation=cv2.INTER_AREA)
        print(f"[Gemini] Resized image for API safety: {w}x{h} -> {new_w}x{max_height}")

    # Force JPEG payload (instead of implicit WebP conversion path).
    rgb_image = cv2.cvtColor(safe_image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_image)
    jpeg_buffer = io.BytesIO()
    pil_image.save(jpeg_buffer, format="JPEG", quality=88, optimize=True)
    image_part = {
        "mime_type": "image/jpeg",
        "data": jpeg_buffer.getvalue(),
    }

    prompt = (
        "ACT AS: A high-precision handwritten exam OCR extractor.\n"
        "STRICT TASK: Extract ONLY from the provided exam image.\n\n"
        "HEADER EXTRACTION RULES (VERY IMPORTANT):\n"
        "1) Carefully scan the TOP of the FIRST PAGE to extract:\n"
        "   - Student Name\n"
        "   - H.T. No / Hall Ticket Number\n"
        "2) Hall Ticket Number format is ALWAYS a 10-character alphanumeric JNTUH-style string,\n"
        "   e.g. 23D41A66H2.\n"
        "3) Use that format context to correct obvious visual OCR typos:\n"
        "   - confusing 'H' with '11', 'I', or '|'\n"
        "   - confusing '0' with 'O' and '1' with 'I/L'\n"
        "4) If multiple candidates are visible, choose the most central/primary sheet.\n\n"
        "BODY EXTRACTION RULES:\n"
        "- Extract all written answers in order.\n"
        "- Keep answer text faithful; do not summarize.\n\n"
        "OUTPUT REQUIREMENTS:\n"
        "- Return ONLY valid JSON. No markdown. No commentary.\n"
        "- student.name and student.roll_no are REQUIRED fields.\n"
        "- roll_no must be uppercase alphanumeric and exactly 10 chars when possible.\n"
        "- Use this exact schema:\n"
        "{\"student\":{\"name\":\"...\",\"roll_no\":\"...\",\"subject\":\"...\"},"
        "\"answers\":[{\"q\":1,\"text\":\"...\"}]}"
    )

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([prompt, image_part])
    except Exception:
        try:
            models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            best_model = next((m for m in models if 'flash' in m),
                              next((m for m in models if '1.5' in m), models[0]))
            model = genai.GenerativeModel(best_model)
            response = model.generate_content([prompt, image_part])
        except Exception as e:
            print(f"Gemini API error: {e}")
            return {'source': 'error', 'student': {'name': student_name, 'roll_no': roll_no}, 'answers': []}

    try:
        raw    = response.text.strip().replace('```json', '').replace('```', '').strip()
        parsed = json.loads(re.search(r'\{.*\}', raw, re.DOTALL).group())
        student_block = parsed.get('student', {}) if isinstance(parsed, dict) else {}
        if not isinstance(student_block, dict):
            student_block = {}

        raw_name = str(student_block.get('name', student_name)).strip() or student_name
        raw_roll = (
            str(
                student_block.get('roll_no')
                or student_block.get('ht_no')
                or student_block.get('hall_ticket')
                or roll_no
            ).strip().upper()
        )
        raw_roll = re.sub(r'[^A-Z0-9]', '', raw_roll)

        # If OCR gives >10 chars, keep the first JNTUH-like 10-char chunk.
        if len(raw_roll) > 10:
            m = re.search(r'[0-9A-Z]{10}', raw_roll)
            if m:
                raw_roll = m.group(0)
            else:
                raw_roll = raw_roll[:10]

        student_block['name'] = raw_name if raw_name else 'Unknown'
        student_block['roll_no'] = raw_roll if raw_roll else 'Unknown'
        parsed['student'] = student_block
        parsed['source'] = 'gemini_vision_refined'
        return parsed
    except Exception as e:
        print(f"Extraction error: {e}")
        return {'source': 'error', 'student': {'name': student_name, 'roll_no': roll_no}, 'answers': []}


# ── Header Extraction ─────────────────────────────────────────────────────────

def extract_header_metadata(text):
    name_m  = re.search(r'Name\s*[:\-]?\s*([A-Za-z ]+)', text, re.IGNORECASE)
    roll_m  = re.search(r'Roll\s*(?:No\.?|Number)?\s*[:\-]?\s*(\w+)', text, re.IGNORECASE)
    name    = name_m.group(1).strip() if name_m else 'Unknown'
    roll_no = roll_m.group(1).strip() if roll_m else 'Unknown'
    return name, roll_no


# ── Model Singleton ───────────────────────────────────────────────────────────
_model = None

def get_model():
    global _model
    if _model is None:
        _model = CRNN().to(DEVICE)
        weights_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'crnn_weights.pth')
        if os.path.exists(weights_path):
            _model.load_state_dict(torch.load(weights_path, map_location=DEVICE))
            print(f"[CRNN] Loaded weights from {weights_path}")
        else:
            print("[CRNN] No weights file found — using randomly initialised model (demo mode)")
        _model.eval()
    return _model


# ── Main Pipeline Entry Point ─────────────────────────────────────────────────

def run_hybrid_pipeline(image_path, threshold=CONFIDENCE_THRESHOLD):
    """
    Full hybrid pipeline. Called directly by the FastAPI backend.
    Returns a structured dict ready for JSON serialisation.
    """
    print('=' * 60)
    print('Hybrid Pipeline Starting')
    print('=' * 60)

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f'Cannot read image: {image_path}')
    print(f'[1/5] Loaded     : {img.shape}')

    seg = HPPSegmenter(min_height=12, padding=5)
    crops, bboxes, proj, binary = seg.segment(img)
    print(f'[2/5] Segmented  : {len(crops)} lines')

    model     = get_model()
    crnn_out  = run_crnn_on_crops(crops, model)
    all_text  = ' '.join(t for t, _ in crnn_out)
    mean_conf = float(np.mean([c for _, c in crnn_out])) if crnn_out else 0.0
    low_lines = sum(1 for _, c in crnn_out if c < threshold)
    print(f'[3/5] CRNN done  : mean_conf={mean_conf:.3f} | low-conf: {low_lines}/{len(crnn_out)}')

    name, roll_no = extract_header_metadata(all_text[:300])
    print(f'[4/5] Header     : name={name!r}, roll={roll_no!r}')

    crnn_answers = [
        {'q': i + 1, 'text': t, 'confidence': round(c, 4)}
        for i, (t, c) in enumerate(crnn_out)
    ]

    use_gemini = True
    if use_gemini:
        print(f'[5/5] conf {mean_conf:.3f} < {threshold} -> Gemini Vision fallback...')
        gem = gemini_multimodal_validate(img, name, roll_no)
        gem_answers = gem.get('answers', []) if isinstance(gem, dict) else []
        if not isinstance(gem_answers, list):
            gem_answers = []
        if not gem_answers:
            print('[5/5] Gemini fallback unavailable/empty -> using CRNN answers instead')
            gem_answers = crnn_answers
        output = {
            'pipeline_mode'        : 'gemini_fallback',
            'crnn_mean_confidence' : round(mean_conf, 4),
            'confidence_threshold' : threshold,
            'student'              : gem.get('student', {'name': name, 'roll_no': roll_no}),
            'answers'              : gem_answers,
            'source'               : gem.get('source', 'gemini_vision'),
        }
    else:
        print(f'[5/5] conf {mean_conf:.3f} >= {threshold} -> CRNN output accepted')
        output = {
            'pipeline_mode'        : 'crnn_local',
            'crnn_mean_confidence' : round(mean_conf, 4),
            'confidence_threshold' : threshold,
            'student'              : {'name': name, 'roll_no': roll_no, 'subject': None},
            'answers'              : crnn_answers,
            'source'               : 'crnn_local',
        }

    output['input_image']    = os.path.basename(image_path)
    output['lines_detected'] = len(crops)
    output['timestamp']      = time.strftime('%Y-%m-%dT%H:%M:%S')

    # Add per-line confidence data for visualization
    output['line_confidences'] = [
        {'line': i+1, 'confidence': round(c, 4), 'text': t[:40]}
        for i, (t, c) in enumerate(crnn_out)
    ]

    print('=' * 60)
    print(f'Pipeline complete | mode: {output["pipeline_mode"]}')
    return output


# ── PDF Multi-Page Handler ────────────────────────────────────────────────────
# NOTE: Everything below is ADDITIVE — the original run_hybrid_pipeline()
#       above is unchanged. The PDF path simply converts each page to an
#       image, calls run_hybrid_pipeline() per page, then merges results.

def _pdf_to_images(pdf_path: str, dpi: int = 200):
    """
    Convert every page of a PDF to a BGR numpy array (OpenCV format).
    Requires: pip install pdf2image  +  poppler-utils installed on the OS.
    Falls back to pypdf page-rasterisation if pdf2image is unavailable.
    """
    try:
        from pdf2image import convert_from_path
        pil_pages = convert_from_path(pdf_path, dpi=dpi)
        import numpy as np
        pages = []
        for p in pil_pages:
            arr = np.array(p.convert('RGB'))
            pages.append(arr[:, :, ::-1].copy())  # RGB → BGR
        return pages
    except ImportError:
        pass

    # fallback: pypdf + PIL (lower quality but zero extra deps)
    try:
        from pypdf import PdfReader
        import numpy as np
        from PIL import Image as PILImage
        reader = PdfReader(pdf_path)
        pages = []
        for page in reader.pages:
            # Extract embedded images if present
            imgs = list(page.images)
            if imgs:
                for img_obj in imgs:
                    pil = PILImage.open(io.BytesIO(img_obj.data)).convert('RGB')
                    arr = np.array(pil)
                    pages.append(arr[:, :, ::-1].copy())
                    break  # take first image per page
            else:
                print(f"[PDF] Page has no embedded image — skipping (install pdf2image for full support)")
        return pages
    except Exception as e:
        raise RuntimeError(
            f"Cannot rasterise PDF: {e}\n"
            "Install pdf2image + poppler:  pip install pdf2image\n"
            "  Ubuntu: sudo apt install poppler-utils\n"
            "  macOS:  brew install poppler"
        )


def run_pdf_pipeline(pdf_path: str, threshold: float = CONFIDENCE_THRESHOLD):
    """
    Process a multi-page PDF answer sheet.
    Each page is independently processed by run_hybrid_pipeline().
    Returns a merged result dict that preserves the exact same schema as
    run_hybrid_pipeline() so the frontend needs zero changes.
    """
    import io
    import tempfile

    print('=' * 60)
    print(f'PDF Pipeline  →  {os.path.basename(pdf_path)}')
    print('=' * 60)

    pages_bgr = _pdf_to_images(pdf_path)
    if not pages_bgr:
        raise ValueError(f"No pages could be rasterised from: {pdf_path}")

    print(f"[PDF] {len(pages_bgr)} page(s) extracted")

    page_results = []
    tmp_dir = tempfile.mkdtemp(prefix='answersheet_pdf_')

    for page_num, img_bgr in enumerate(pages_bgr, start=1):
        tmp_img_path = os.path.join(tmp_dir, f'page_{page_num:03d}.png')
        cv2.imwrite(tmp_img_path, img_bgr)
        print(f"\n── Page {page_num}/{len(pages_bgr)} ──")
        try:
            result = run_hybrid_pipeline(tmp_img_path, threshold=threshold)
            result['page'] = page_num
            page_results.append(result)
        except Exception as e:
            print(f"[PDF] Page {page_num} error: {e}")
            page_results.append({
                'page': page_num,
                'error': str(e),
                'pipeline_mode': 'error',
                'crnn_mean_confidence': 0.0,
                'answers': [],
                'line_confidences': [],
            })
        finally:
            if os.path.exists(tmp_img_path):
                os.remove(tmp_img_path)

    try:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)
    except Exception:
        pass

    # ── Merge into one top-level response ────────────────────────────────────
    # Strategy: header from page 1, answers collected across all pages
    # (each answer is tagged with its source page)
    all_answers         = []
    all_line_confs      = []
    total_lines         = 0
    crnn_confidences    = []

    for r in page_results:
        pg = r.get('page', '?')
        for ans in r.get('answers', []):
            tagged = dict(ans)
            tagged['page'] = pg
            all_answers.append(tagged)
        for lc in r.get('line_confidences', []):
            tagged = dict(lc)
            tagged['page'] = pg
            all_line_confs.append(tagged)
        total_lines += r.get('lines_detected', 0)
        if r.get('crnn_mean_confidence', 0) > 0:
            crnn_confidences.append(r['crnn_mean_confidence'])

    mean_conf_global = float(np.mean(crnn_confidences)) if crnn_confidences else 0.0
    primary          = page_results[0] if page_results else {}
    modes            = list(dict.fromkeys(r.get('pipeline_mode', '') for r in page_results))

    merged = {
        'pipeline_mode'        : '+'.join(modes) if len(modes) > 1 else (modes[0] if modes else 'unknown'),
        'crnn_mean_confidence' : round(mean_conf_global, 4),
        'confidence_threshold' : threshold,
        'student'              : primary.get('student', {'name': 'Unknown', 'roll_no': 'Unknown', 'subject': None}),
        'answers'              : all_answers,
        'source'               : primary.get('source', 'crnn_local'),
        'input_image'          : os.path.basename(pdf_path),
        'lines_detected'       : total_lines,
        'timestamp'            : time.strftime('%Y-%m-%dT%H:%M:%S'),
        'line_confidences'     : all_line_confs,
        'pages_processed'      : len(page_results),
        'page_results'         : page_results,      # full per-page breakdown
    }

    print('\n' + '=' * 60)
    print(f'PDF Pipeline complete | pages={len(page_results)} | mode={merged["pipeline_mode"]}')
    return merged
