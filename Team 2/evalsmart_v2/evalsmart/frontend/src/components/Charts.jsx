import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, CartesianGrid,
} from "recharts";

const GRADE_COLORS = {
  "A+": "#16a34a", "A": "#22c55e", "B": "#2563eb",
  "C": "#d97706", "D": "#f87171", "F": "#dc2626",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border shadow-md rounded-lg p-3 text-xs z-50">
      {label && <div className="text-muted mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="font-semibold" style={{ color: p.color || "#0f172a" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
};

export function GradeDistribution({ students }) {
  const grades = ["A+", "A", "B", "C", "D", "F"];
  const data = grades.map(g => ({
    grade: g,
    count: students.filter(s => s.summary.grade === g).length,
  })).filter(d => d.count > 0);

  return (
    <div className="w-full flex flex-col h-full">
      <h4 className="font-display text-sm font-bold mb-4 text-text">
        Grade Distribution
      </h4>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
              {data.map((entry) => (
                <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || "#64748b"} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-xs text-text">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ScoreDistribution({ students }) {
  const data = students.map(s => ({
    name: s.student_name.split(" ")[0],
    percentage: s.summary.percentage,
    marks: s.summary.total_marks,
  }));

  return (
    <div className="w-full flex flex-col h-full">
      <h4 className="font-display text-sm font-bold mb-4 text-text">
        Score Distribution
      </h4>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(37, 99, 235, 0.05)" }} />
            <Bar dataKey="percentage" name="%" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.percentage >= 75 ? "#16a34a" : entry.percentage >= 45 ? "#d97706" : "#dc2626"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CosineVsKeyword({ students }) {
  const data = students.flatMap(s =>
    s.questions.map(q => ({
      name: `${s.student_name.split(" ")[0]} · ${q.q_id}`,
      cosine: q.cosine_score,
      keyword: q.keyword_score,
      final: q.final_score,
    }))
  );

  return (
    <div className="w-full flex flex-col h-full">
      <h4 className="font-display text-sm font-bold mb-1 text-text">
        Cosine vs Keyword Score
      </h4>
      <p className="text-[10px] text-muted mb-4">Each point = one answer</p>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={164}>
          <ScatterChart margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="cosine" name="Cosine" type="number" domain={[0,1]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis dataKey="keyword" name="Keyword" type="number" domain={[0,1]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill="#2563eb" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
