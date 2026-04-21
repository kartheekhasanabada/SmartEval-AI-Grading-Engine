"""
generate_sample_data.py
Creates sample_data.xlsx in the new pre-scored format expected by EvalSmart.

Columns: Question ID | Student Answer | Cosine Score | Keyword Score | Final Score
         Roll No | Student Name | Max Marks

Run: python generate_sample_data.py
"""

import pandas as pd
from pathlib import Path

rows = [
    # ── Aarav Sharma (R001) ──────────────────────────────────────────────
    ("q1","It is a security system that monitors and controls incoming and outgoing network traffic based on predefined security rules.",0.82,0.61,0.74,"R001","Aarav Sharma",10),
    ("q2","Polymorphism is a concept in OOP where different classes can be treated as instances of the same parent class through method overriding.",0.79,0.55,0.70,"R001","Aarav Sharma",10),
    ("q3","An OS is software that manages hardware components and provides services for computer programs.",0.75,0.48,0.65,"R001","Aarav Sharma",10),
    ("q4","RAM is temporary memory used by the CPU to store data currently in use.",0.88,0.72,0.82,"R001","Aarav Sharma",10),

    # ── Riya Patel (R002) ────────────────────────────────────────────────
    ("q1","A firewall blocks hackers from entering the computer network.",0.64,0.18,0.49,"R002","Riya Patel",10),
    ("q2","Polymorphism literally means having many forms.",0.50,0.07,0.37,"R002","Riya Patel",10),
    ("q3","The operating system runs the computer and its applications.",0.82,0.27,0.65,"R002","Riya Patel",10),
    ("q4","RAM is used to store files permanently on a computer.",0.41,0.10,0.31,"R002","Riya Patel",10),

    # ── Arjun Singh (R003) ───────────────────────────────────────────────
    ("q1","A wall made of fire.",0.43,0.00,0.30,"R003","Arjun Singh",10),
    ("q2","I did not study this chapter.",0.00,0.00,0.00,"R003","Arjun Singh",10),
    ("q3","Microsoft Word and Google Chrome are examples of an operating system.",0.60,0.18,0.47,"R003","Arjun Singh",10),
    ("q4","RAM means Random Access Memory and stores data the CPU is actively using so programs run fast.",0.91,0.80,0.87,"R003","Arjun Singh",10),

    # ── Sneha Iyer (R004) ────────────────────────────────────────────────
    ("q1","Firewall is a network security system that filters traffic using rules to prevent unauthorised access.",0.85,0.68,0.79,"R004","Sneha Iyer",10),
    ("q2","In OOP, polymorphism allows objects of different types to be accessed through the same interface; a subclass can override methods of its parent class.",0.88,0.73,0.83,"R004","Sneha Iyer",10),
    ("q3","The operating system is system software that manages computer hardware, software resources, and provides common services.",0.90,0.78,0.86,"R004","Sneha Iyer",10),
    ("q4","RAM is volatile memory that temporarily holds data and instructions for the CPU.",0.84,0.65,0.77,"R004","Sneha Iyer",10),

    # ── Rahul Mehta (R005) ───────────────────────────────────────────────
    ("q1","Firewalls protect networks.",0.55,0.12,0.42,"R005","Rahul Mehta",10),
    ("q2","Polymorphism is when one thing has many shapes in programming.",0.60,0.15,0.46,"R005","Rahul Mehta",10),
    ("q3","OS controls the computer.",0.62,0.20,0.50,"R005","Rahul Mehta",10),
    ("q4","I think RAM is the storage drive inside the PC.",0.38,0.08,0.28,"R005","Rahul Mehta",10),
]

df = pd.DataFrame(rows, columns=[
    "Question ID", "Student Answer",
    "Cosine Score", "Keyword Score", "Final Score",
    "Roll No", "Student Name", "Max Marks"
])

out = Path(__file__).parent / "sample_data.xlsx"
df.to_excel(out, index=False)
print(f"✅  sample_data.xlsx written → {out}")
print(f"   {len(df)} rows  ·  {df['Roll No'].nunique()} students  ·  {df['Question ID'].nunique()} questions")
