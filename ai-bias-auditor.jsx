import { useState, useEffect, useRef, useCallback } from "react";

// ─── Color System ──────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0d14",
  surface: "#0f1320",
  card: "#141926",
  border: "#1e2535",
  accent: "#00d4ff",
  accentDim: "#0099bb",
  green: "#00ff9d",
  greenDim: "#00bb73",
  yellow: "#ffd700",
  red: "#ff4560",
  purple: "#a855f7",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textDim: "#94a3b8",
};

// ─── Demo Dataset ─────────────────────────────────────────────────────────────
const DEMO_DATA = {
  name: "Credit Loan Approval Dataset",
  rows: 1000,
  cols: 8,
  columns: ["age","gender","income","education","credit_score","loan_amount","caste","approved"],
  sensitive: ["gender","caste"],
  target: "approved",
  preview: [
    {age:34,gender:"Male",income:72000,education:"Graduate",credit_score:680,loan_amount:25000,caste:"General",approved:1},
    {age:28,gender:"Female",income:48000,education:"Undergraduate",credit_score:610,loan_amount:15000,caste:"OBC",approved:0},
    {age:45,gender:"Male",income:95000,education:"Post-Graduate",credit_score:740,loan_amount:50000,caste:"SC",approved:1},
    {age:31,gender:"Female",income:55000,education:"Graduate",credit_score:650,loan_amount:20000,caste:"General",approved:1},
    {age:52,gender:"Male",income:38000,education:"High School",credit_score:570,loan_amount:10000,caste:"ST",approved:0},
  ],
  summary: {
    missing: {age:0,gender:0,income:12,education:5,credit_score:8,loan_amount:0,caste:0,approved:0},
    classDistrib: {Approved: 620, Rejected: 380},
    genderDistrib: {Male: 540, Female: 390, Other: 70},
    casteDistrib: {General: 420, OBC: 310, SC: 180, ST: 90},
    approvalByGender: {Male: 68, Female: 54, Other: 49},
    approvalByCaste: {General: 72, OBC: 58, SC: 44, ST: 38},
  }
};

// ─── Utility Functions ────────────────────────────────────────────────────────
function cn(...classes) { return classes.filter(Boolean).join(" "); }

function getRiskColor(level) {
  if (level === "Low") return C.green;
  if (level === "Medium") return C.yellow;
  return C.red;
}

function getRiskBg(level) {
  if (level === "Low") return "rgba(0,255,157,0.1)";
  if (level === "Medium") return "rgba(255,215,0,0.1)";
  return "rgba(255,69,96,0.1)";
}

// ─── Mini Chart Components ────────────────────────────────────────────────────
function BarChart({ data, color = C.accent, height = 160 }) {
  const max = Math.max(...Object.values(data));
  return (
    <div style={{ height, display: "flex", alignItems: "flex-end", gap: 8, padding: "8px 0" }}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: C.textMuted }}>{v}</span>
          <div style={{
            width: "100%", borderRadius: 4,
            height: `${(v / max) * (height - 40)}px`,
            background: `linear-gradient(180deg, ${color}, ${color}88)`,
            transition: "height 0.8s cubic-bezier(0.34,1.56,0.64,1)",
            boxShadow: `0 0 12px ${color}44`,
          }} />
          <span style={{ fontSize: 10, color: C.textMuted, textAlign: "center" }}>{k}</span>
        </div>
      ))}
    </div>
  );
}

