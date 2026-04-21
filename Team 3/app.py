"""
Deprecated compatibility shim.

The integrated SmartEval application lives in portal.py and should be launched
from there to avoid duplicate Flask entry points on port 5000.
"""

if __name__ == "__main__":
    raise SystemExit(
        "Deprecated entry point. Run 'python \"Team 3\\portal.py\"' from the RTP workspace root."
    )


from portal import app
