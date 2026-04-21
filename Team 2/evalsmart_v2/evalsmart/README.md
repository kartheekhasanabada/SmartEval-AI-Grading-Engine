# 🎓 EvalSmart v2 — Role-Based Answer Sheet Evaluation Dashboard

A full-stack web app with **3 roles** (Admin / Teacher / Student) that reads
pre-scored Excel files from your BERT pipeline and turns them into a clean
grading dashboard.

---

## 🗂 Project Structure

```
evalsmart/
├── backend/
│   ├── app.py                    ← Flask API (auth + grading + file upload)
│   ├── requirements.txt          ← Minimal: flask, pandas, openpyxl
│   └── generate_sample_data.py   ← Creates sample_data.xlsx for testing
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx               ← Auth routing (login → role dashboard)
        ├── index.css             ← Design tokens + global styles
        ├── lib/api.js            ← All API calls
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── TeacherDashboard.jsx  ← Upload + class results + charts
        │   ├── StudentDashboard.jsx  ← Read-only personal results
        │   └── AdminDashboard.jsx    ← User list + session audit
        └── components/
            ├── Navbar.jsx
            ├── ScoreBar.jsx          ← Reusable bar, badge, stat card
            └── Charts.jsx            ← Bar, Pie, Scatter (Recharts)
```

---

## ⚡ Quick Start

### 1 — Backend

```bash
cd backend

python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install flask flask-cors pandas openpyxl xlrd

# Generate sample Excel for testing
python generate_sample_data.py

# Start API
python app.py
# → http://localhost:5000
```

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 🔐 Default Logins

| Username  | Password   | Role    | Notes              |
|-----------|------------|---------|--------------------|
| admin     | admin123   | Admin   | Full system view   |
| teacher1  | teach123   | Teacher | Upload + all results |
| teacher2  | teach456   | Teacher |                    |
| student1  | stud123    | Student | Roll No R001 only  |
| student2  | stud456    | Student | Roll No R002 only  |
| student3  | stud789    | Student | Roll No R003 only  |

---

## 📊 Excel Format (Teacher Upload)

Your BERT pipeline should output an Excel with these columns:

| Column        | Required | Description              |
|---------------|----------|--------------------------|
| Question ID   | ✅       | e.g. q1, q2              |
| Student Answer| ✅       | The student's text       |
| Cosine Score  | ✅       | 0.0 – 1.0                |
| Keyword Score | ✅       | 0.0 – 1.0                |
| Final Score   | ✅       | 0.0 – 1.0 (used for marks)|
| Roll No       | optional | Groups rows per student  |
| Student Name  | optional | Display name             |
| Max Marks     | optional | Default = 10             |

Run `python generate_sample_data.py` to get a ready-made example.

### Grading Scale

| Percentage | Grade |
|-----------|-------|
| ≥ 90%     | A+    |
| ≥ 75%     | A     |
| ≥ 60%     | B     |
| ≥ 45%     | C     |
| ≥ 30%     | D     |
| < 30%     | F     |

---

## 🌐 API Reference

| Method | Endpoint                        | Auth         | Description            |
|--------|---------------------------------|--------------|------------------------|
| POST   | /api/login                      | Public       | Get auth token         |
| POST   | /api/logout                     | Token        | Invalidate token       |
| GET    | /api/me                         | Token        | Current user info      |
| POST   | /api/upload                     | Teacher/Admin| Upload scored Excel    |
| GET    | /api/sessions                   | All roles    | List upload sessions   |
| GET    | /api/results/<session_id>       | All roles    | Full results (students see only their own) |
| GET    | /api/admin/users                | Admin only   | User list              |

---

## 🔧 Notes

- Sessions are **in-memory** — restart the server and they're gone.
  Add a database (SQLite / PostgreSQL) for persistence.
- To add real students, edit the `USERS` dict in `app.py`.
  Each student entry needs a `"roll_no"` matching what's in the Excel.