function PieChart({ data, size = 120 }) {
  const colors = [C.accent, C.green, C.yellow, C.purple, C.red];
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  let cumAngle = 0;
  const slices = Object.entries(data).map(([k, v], i) => {
    const angle = (v / total) * 360;
    const start = cumAngle;
    cumAngle += angle;
    return { key: k, value: v, angle, start, color: colors[i % colors.length] };
  });
  const r = size / 2 - 4;
  const cx = size / 2, cy = size / 2;
  function polarToCartesian(angle) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function describeArc(start, end) {
    const s = polarToCartesian(start), e = polarToCartesian(end);
    const large = end - start > 180 ? 1 : 0;
    return `M${cx},${cy} L${s.x},${s.y} A${r},${r},0,${large},1,${e.x},${e.y} Z`;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width={size} height={size}>
        {slices.map((s) => (
          <path key={s.key} d={describeArc(s.start, s.start + s.angle)}
            fill={s.color} opacity={0.85} stroke={C.bg} strokeWidth={2} />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.45} fill={C.card} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {slices.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ color: C.textDim }}>{s.key}</span>
            <span style={{ color: C.text, fontWeight: 600 }}>{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GaugeChart({ value, size = 180 }) {
  const angle = (value / 100) * 180 - 90;
  const color = value > 70 ? C.green : value > 40 ? C.yellow : C.red;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <defs>
          <linearGradient id="gaugeBg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={C.red} />
            <stop offset="50%" stopColor={C.yellow} />
            <stop offset="100%" stopColor={C.green} />
          </linearGradient>
        </defs>
        {/* Track */}
        <path d={`M ${size*0.1} ${size/2} A ${size*0.4} ${size*0.4} 0 0 1 ${size*0.9} ${size/2}`}
          fill="none" stroke={C.border} strokeWidth={16} strokeLinecap="round" />
        {/* Colored arc */}
        <path d={`M ${size*0.1} ${size/2} A ${size*0.4} ${size*0.4} 0 0 1 ${size*0.9} ${size/2}`}
          fill="none" stroke="url(#gaugeBg)" strokeWidth={16} strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 251} 251`} />
        {/* Needle */}
        <line
          x1={size / 2} y1={size / 2}
          x2={size / 2 + (size * 0.35) * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={size / 2 + (size * 0.35) * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke={color} strokeWidth={3} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <circle cx={size / 2} cy={size / 2} r={8} fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        <text x={size / 2} y={size / 2 + 30} textAnchor="middle" fill={color}
          fontSize={28} fontWeight="800" fontFamily="monospace">{value}</text>
        <text x={size / 2} y={size / 2 + 46} textAnchor="middle" fill={C.textMuted} fontSize={11}>Fairness Score</text>
      </svg>
    </div>
  );
}

function HeatmapCell({ value, label }) {
  const abs = Math.abs(value);
  const bg = value > 0.5 ? `rgba(255,69,96,${abs * 0.8})` :
             value > 0.3 ? `rgba(255,215,0,${abs * 0.8})` :
             `rgba(0,212,255,${abs * 0.6})`;
  return (
    <div style={{
      background: bg, border: `1px solid ${C.border}`,
      borderRadius: 4, padding: "8px 4px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      fontSize: 11, cursor: "default",
      transition: "transform 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <span style={{ color: C.text, fontWeight: 700 }}>{value.toFixed(2)}</span>
      <span style={{ color: C.textMuted, fontSize: 9 }}>{label}</span>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, badge }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}22, ${C.accent}44)`,
          border: `1px solid ${C.accent}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>{icon}</div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text, fontFamily: "'Space Mono', monospace" }}>{title}</h2>
            {badge && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${C.accent}22`, color: C.accent, border: `1px solid ${C.accent}44`, fontWeight: 600 }}>{badge}</span>}
          </div>
          {subtitle && <p style={{ margin: 0, fontSize: 13, color: C.textMuted, marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color = C.accent, icon }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "16px 20px",
      borderTop: `2px solid ${color}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: `${color}08`,
      }} />
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Risk Badge ───────────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: getRiskBg(level), color: getRiskColor(level),
      border: `1px solid ${getRiskColor(level)}44`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: getRiskColor(level) }} />
      {level} Risk
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color = C.accent, label, showValue = true }) {
  const pct = (value / max) * 100;
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: C.textDim }}>{label}</span>
          {showValue && <span style={{ fontSize: 12, color, fontWeight: 600 }}>{value}{max === 100 ? "%" : ""}</span>}
        </div>
      )}
      <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 8px ${color}66`,
          transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      </div>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 4, padding: "4px",
      background: C.surface, borderRadius: 10,
      border: `1px solid ${C.border}`,
      overflowX: "auto",
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: "8px 16px", borderRadius: 7, border: "none", cursor: "pointer",
          background: active === t.id ? `linear-gradient(135deg, ${C.accent}22, ${C.accent}11)` : "transparent",
          color: active === t.id ? C.accent : C.textMuted,
          fontWeight: active === t.id ? 700 : 400,
          fontSize: 13, whiteSpace: "nowrap",
          borderBottom: active === t.id ? `2px solid ${C.accent}` : "2px solid transparent",
          transition: "all 0.2s",
          fontFamily: "'Space Mono', monospace",
        }}>
          {t.icon && <span style={{ marginRight: 6 }}>{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${C.border}`,
      borderTop: `2px solid ${C.accent}`,
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

// ─── AI Chat Bubble ───────────────────────────────────────────────────────────
function AIChatBubble({ message, loading }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.accent}11, ${C.purple}11)`,
      border: `1px solid ${C.accent}33`,
      borderRadius: 12, padding: "14px 16px",
      position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14,
        }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 6, fontFamily: "monospace" }}>
            AI BIAS ANALYST
          </div>
          {loading ? (
            <div style={{ display: "flex", gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: C.accent,
                  animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: C.textDim, lineHeight: 1.7 }}>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function AIBiasAuditor() {
  const [activeTab, setActiveTab] = useState("upload");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [modelTrained, setModelTrained] = useState(false);
  const [mitigated, setMitigated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [threshold, setThreshold] = useState(50);
  const [removedFeatures, setRemovedFeatures] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [selectedModel, setSelectedModel] = useState("logistic");
  const [comparisonData, setComparisonData] = useState(null);

  const fairnessData = {
    demographicParity: { value: 0.22, risk: "High", desc: "Male approval rate is 22% higher than female" },
    equalOpportunity: { value: 0.18, risk: "Medium", desc: "True positive rate differs by 18% across groups" },
    disparateImpact: { value: 0.67, risk: "High", desc: "Ratio below 0.8 indicates disparate impact (Caste)" },
    fairnessScore: 34,
    accuracy: 82.4,
    f1Score: 0.79,
  };

  const mitigatedFairness = {
    demographicParity: { value: 0.08, risk: "Low", desc: "Significantly reduced disparity after reweighing" },
    equalOpportunity: { value: 0.06, risk: "Low", desc: "Equal opportunity improved substantially" },
    disparateImpact: { value: 0.91, risk: "Low", desc: "Above 0.8 threshold — disparate impact resolved" },
    fairnessScore: 78,
    accuracy: 80.1,
    f1Score: 0.77,
  };

  const currentFairness = mitigated ? mitigatedFairness : fairnessData;

  const proxyData = [
    { feature: "income", correlation: 0.61, risk: "High" },
    { feature: "education", correlation: 0.48, risk: "Medium" },
    { feature: "credit_score", correlation: 0.34, risk: "Medium" },
    { feature: "loan_amount", correlation: 0.22, risk: "Low" },
    { feature: "age", correlation: 0.15, risk: "Low" },
  ];

  const heatmapData = {
    labels: ["income","educ","credit","loan","age"],
    matrix: [
      [1.0, 0.61, 0.52, 0.38, 0.22],
      [0.61, 1.0, 0.48, 0.29, 0.31],
      [0.52, 0.48, 1.0, 0.41, 0.18],
      [0.38, 0.29, 0.41, 1.0, 0.09],
      [0.22, 0.31, 0.18, 0.09, 1.0],
    ]
  };

  const featureImportance = {
    credit_score: 0.31, income: 0.27, loan_amount: 0.18,
    education: 0.12, age: 0.07, gender: 0.03, caste: 0.02,
  };

  function addLog(action) {
    setAuditLog(prev => [{
      time: new Date().toLocaleTimeString(), action,
      user: "analyst@org.com"
    }, ...prev.slice(0, 19)]);
  }

  async function loadDemo() {
    setLoading(true); setLoadingMsg("Loading demo dataset...");
    await new Promise(r => setTimeout(r, 1200));
    setDataLoaded(true); setLoading(false);
    addLog("Loaded demo dataset: Credit Loan Approval");
    setActiveTab("analysis");
  }

  async function trainModel() {
    setLoading(true); setLoadingMsg(`Training ${selectedModel === "logistic" ? "Logistic Regression" : "Decision Tree"}...`);
    await new Promise(r => setTimeout(r, 1800));
    setModelTrained(true); setLoading(false);
    addLog(`Trained ${selectedModel} model — Accuracy: 82.4%`);
    setActiveTab("fairness");
  }

  async function runMitigation() {
    setLoading(true); setLoadingMsg("Applying reweighing & threshold adjustment...");
    await new Promise(r => setTimeout(r, 2000));
    setMitigated(true); setLoading(false);
    const removed = removedFeatures.length > 0 ? ` (removed: ${removedFeatures.join(", ")})` : "";
    addLog(`Applied bias mitigation${removed} — Fairness Score: 78`);
    setComparisonData({ before: fairnessData, after: mitigatedFairness });
    setActiveTab("mitigation");
  }

  async function explainBias() {
    setAiLoading(true); setAiExplanation("");
    try {
      const ctx = `Dataset: ${DEMO_DATA.name}. Sensitive attributes: gender, caste. 
Demographic parity difference: ${currentFairness.demographicParity.value} (${currentFairness.demographicParity.risk} risk).
Equal opportunity difference: ${currentFairness.equalOpportunity.value} (${currentFairness.equalOpportunity.risk} risk).
Disparate impact ratio: ${currentFairness.disparateImpact.value} (${currentFairness.disparateImpact.risk} risk).
Fairness score: ${currentFairness.fairnessScore}/100.
Top proxy features: income (0.61 correlation with sensitive attr), education (0.48).
${mitigated ? "Mitigation has been applied using reweighing technique." : "No mitigation applied yet."}`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are an AI fairness expert. Explain bias findings in plain English for non-technical users in 3-4 short paragraphs. Be concrete, empathetic, and actionable. No jargon.",
          messages: [{ role: "user", content: `Explain these bias audit results simply:\n${ctx}` }]
        })
      });
      const data = await resp.json();
      const text = data.content?.find(b => b.type === "text")?.text || "Analysis complete.";
      setAiExplanation(text);
      addLog("Generated AI explanation of bias findings");
    } catch {
      setAiExplanation("The model shows significant bias against female applicants and lower-caste groups. Income and education act as proxy features that indirectly encode historical disadvantages. Immediate mitigation is recommended before production deployment.");
    }
    setAiLoading(false);
  }

  const tabs = [
    { id: "upload", label: "Data Upload", icon: "📂" },
    { id: "analysis", label: "Analysis", icon: "📊" },
    { id: "model", label: "Model", icon: "🧠" },
    { id: "fairness", label: "Fairness", icon: "⚖️" },
    { id: "mitigation", label: "Mitigation", icon: "🔧" },
    { id: "proxy", label: "Proxy Bias", icon: "🔍" },
    { id: "xai", label: "Explainability", icon: "💡" },
    { id: "whatif", label: "What-If", icon: "🎛️" },
    { id: "report", label: "Report", icon: "📄" },
  ];

  const glassCard = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', 'Inter', sans-serif",
      color: C.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: #1e2535 transparent; }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: #1e2535; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #00d4ff; cursor: pointer; box-shadow: 0 0 8px #00d4ff88; }
        button:active { transform: scale(0.97); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <header style={{
        background: `${C.surface}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 32px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Space Mono', monospace", color: C.text }}>
              AI Bias Auditor
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 2 }}>FAIRNESS INTELLIGENCE PLATFORM</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {dataLoaded && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.green }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
              Dataset Active
            </div>
          )}
          {modelTrained && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.accent }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />
              Model Ready
            </div>
          )}
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>v2.0.0</div>
        </div>
      </header>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(10,13,20,0.85)", backdropFilter: "blur(8px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          <Spinner size={40} />
          <div style={{ fontSize: 14, color: C.accent, fontFamily: "monospace" }}>{loadingMsg}</div>
          <div style={{ width: 200, height: 2, background: C.border, borderRadius: 1, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: C.accent, borderRadius: 1,
              animation: "loading 1.5s ease-in-out infinite",
              width: "60%",
            }} />
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px" }}>
        {/* Tabs */}
        <div style={{ marginBottom: 24 }}>
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* ── UPLOAD TAB ─────────────────────────────────────────────────── */}
        {activeTab === "upload" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <SectionHeader icon="📂" title="Data Upload" subtitle="Load your dataset or explore with demo data" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Demo Dataset */}
              <div style={{ ...glassCard, borderTop: `2px solid ${C.green}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 12 }}>🎯 Demo Dataset</div>
                <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16 }}>
                  Pre-loaded Credit Loan Approval dataset with gender and caste bias.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[["Rows", "1,000"], ["Columns", "8"], ["Sensitive", "2"], ["Target", "approved"]].map(([k, v]) => (
                    <div key={k} style={{ background: C.surface, borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{k}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{v}</div>
                    </div>
                  ))}
                </div>
                <button onClick={loadDemo} style={{
                  width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                  background: `linear-gradient(135deg, ${C.green}33, ${C.green}22)`,
                  color: C.green, fontWeight: 700, cursor: "pointer", fontSize: 13,
                  border: `1px solid ${C.green}44`,
                }}>
                  ▶ Load Demo Dataset
                </button>
              </div>

              {/* Upload */}
              <div style={{ ...glassCard, borderTop: `2px solid ${C.accent}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 12 }}>📤 Upload Your Data</div>
                <div style={{
                  border: `2px dashed ${C.border}`, borderRadius: 10, padding: "32px 16px",
                  textAlign: "center", cursor: "pointer", marginBottom: 16,
                  transition: "border-color 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                  <div style={{ fontSize: 13, color: C.textDim }}>Drop CSV or Excel file here</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>or click to browse</div>
                  <input type="file" accept=".csv,.xlsx" style={{ display: "none" }} />
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center" }}>
                  Supported: CSV, XLSX • Max 50MB • UTF-8 encoded
                </div>
              </div>
            </div>

            {/* Dataset Preview */}
            {dataLoaded && (
              <div style={{ ...glassCard, animation: "fadeIn 0.4s ease" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                  📋 Dataset Preview — <span style={{ color: C.accent }}>{DEMO_DATA.name}</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {DEMO_DATA.columns.map(col => (
                          <th key={col} style={{
                            padding: "8px 12px", textAlign: "left",
                            background: C.surface, color: C.textDim, fontWeight: 600,
                            borderBottom: `1px solid ${C.border}`,
                            borderRight: `1px solid ${C.border}`,
                          }}>
                            {col}
                            {DEMO_DATA.sensitive.includes(col) && <span style={{ color: C.yellow, marginLeft: 4 }}>⚠</span>}
                            {col === DEMO_DATA.target && <span style={{ color: C.green, marginLeft: 4 }}>★</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_DATA.preview.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                          {DEMO_DATA.columns.map(col => (
                            <td key={col} style={{
                              padding: "7px 12px", color: col === DEMO_DATA.target ? C.green :
                                DEMO_DATA.sensitive.includes(col) ? C.yellow : C.textDim,
                            }}>
                              {col === "approved" ? (row[col] === 1 ? "✓ Yes" : "✗ No") : row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 11, color: C.textMuted }}>
                  <span>⚠ <span style={{ color: C.yellow }}>Yellow</span> = Sensitive attribute</span>
                  <span>★ <span style={{ color: C.green }}>Green</span> = Target column</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ANALYSIS TAB ──────────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <SectionHeader icon="📊" title="Data Analysis" subtitle="Distribution analysis and bias detection" badge={dataLoaded ? "ACTIVE" : "AWAITING DATA"} />

            {!dataLoaded ? (
              <div style={{ ...glassCard, textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
                <div style={{ color: C.textMuted }}>Load a dataset first to begin analysis</div>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
                  <MetricCard label="Total Rows" value="1,000" icon="📋" color={C.accent} />
                  <MetricCard label="Columns" value="8" icon="📐" color={C.purple} />
                  <MetricCard label="Missing Values" value="25" sub="2.5% of data" icon="⚠️" color={C.yellow} />
                  <MetricCard label="Sensitive Attrs" value="2" sub="gender, caste" icon="🔒" color={C.red} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Class Distribution */}
                  <div style={glassCard}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Target Distribution</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>Loan Approval (approved)</div>
                    <BarChart data={DEMO_DATA.summary.classDistrib} color={C.accent} />
                    <div style={{ marginTop: 8, padding: "8px 12px", background: `${C.yellow}11`, borderRadius: 8, border: `1px solid ${C.yellow}33` }}>
                      <span style={{ fontSize: 12, color: C.yellow }}>⚠ Class Imbalance: 62% Approved vs 38% Rejected</span>
                    </div>
                  </div>

                  {/* Gender Distribution */}
                  <div style={glassCard}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Gender Distribution</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>Sensitive attribute: gender</div>
                    <PieChart data={DEMO_DATA.summary.genderDistrib} />
                  </div>

                  {/* Approval by Gender */}
                  <div style={glassCard}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Approval Rate by Gender</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>Label bias across gender groups</div>
                    <BarChart data={DEMO_DATA.summary.approvalByGender} color={C.green} />
                    <div style={{ marginTop: 8, padding: "8px 12px", background: `${C.red}11`, borderRadius: 8, border: `1px solid ${C.red}33` }}>
                      <span style={{ fontSize: 12, color: C.red }}>🚨 High label bias: Male 68% vs Female 54% vs Other 49%</span>
                    </div>
                  </div>

                  {/* Approval by Caste */}
                  <div style={glassCard}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Approval Rate by Caste</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>Label bias across caste groups</div>
                    <BarChart data={DEMO_DATA.summary.approvalByCaste} color={C.purple} />
                    <div style={{ marginTop: 8, padding: "8px 12px", background: `${C.red}11`, borderRadius: 8, border: `1px solid ${C.red}33` }}>
                      <span style={{ fontSize: 12, color: C.red }}>🚨 Severe bias: General 72% vs ST 38% (34pt gap)</span>
                    </div>
                  </div>
                </div>

                {/* Missing Values */}
                <div style={glassCard}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Missing Value Analysis</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(DEMO_DATA.summary.missing).map(([col, val]) => (
                      <ProgressBar key={col} value={val} max={1000} color={val > 10 ? C.yellow : val > 0 ? C.accent : C.green}
                        label={`${col} ${val > 0 ? `(${val} missing)` : "(complete)"}`} showValue={true} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── MODEL TAB ─────────────────────────────────────────────────── */}
        {activeTab === "model" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <SectionHeader icon="🧠" title="Model Training" subtitle="Train and evaluate ML models" />

            {!dataLoaded ? (
              <div style={{ ...glassCard, textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
                <div style={{ color: C.textMuted }}>Load a dataset first</div>
              </div>
            ) : (
              <>
                <div style={{ ...glassCard }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>⚙️ Training Configuration</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                    {[
                      { id: "logistic", name: "Logistic Regression", desc: "Linear decision boundary, interpretable" },
                      { id: "tree", name: "Decision Tree", desc: "Non-linear, rule-based splits" },
                      { id: "both", name: "Compare Both", desc: "Train & compare all models" },
                    ].map(m => (
                      <div key={m.id} onClick={() => setSelectedModel(m.id)} style={{
                        padding: 16, borderRadius: 10, cursor: "pointer",
                        border: `2px solid ${selectedModel === m.id ? C.accent : C.border}`,
                        background: selectedModel === m.id ? `${C.accent}11` : C.surface,
                        transition: "all 0.2s",
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: selectedModel === m.id ? C.accent : C.text }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{m.desc}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div style={{ background: C.surface, borderRadius: 8, padding: "12px 16px" }}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>Train/Test Split</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>80% / 20%</div>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 8, padding: "12px 16px" }}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>Random State</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>42</div>
                    </div>
                  </div>
                  <button onClick={trainModel} style={{
                    padding: "12px 32px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
                    color: C.bg, fontWeight: 800, fontSize: 14,
                    boxShadow: `0 4px 20px ${C.accent}44`,
                  }}>
                    ▶ Train Model
                  </button>
                </div>

                {modelTrained && (
                  <div style={{ animation: "fadeIn 0.4s ease" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
                      <MetricCard label="Accuracy" value="82.4%" icon="🎯" color={C.green} />
                      <MetricCard label="F1 Score" value="0.79" icon="📐" color={C.accent} />
                      <MetricCard label="Precision" value="0.81" icon="🔎" color={C.purple} />
                      <MetricCard label="Recall" value="0.77" icon="📡" color={C.yellow} />
                    </div>

                    {/* Confusion Matrix */}
                    <div style={glassCard}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Confusion Matrix</div>
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 4, maxWidth: 300 }}>
                        {[["", "Pred: No", "Pred: Yes"],
                          ["Act: No", "142", "38"],
                          ["Act: Yes", "31", "189"]].map((row, ri) => row.map((cell, ci) => (
                          <div key={`${ri}-${ci}`} style={{
                            padding: "10px 16px", borderRadius: 6, textAlign: "center",
                            background: ri === 0 || ci === 0 ? C.surface : ri === ci ? `${C.green}22` : `${C.red}11`,
                            color: ri === 0 || ci === 0 ? C.textMuted :
                              ri === ci ? C.green : C.red,
                            fontWeight: ri > 0 && ci > 0 ? 700 : 500, fontSize: 13,
                            border: ri > 0 && ci > 0 ? `1px solid ${ri === ci ? C.green : C.red}33` : "none",
                          }}>{cell}</div>
                        )))}
                      </div>
                    </div>

                    {/* Multi-model comparison */}
                    <div style={glassCard}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Multi-Model Comparison</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[
                          { name: "Logistic Regression", acc: 82.4, f1: 0.79, fair: 34 },
                          { name: "Decision Tree", acc: 79.1, f1: 0.76, fair: 31 },
                        ].map(m => (
                          <div key={m.name} style={{ background: C.surface, borderRadius: 10, padding: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>{m.name}</div>
                            <ProgressBar value={m.acc} label="Accuracy" color={C.green} />
                            <div style={{ marginTop: 8 }}>
                              <ProgressBar value={m.fair} label="Fairness Score" color={m.fair > 60 ? C.green : m.fair > 40 ? C.yellow : C.red} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── FAIRNESS TAB ──────────────────────────────────────────────── */}
        {activeTab === "fairness" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <SectionHeader icon="⚖️" title="Fairness Analysis" subtitle="Comprehensive fairness metrics and scoring"
              badge={mitigated ? "POST-MITIGATION" : "PRE-MITIGATION"} />

            {!modelTrained ? (
              <div style={{ ...glassCard, textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
                <div style={{ color: C.textMuted }}>Train a model first to compute fairness metrics</div>
              </div>
            ) : (
              <>
                {/* Gauge + Summary */}
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, marginBottom: 20 }}>
                  <div style={{ ...glassCard, marginBottom: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <GaugeChart value={currentFairness.fairnessScore} />
                    <RiskBadge level={currentFairness.fairnessScore > 70 ? "Low" : currentFairness.fairnessScore > 40 ? "Medium" : "High"} />
                  </div>
                  <div style={{ ...glassCard, marginBottom: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Fairness Metrics</div>
                    {[
                      { label: "Demographic Parity Difference", ...currentFairness.demographicParity, ideal: "< 0.1" },
                      { label: "Equal Opportunity Difference", ...currentFairness.equalOpportunity, ideal: "< 0.1" },
                      { label: "Disparate Impact Ratio", ...currentFairness.disparateImpact, ideal: "> 0.8" },
                    ].map(m => (
                      <div key={m.label} style={{
                        padding: "12px 16px", marginBottom: 10, borderRadius: 10,
                        background: getRiskBg(m.risk),
                        border: `1px solid ${getRiskColor(m.risk)}33`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: C.textDim }}>{m.label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: getRiskColor(m.risk) }}>{m.value}</span>
                            <RiskBadge level={m.risk} />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{m.desc} • Ideal: {m.ideal}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Explanation */}
                <div style={glassCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>💬 Plain English Explanation</div>
                    <button onClick={explainBias} disabled={aiLoading} style={{
                      padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.accent}44`,
                      background: `${C.accent}11`, color: C.accent, cursor: "pointer", fontSize: 12, fontWeight: 600,
                    }}>
                      {aiLoading ? "Analyzing..." : "🤖 Explain Bias Simply"}
                    </button>
                  </div>
                  {(aiExplanation || aiLoading) ? (
                    <AIChatBubble message={aiExplanation} loading={aiLoading} />
                  ) : (
                    <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: 24 }}>
                      Click "Explain Bias Simply" for an AI-powered plain English analysis
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── MITIGATION TAB ────────────────────────────────────────────── */}
        {activeTab === "mitigation" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <SectionHeader icon="🔧" title="Bias Mitigation" subtitle="Apply techniques to reduce model bias" />

            {!modelTrained ? (
              <div style={{ ...glassCard, textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
                <div style={{ color: C.textMuted }}>Train a model first</div>
              </div>
            ) : (
              <>
                <div style={glassCard}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>🛠 Mitigation Techniques</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                    {[
                      { name: "Reweighing", desc: "Assign sample weights to balance group outcomes", active: true },
                      { name: "Remove Sensitive Features", desc: "Exclude sensitive attributes from training", active: removedFeatures.length > 0 },
                      { name: "Threshold Adjustment", desc: "Optimize decision threshold per group", active: threshold !== 50 },
                    ].map(t => (
                      <div key={t.name} style={{
                        padding: 14, borderRadius: 10,
                        border: `2px solid ${t.active ? C.green : C.border}`,
                        background: t.active ? `${C.green}08` : C.surface,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: t.active ? C.green : C.text }}>{t.name}</span>
                          {t.active && <span style={{ color: C.green, fontSize: 14 }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{t.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* Feature removal */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>Remove sensitive features:</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["gender", "caste"].map(f => (
                        <button key={f} onClick={() => setRemovedFeatures(prev =>
                          prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
                        )} style={{
                          padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                          border: `1px solid ${removedFeatures.includes(f) ? C.red : C.border}`,
                          background: removedFeatures.includes(f) ? `${C.red}22` : C.surface,
                          color: removedFeatures.includes(f) ? C.red : C.textDim,
                        }}>
                          {removedFeatures.includes(f) ? "✓ " : ""}{f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={runMitigation} style={{
                    padding: "12px 32px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: `linear-gradient(135deg, ${C.green}, ${C.greenDim})`,
                    color: C.bg, fontWeight: 800, fontSize: 14,
                    boxShadow: `0 4px 20px ${C.green}44`,
                  }}>
                    ⚡ Apply Mitigation & Retrain
                  </button>
                </div>

                {/* Before/After Comparison */}
                {(mitigated || comparisonData) && (
                  <div style={{ ...glassCard, animation: "fadeIn 0.4s ease" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>📊 Before vs After Comparison</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      {[{ label: "Before Mitigation", data: fairnessData, color: C.red },
                        { label: "After Mitigation", data: mitigatedFairness, color: C.green }].map(({ label, data, color }) => (
                        <div key={label} style={{ background: C.surface, borderRadius: 10, padding: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 12 }}>{label}</div>
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                            <GaugeChart value={data.fairnessScore} size={140} />
                          </div>
                          {[
                            { label: "Dem. Parity", value: data.demographicParity.value },
                            { label: "Equal Opportunity", value: data.equalOpportunity.value },
                            { label: "Disparate Impact", value: data.disparateImpact.value },
                          ].map(m => (
                            <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                              <span style={{ color: C.textMuted }}>{m.label}</span>
                              <span style={{ color, fontWeight: 700, fontFamily: "monospace" }}>{m.value}</span>
                            </div>
                          ))}
                          <div style={{ marginTop: 8, padding: "8px 12px", background: `${color}11`, borderRadius: 6, fontSize: 12, color }}>
                            Accuracy: {data.accuracy}% | F1: {data.f1Score}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, padding: 16, background: `${C.green}11`, borderRadius: 10, border: `1px solid ${C.green}33` }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 8 }}>📈 Mitigation Results</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                        {[
                          { label: "Fairness Score", before: 34, after: 78, unit: "pts" },
                          { label: "Dem. Parity ↓", before: 0.22, after: 0.08, unit: "" },
                          { label: "Accuracy", before: 82.4, after: 80.1, unit: "%" },
                        ].map(m => (
                          <div key={m.label} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: C.textMuted }}>{m.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: C.green, fontFamily: "monospace" }}>
                              +{((m.after - m.before) / m.before * 100).toFixed(0)}%
                            </div>
                            <div style={{ fontSize: 11, color: C.textDim }}>{m.before} → {m.after}{m.unit}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── PROXY BIAS TAB ────────────────────────────────────────────── */}
        {activeTab === "proxy" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <SectionHeader icon="🔍" title="Proxy Bias Detection" subtitle="Find features that encode sensitive attribute information" />

            {!dataLoaded ? (
              <div style={{ ...glassCard, textAlign: "center", padding: 48 }}>
                <div style={{ color: C.textMuted }}>Load a dataset first</div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Proxy Rankings */}
                  <div style={glassCard}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Proxy Feature Rankings</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {proxyData.map(p => (
                        <div key={p.feature} style={{
                          padding: "10px 14px", borderRadius: 8,
                          background: getRiskBg(p.risk),
                          border: `1px solid ${getRiskColor(p.risk)}33`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.feature}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontFamily: "monospace", fontSize: 13, color: getRiskColor(p.risk), fontWeight: 700 }}>
                                r={p.correlation}
                              </span>
                              <RiskBadge level={p.risk} />
                            </div>
                          </div>
                          <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{
                              width: `${p.correlation * 100}%`, height: "100%",
                              background: getRiskColor(p.risk), borderRadius: 2,
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, padding: 12, background: `${C.yellow}11`, borderRadius: 8, border: `1px solid ${C.yellow}33`, fontSize: 12, color: C.yellow }}>
                      ⚠ income and education are strong proxies for caste — consider removing or transforming them before training.
                    </div>
                  </div>

                  {/* Correlation Heatmap */}
                  <div style={glassCard}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Correlation Heatmap</div>
                    <div style={{ display: "grid", gap: 3 }}>
                      <div style={{ display: "grid", gridTemplateColumns: `auto repeat(${heatmapData.labels.length}, 1fr)`, gap: 3 }}>
                        <div />
                        {heatmapData.labels.map(l => (
                          <div key={l} style={{ textAlign: "center", fontSize: 10, color: C.textMuted, padding: "2px 0" }}>{l}</div>
                        ))}
                      </div>
                      {heatmapData.matrix.map((row, ri) => (
                        <div key={ri} style={{ display: "grid", gridTemplateColumns: `auto repeat(${heatmapData.labels.length}, 1fr)`, gap: 3 }}>
                          <div style={{ fontSize: 10, color: C.textMuted, display: "flex", alignItems: "center", paddingRight: 6 }}>
                            {heatmapData.labels[ri]}
                          </div>
                          {row.map((val, ci) => (
                            <HeatmapCell key={ci} value={val} label={`${heatmapData.labels[ri]}↔${heatmapData.labels[ci]}`} />
                          ))}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 11 }}>
                      <span style={{ color: C.red }}>■ High correlation (&gt;0.5)</span>
                      <span style={{ color: C.yellow }}>■ Medium (0.3–0.5)</span>
                      <span style={{ color: C.accent }}>■ Low (&lt;0.3)</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── XAI TAB ───────────────────────────────────────────────────── */}
        {activeTab === "xai" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <SectionHeader icon="💡" title="Explainability (XAI)" subtitle="Feature importance and SHAP analysis" />

            {!modelTrained ? (
              <div style={{ ...glassCard, textAlign: "center", padding: 48 }}>
                <div style={{ color: C.textMuted }}>Train a model first</div>
              </div>
            ) : (
              <>
                <div style={{ ...glassCard }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Feature Importance Rankings</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(featureImportance)
                      .sort(([, a], [, b]) => b - a)
                      .map(([feat, imp], i) => (
                        <div key={feat} style={{ display: "grid", gridTemplateColumns: "24px 120px 1fr 60px", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "monospace" }}>#{i + 1}</span>
                          <span style={{ fontSize: 13, color: DEMO_DATA.sensitive.includes(feat) ? C.yellow : C.textDim }}>
                            {feat}{DEMO_DATA.sensitive.includes(feat) ? " ⚠" : ""}
                          </span>
                          <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{
                              width: `${imp * 100}%`, height: "100%", borderRadius: 4,
                              background: DEMO_DATA.sensitive.includes(feat) ? C.yellow :
                                i === 0 ? C.green : i < 3 ? C.accent : C.purple,
                              transition: "width 1s ease",
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontFamily: "monospace", color: C.textDim, textAlign: "right" }}>
                            {(imp * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                  <div style={{ marginTop: 16, padding: 12, background: `${C.yellow}11`, borderRadius: 8, border: `1px solid ${C.yellow}33`, fontSize: 12, color: C.yellow }}>
                    ⚠ While gender and caste have low direct importance (2–3%), their proxy variables income and education contribute 27–31% — enabling indirect discrimination.
                  </div>
                </div>

                <div style={glassCard}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>SHAP Summary (Simulated)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { feat: "credit_score", pos: 0.28, neg: -0.03 },
                      { feat: "income", pos: 0.22, neg: -0.05 },
                      { feat: "loan_amount", pos: 0.05, neg: -0.13 },
                      { feat: "education", pos: 0.09, neg: -0.03 },
                      { feat: "age", pos: 0.04, neg: -0.03 },
                      { feat: "gender", pos: 0.02, neg: -0.01 },
                      { feat: "caste", pos: 0.01, neg: -0.01 },
                    ].map(s => (
                      <div key={s.feat} style={{ display: "grid", gridTemplateColumns: "100px 1fr 100px", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: DEMO_DATA.sensitive.includes(s.feat) ? C.yellow : C.textDim, textAlign: "right" }}>{s.feat}</span>
                        <div style={{ position: "relative", height: 12, background: C.border, borderRadius: 2 }}>
                          <div style={{ position: "absolute", right: "50%", width: `${Math.abs(s.neg) * 200}%`, height: "100%", background: C.red, borderRadius: "2px 0 0 2px" }} />
                          <div style={{ position: "absolute", left: "50%", width: `${s.pos * 200}%`, height: "100%", background: C.green, borderRadius: "0 2px 2px 0" }} />
                          <div style={{ position: "absolute", left: "50%", width: 1, height: "100%", background: C.textMuted }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: C.textMuted }}>+{s.pos} / {s.neg}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 11 }}>
                    <span style={{ color: C.green }}>■ Pushes toward approval</span>
                    <span style={{ color: C.red }}>■ Pushes toward rejection</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── WHAT-IF TAB ───────────────────────────────────────────────── */}
        {activeTab === "whatif" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <SectionHeader icon="🎛️" title="What-If Simulator" subtitle="Interactively explore bias under different conditions" />

            {!modelTrained ? (
              <div style={{ ...glassCard, textAlign: "center", padding: 48 }}>
                <div style={{ color: C.textMuted }}>Train a model first</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Controls */}
                <div style={glassCard}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 20 }}>⚙️ Simulation Controls</div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: C.textDim }}>Decision Threshold</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.accent, fontFamily: "monospace" }}>{threshold}%</span>
                    </div>
                    <input type="range" min={20} max={80} value={threshold}
                      onChange={e => setThreshold(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: C.accent }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                      <span>More Approvals</span><span>Fewer Approvals</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, color: C.textDim, marginBottom: 10 }}>Remove Features</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {DEMO_DATA.columns.filter(c => c !== "approved").map(f => (
                        <button key={f} onClick={() => setRemovedFeatures(prev =>
                          prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
                        )} style={{
                          padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                          border: `1px solid ${removedFeatures.includes(f) ? C.red : C.border}`,
                          background: removedFeatures.includes(f) ? `${C.red}22` : C.surface,
                          color: removedFeatures.includes(f) ? C.red : C.textMuted,
                        }}>
                          {removedFeatures.includes(f) ? "✕ " : "+ "}{f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 14, background: C.surface, borderRadius: 10, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Simulation Preview</div>
                    <div style={{ fontSize: 12, color: C.textDim }}>
                      Threshold: <span style={{ color: C.accent }}>{threshold}%</span>{" "}
                      {threshold < 40 ? "→ More inclusive, potential false positives" :
                       threshold > 60 ? "→ More restrictive, risk of unfair rejections" :
                       "→ Balanced decision boundary"}
                    </div>
                    {removedFeatures.length > 0 && (
                      <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>
                        Removed: <span style={{ color: C.red }}>{removedFeatures.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Impact */}
                <div style={glassCard}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 20 }}>📈 Simulated Fairness Impact</div>
                  {(() => {
                    const thresholdEffect = (50 - threshold) * 0.003;
                    const removedEffect = removedFeatures.filter(f => DEMO_DATA.sensitive.includes(f)).length * 0.08;
                    const simDP = Math.max(0.02, fairnessData.demographicParity.value - thresholdEffect - removedEffect);
                    const simScore = Math.min(95, Math.round(fairnessData.fairnessScore + (thresholdEffect + removedEffect) * 300));
                    return (
                      <>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                          <GaugeChart value={simScore} size={160} />
                        </div>
                        {[
                          { label: "Demographic Parity", current: fairnessData.demographicParity.value, sim: simDP },
                          { label: "Fairness Score", current: fairnessData.fairnessScore, sim: simScore },
                          { label: "Estimated Accuracy", current: 82.4, sim: Math.round((82.4 - removedEffect * 20) * 10) / 10 },
                        ].map(m => (
                          <div key={m.label} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13,
                          }}>
                            <span style={{ color: C.textMuted }}>{m.label}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: C.textDim, fontFamily: "monospace" }}>{typeof m.current === "number" && m.current > 1 ? m.current + "%" : m.current}</span>
                              <span style={{ color: C.textMuted }}>→</span>
                              <span style={{
                                fontFamily: "monospace", fontWeight: 700,
                                color: m.sim > m.current ? C.green : m.sim < m.current ? (m.label.includes("Parity") ? C.green : C.yellow) : C.textDim
                              }}>
                                {typeof m.sim === "number" && m.sim > 1 ? m.sim + "%" : m.sim.toFixed(2)}
                              </span>
                              <span style={{ fontSize: 11, color: C.green }}>
                                {m.label === "Demographic Parity" ? (m.sim < m.current ? "↓ Better" : "") :
                                  m.sim > m.current ? "↑ Better" : "↓"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REPORT TAB ────────────────────────────────────────────────── */}
        {activeTab === "report" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <SectionHeader icon="📄" title="Audit Report" subtitle="Generate and export comprehensive bias audit reports" />

            <div style={glassCard}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 20 }}>📋 Report Preview</div>

              {/* Report Header */}
              <div style={{
                background: `linear-gradient(135deg, ${C.accent}11, ${C.purple}11)`,
                border: `1px solid ${C.accent}33`, borderRadius: 12, padding: 20, marginBottom: 20
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "'Space Mono', monospace" }}>
                  AI Bias Audit Report
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
                  Dataset: {DEMO_DATA.name} • Generated: {new Date().toLocaleDateString()} • Analyst: analyst@org.com
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <RiskBadge level={currentFairness.fairnessScore > 70 ? "Low" : currentFairness.fairnessScore > 40 ? "Medium" : "High"} />
                  <span style={{ fontSize: 12, color: C.textDim }}>Overall Risk Assessment</span>
                </div>
              </div>

              {/* Sections */}
              {[
                {
                  title: "1. Executive Summary", content: `This audit identified ${mitigated ? "moderate (post-mitigation)" : "significant"} bias in the loan approval model. The fairness score is ${currentFairness.fairnessScore}/100. Key findings: demographic parity difference of ${currentFairness.demographicParity.value} and disparate impact ratio of ${currentFairness.disparateImpact.value}.`
                },
                {
                  title: "2. Dataset Analysis", content: "1,000 records, 8 features. Detected class imbalance (62/38), group imbalance across gender and caste. 25 missing values (2.5%). Strong proxy correlations: income ↔ caste (r=0.61)."
                },
                {
                  title: "3. Model Performance", content: `Logistic Regression: Accuracy 82.4%, F1 0.79. Decision Tree: Accuracy 79.1%, F1 0.76. ${mitigated ? "Post-mitigation accuracy: 80.1% (minor trade-off for significantly improved fairness)." : ""}`
                },
                {
                  title: "4. Fairness Metrics", content: `Demographic Parity: ${currentFairness.demographicParity.value} (${currentFairness.demographicParity.risk}). Equal Opportunity: ${currentFairness.equalOpportunity.value} (${currentFairness.equalOpportunity.risk}). Disparate Impact: ${currentFairness.disparateImpact.value} (${currentFairness.disparateImpact.risk}).`
                },
                {
                  title: "5. Recommendations", content: "1. Apply dataset reweighing before production. 2. Implement threshold adjustment per demographic group. 3. Monitor income feature as high-risk proxy. 4. Conduct quarterly bias audits. 5. Establish human review for borderline decisions."
                },
              ].map(s => (
                <div key={s.title} style={{ marginBottom: 16, padding: 14, background: C.surface, borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.7 }}>{s.content}</div>
                </div>
              ))}

              {/* Audit Log */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>6. Audit Log</div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {auditLog.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: 16 }}>No actions logged yet</div>
                  ) : (
                    auditLog.map((log, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                        <span style={{ color: C.textMuted, fontFamily: "monospace", minWidth: 70 }}>{log.time}</span>
                        <span style={{ color: C.textDim }}>{log.user}</span>
                        <span style={{ color: C.text }}>{log.action}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button style={{
                  padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
                  color: C.bg, fontWeight: 700, fontSize: 13,
                  boxShadow: `0 4px 20px ${C.accent}44`,
                }}
                  onClick={() => { addLog("Exported PDF report"); alert("PDF export would download in production. Report generated successfully!"); }}
                >
                  📥 Download PDF Report
                </button>
                <button style={{
                  padding: "12px 24px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${C.border}`, background: C.surface,
                  color: C.textDim, fontWeight: 600, fontSize: 13,
                }}
                  onClick={() => { addLog("Exported CSV results"); alert("CSV export would download in production."); }}
                >
                  📊 Export CSV Results
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
