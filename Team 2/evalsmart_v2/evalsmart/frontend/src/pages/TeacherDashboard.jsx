import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";
import { UploadCloud, CheckCircle, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { ScoreBar, GradeBadge, StatCard } from "../components/ScoreBar";
import { GradeDistribution, ScoreDistribution, CosineVsKeyword } from "../components/Charts";

function PipelineStatus({ jobId, onComplete }) {
  const [status, setStatus] = useState("Queued");
  const [error, setError] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await api.pipelineStatus(jobId);
        setStatus(data.status);
        if (data.status === "Ready" || data.status === "Error") {
          clearInterval(interval);
          if (data.status === "Error") setError(data.error);
          else onComplete(data.results);
        }
      } catch (err) {
        clearInterval(interval);
        setStatus("Error");
        setError(err.message);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  const stages = ["Queued", "Digitizing", "Digitizing Answer Key", "Evaluating", "Ready"];
  const activeIndex = stages.indexOf(status) >= 0 ? stages.indexOf(status) : stages.length;

  return (
    <div className="glass-card p-6 md:p-8 animate-fade-in max-w-2xl mx-auto my-12">
      <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
        {status === "Error" ? <AlertCircle className="text-danger" /> : <RefreshCw className="animate-spin text-primary" />}
        Pipeline Execution
      </h2>
      
      {status === "Error" ? (
        <div className="p-4 bg-red-50 text-danger rounded-lg border border-red-100 flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <p className="text-sm font-medium">{error || "An unknown error occurred in the pipeline"}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {stages.slice(1, 5).map((stage, i) => {
            const isCompleted = activeIndex > stages.indexOf(stage);
            const isActive = status === stage;
            const isPending = activeIndex < stages.indexOf(stage);
            
            return (
              <div key={stage} className={`flex items-center gap-4 ${isPending ? 'opacity-40' : 'opacity-100'} transition-opacity`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                  ${isCompleted ? 'bg-success border-success text-white' : 
                    isActive ? 'border-primary text-primary' : 'border-border text-muted'}`}>
                  {isCompleted ? <CheckCircle size={16} /> : <span className="font-mono text-sm">{i+1}</span>}
                </div>
                <div>
                  <div className={`font-medium ${isActive ? 'text-primary' : 'text-text'}`}>{stage}</div>
                  <div className="text-xs text-muted">
                    {isCompleted ? "Completed" : isActive ? "Processing..." : "Waiting..."}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Result views reused and restyled slightly for Light Mode from original logic (abbreviated)
function StudentDetail({ student, onBack }) {
  const s = student.summary;
  const avgCosine = student.questions.reduce((a,q) => a + q.cosine_score, 0) / student.questions.length;
  const avgKeyword = student.questions.reduce((a,q) => a + q.keyword_score, 0) / student.questions.length;

  return (
    <div className="fade-in">
      <button onClick={onBack} className="text-primary text-sm font-medium hover:underline mb-6 flex items-center gap-1">
        ← Back to class results
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-primary text-white flex items-center justify-center text-2xl font-display font-bold shadow-sm flex-shrink-0">
          {student.student_name[0]}
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold bg-clip-text text-text">
            {student.student_name}
          </h2>
          <div className="text-sm text-muted font-medium">Roll No: {student.roll_no}</div>
        </div>
        <div className="ml-auto">
          <GradeBadge grade={s.grade} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Marks Scored" value={`${s.total_marks}/${s.total_max_marks}`} accent="var(--primary)" />
        <StatCard label="Percentage" value={`${s.percentage}%`} accent="var(--success)" />
        <StatCard label="Avg Cosine" value={`${(avgCosine*100).toFixed(0)}%`} accent="var(--warning)" />
        <StatCard label="Avg Keyword" value={`${(avgKeyword*100).toFixed(0)}%`} accent="var(--primary)" />
      </div>

      <div className="glass-card">
        <div className="px-6 py-4 border-b border-border bg-surface/50">
          <h3 className="font-display font-bold">Question-by-Question Breakdown</h3>
        </div>
        <div className="overflow-x-auto p-0">
          <table className="w-full">
            <thead className="bg-surface border-b border-border">
              <tr>
                {["Q ID","Student Answer","Cos/Key Scores","Final Score","Marks"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {student.questions.map((q, i) => (
                <tr key={i} className="hover:bg-surface/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-sm font-medium text-primary">{q.q_id}</td>
                  <td className="py-3 px-4 max-w-xs text-sm text-text line-clamp-3">
                    {q.student_answer || <span className="text-muted italic">No answer</span>}
                  </td>
                  <td className="py-3 px-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted w-6">COS</span>
                      <ScoreBar value={q.cosine_score} max={1} color="#2563eb" height={4} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted w-6">KEY</span>
                      <ScoreBar value={q.keyword_score} max={1} color="#d97706" height={4} />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                     <ScoreBar value={q.final_score} max={1} color={q.final_score>=0.7?"#16a34a":q.final_score>=0.4?"#d97706":"#dc2626"} height={6} />
                  </td>
                  <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                    {q.marks_awarded} <span className="text-muted font-normal">/{q.max_marks}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResultsView({ data }) {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return <StudentDetail student={selected} onBack={() => setSelected(null)} />;
  }

  const students = data.students || [];
  const totalStudents = students.length;
  const avgPct = students.reduce((a,s) => a + s.summary.percentage, 0) / (totalStudents || 1);
  const gradeCount = students.reduce((a,s) => { a[s.summary.grade] = (a[s.summary.grade]||0)+1; return a; }, {});

  return (
    <div className="fade-in">
      <div className="mb-6">
        <div className="text-sm font-medium text-primary bg-primary/10 inline-block px-3 py-1 rounded-full mb-3">
          Session ID: {data.session_id.substring(0,8)}
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight text-text">
          Class Results Overview
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Students" value={totalStudents} />
        <StatCard label="Class Average" value={`${avgPct.toFixed(1)}%`} accent="var(--primary)" />
        <StatCard label="Top Grade (A+)" value={gradeCount["A+"] || 0} accent="var(--success)" />
        <StatCard label="Needs Attention" value={(gradeCount["D"]||0)+(gradeCount["F"]||0)} accent="var(--danger)" />
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-4"><ScoreDistribution students={students} /></div>
        <div className="glass-card p-4"><GradeDistribution students={students} /></div>
        <div className="glass-card p-4"><CosineVsKeyword students={students} /></div>
      </div>

      <div className="glass-card mb-8">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface/30">
          <h3 className="font-display font-bold">Student Rankings</h3>
          <span className="text-xs text-muted">Click a row for breakdown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                {["Rank","Student","Roll No","Total Marks","Score","Grade"].map(h => (
                  <th key={h} className="text-left py-3 px-6 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s, i) => (
                <tr key={s.roll_no} onClick={() => setSelected(s)} className="cursor-pointer hover:bg-surface/50 transition-colors">
                  <td className="py-3 px-6 font-mono text-sm font-bold text-muted">#{i+1}</td>
                  <td className="py-3 px-6 font-medium text-text flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
                      {s.student_name[0]}
                    </div>
                    {s.student_name}
                  </td>
                  <td className="py-3 px-6 font-mono text-sm text-muted">{s.roll_no}</td>
                  <td className="py-3 px-6 font-mono font-medium">
                    {s.summary.total_marks} <span className="text-muted font-normal">/{s.summary.total_max_marks}</span>
                  </td>
                  <td className="py-3 px-6 min-w-[150px]">
                    <div className="flex items-center gap-2">
                       <ScoreBar value={s.summary.percentage} max={100} color={s.summary.percentage>=75?"#16a34a":s.summary.percentage>=45?"#d97706":"#dc2626"} />
                       <span className="text-xs font-mono font-medium">{s.summary.percentage}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-6"><GradeBadge grade={s.summary.grade} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard({ user }) {
  const [view, setView] = useState("upload"); // upload | pipeline | results
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState(null);
  const [results, setResults] = useState(null);
  
  const [studentImg, setStudentImg] = useState(null);
  const [refMode, setRefMode] = useState("none"); // none | file
  const [refFile, setRefFile] = useState(null);

  async function handleStartPipeline() {
    if (!studentImg) {
      setError("Please select a student image file.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const data = await api.uploadPipeline(studentImg, refMode === "file" ? refFile : null);
      setJobId(data.job_id);
      setView("pipeline");
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {view === "upload" && (
        <div className="fade-in max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl font-bold tracking-tight text-text mb-3">
              Automated Evaluation
            </h1>
            <p className="text-muted text-lg">
              Upload answer sheets and let our AI handle the grading pipeline.
            </p>
          </div>

          <div className="glass-card p-8 shadow-md">
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-text mb-2 flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                Student Answer Sheet (Image/PDF) *
              </label>
              <div 
                className="border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-xl p-6 text-center cursor-pointer transition-colors"
                onClick={() => document.getElementById("studentImg").click()}
              >
                <UploadCloud className="mx-auto text-primary mb-2" size={32} />
                <p className="text-sm font-medium text-text mb-1">
                  {studentImg ? studentImg.name : "Click to select or drag & drop"}
                </p>
                <p className="text-xs text-muted">PNG, JPG, PDF up to 10MB</p>
                <input id="studentImg" type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf" onChange={e => setStudentImg(e.target.files[0])} />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-text mb-2">
                Reference Answer Key (Optional)
              </label>
              <div className="flex gap-4 mb-3">
                 <button onClick={() => setRefMode("none")} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${refMode === "none" ? "bg-surface border-border text-text shadow-sm" : "border-transparent text-muted hover:bg-surface/50"}`}>
                   Use Current Key
                 </button>
                 <button onClick={() => setRefMode("file")} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${refMode === "file" ? "bg-surface border-border text-text shadow-sm" : "border-transparent text-muted hover:bg-surface/50"}`}>
                   Upload New Key
                 </button>
              </div>
              
              {refMode === "file" && (
                <div 
                  className="border-2 border-dashed border-border hover:border-primary/50 bg-surface/50 rounded-xl p-4 text-center cursor-pointer transition-colors"
                  onClick={() => document.getElementById("refFile").click()}
                >
                  <p className="text-sm font-medium text-text">
                    {refFile ? refFile.name : "Upload JSON or Answer Key Image"}
                  </p>
                  <input id="refFile" type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf,.json" onChange={e => setRefFile(e.target.files[0])} />
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 text-danger text-sm font-medium rounded-lg border border-red-100 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button 
              onClick={handleStartPipeline}
              disabled={uploading || !studentImg}
              className="w-full py-4 rounded-xl bg-primary hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow active:scale-[0.99]"
            >
              {uploading ? (
                <><RefreshCw className="animate-spin" size={18} /> Initializing Pipeline...</>
              ) : (
                <>Run AI Evaluation Pipeline</>
              )}
            </button>
          </div>
        </div>
      )}

      {view === "pipeline" && jobId && (
        <PipelineStatus 
          jobId={jobId} 
          onComplete={res => { setResults(res); setView("results"); }} 
        />
      )}

      {view === "results" && results && (
        <div>
          <button 
            onClick={() => { setView("upload"); setStudentImg(null); setRefFile(null); setJobId(null); }}
            className="mb-8 px-4 py-2 border border-border rounded-lg text-sm font-medium text-text bg-white shadow-sm hover:bg-surface hover:border-gray-300 transition-colors inline-block"
          >
            + Evaluate Another Exam
          </button>
          <ResultsView data={results} />
        </div>
      )}
    </div>
  );
}
