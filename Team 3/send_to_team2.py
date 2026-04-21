"""
Legacy relay stub.

The integrated RTP workflow no longer relays OCR JSON over HTTP. Team 3's
portal.py now invokes Team 1 OCR and the evaluator directly inside the same
project flow.
"""


def send_scan(json_path: str, endpoint: str = "http://127.0.0.1:5000/api/receive_scan") -> None:
    raise RuntimeError(
        "Deprecated relay script. Use the Teacher Upload flow in 'Team 3\\portal.py' instead."
    )


if __name__ == "__main__":
    raise SystemExit(
        "Deprecated relay script. Run 'python \"Team 3\\portal.py\"' and upload files through the web portal instead."
    )
