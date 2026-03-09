import { useState, useEffect, useRef, useCallback } from "react";

// ─── PALETTE & THEME ────────────────────────────────────────────────────────
const C = {
  bg: "#060810",
  surface: "#0d1117",
  border: "#1a2235",
  accent: "#00d4ff",
  accent2: "#7c3aed",
  accent3: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
  text: "#e2e8f0",
  muted: "#64748b",
  card: "#0f1623",
};

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const SCENARIOS = {
  CSE: [
    {
      id: "cse-1",
      title: "P0 Incident: API Latency Spike",
      difficulty: "Hard",
      time: 900,
      domain: "Backend Engineering",
      description:
        "Production API response times have spiked from 120ms to 8400ms. 40,000 concurrent users are affected. The on-call alert fired 3 minutes ago. You are the senior engineer on duty.",
      objective:
        "Diagnose the root cause, implement a fix, and draft an incident report for stakeholders.",
      logs: [
        "[08:42:03] ERROR  db-pool: connection timeout after 5000ms (pool exhausted)",
        "[08:42:03] WARN   redis: cache miss rate 97.3% (threshold: 20%)",
        "[08:42:04] ERROR  api/v2/users: timeout 8421ms (threshold: 2000ms)",
        "[08:42:05] INFO   autoscaler: adding 3 instances (CPU 94%)",
        "[08:42:06] ERROR  db-pool: 0/50 connections available",
        "[08:42:07] ERROR  health-check: /api/v2/orders FAILED (503)",
        "[08:42:09] WARN   rate-limiter: 12,400 requests queued",
        "[08:42:11] ERROR  db-replica-1: replication lag 47s",
        "[08:42:14] INFO   deploy: v2.3.1 → v2.3.2 completed 08:38:00",
      ],
      clientMessages: [
        {
          from: "Sarah Chen (VP Engineering)",
          time: "08:43",
          msg: "We have a P0. Revenue impact is $12k/minute. What's the status?",
        },
        {
          from: "Mike Torres (CTO)",
          time: "08:44",
          msg: "Board meeting in 90 mins. I need a root cause in 10 minutes.",
        },
        {
          from: "Alert Bot",
          time: "08:45",
          msg: "Error rate crossed 40%. Auto-rollback threshold reached.",
        },
      ],
      tags: ["debugging", "databases", "incident-response"],
    },
    {
      id: "cse-2",
      title: "Security Breach: Unauthorized Data Access",
      difficulty: "Hard",
      time: 1200,
      domain: "Cybersecurity",
      description:
        "SIEM alerts show 2.3M records were exfiltrated from the user database in the last 6 hours. The attack vector is unknown. You are the lead security engineer.",
      objective:
        "Identify the breach vector, contain the threat, and prepare a customer disclosure notice.",
      logs: [
        "[02:14:07] INFO   auth: successful login admin@company.com from 185.220.101.47",
        "[02:14:12] WARN   api: unusual bulk export /api/admin/users?limit=999999",
        "[02:14:13] INFO   export: 500,000 records exported CSV format",
        "[02:16:44] INFO   export: 500,000 records exported CSV format",
        "[04:33:01] WARN   waf: SQL injection pattern detected (blocked)",
        "[06:01:22] ALERT  dlp: PII data leaving network boundary 2.3GB",
        "[06:01:25] INFO   cloudtrail: S3 bucket policy modified by root",
        "[06:02:01] ERROR  cloudtrail: logging disabled for us-east-1",
      ],
      clientMessages: [
        {
          from: "Legal (Jennifer Walsh)",
          time: "09:01",
          msg: "GDPR requires 72hr breach notification. Clock started 3hrs ago.",
        },
        {
          from: "CISO (Raj Patel)",
          time: "09:03",
          msg: "Forensics team is standing by. What's the blast radius?",
        },
      ],
      tags: ["security", "forensics", "compliance"],
    },
  ],
  Business: [
    {
      id: "biz-1",
      title: "Market Crash: Portfolio Defense",
      difficulty: "Medium",
      time: 900,
      domain: "Finance & Strategy",
      description:
        "Global markets dropped 8% in 2 hours following a surprise Fed announcement. Your firm manages $2.4B in assets. Risk exposure is critical. You are the portfolio manager.",
      objective:
        "Reallocate assets, communicate with high-value clients, and prepare a board memo.",
      logs: [
        "[09:31:00] MARKET  S&P 500: -8.3% | VIX: +142% (67.4)",
        "[09:31:02] ALERT   Portfolio hedge ratio: 0.12 (target: 0.45)",
        "[09:31:05] INFO    Client A (Exposure: $340M) calling...",
        "[09:32:00] MARKET  Tech sector: -11.2% | Energy: -6.7%",
        "[09:33:00] RISK    Margin call triggered: $45M required in 4 hours",
        "[09:34:00] NEWS    Fed: emergency rate hike 75bps announced",
      ],
      clientMessages: [
        {
          from: "David Park (Institutional Client, $340M AUM)",
          time: "09:33",
          msg: "What is our current exposure? Should we liquidate tech positions?",
        },
        {
          from: "Board Chairman",
          time: "09:35",
          msg: "Emergency board call in 20 minutes. Prepare recommendation.",
        },
      ],
      tags: ["finance", "risk-management", "communication"],
    },
  ],
};

const SAMPLE_FEEDBACK = {
  technical: 82,
  communication: 76,
  decision: 88,
  overall: 82,
  strengths: [
    "Correctly identified DB connection pool exhaustion as root cause within 3 minutes",
    "Prioritized stakeholder communication while simultaneously working the problem",
    "Proposed horizontal scaling + connection pooling fix — industry-standard approach",
  ],
  weaknesses: [
    "Redis cache strategy not addressed — cache stampede is likely secondary issue",
    "Incident report lacked SLO impact metrics",
    "Did not mention rollback of v2.3.2 deployment as immediate mitigation",
  ],
  roadmap: [
    "Study distributed systems failure modes (Brendan Gregg's USE method)",
    "Practice structured incident communication (PagerDuty ICS framework)",
    "Complete Redis caching patterns module in your learning path",
  ],
};

// ─── TINY COMPONENTS ─────────────────────────────────────────────────────────
const Badge = ({ label, color = C.accent }) => (
  <span
    style={{
      background: color + "18",
      border: `1px solid ${color}40`,
      color,
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
    }}
  >
    {label}
  </span>
);

const GlowBar = ({ value, color = C.accent, label }) => (
  <div style={{ marginBottom: 14 }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        color: C.muted,
        marginBottom: 5,
      }}
    >
      <span>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}%</span>
    </div>
    <div
      style={{
        height: 5,
        background: "#1a2235",
        borderRadius: 99,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${value}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          boxShadow: `0 0 12px ${color}60`,
          borderRadius: 99,
          transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  </div>
);

const Card = ({ children, style = {}, glow }) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${glow ? glow + "40" : C.border}`,
      borderRadius: 12,
      padding: 20,
      boxShadow: glow ? `0 0 30px ${glow}12` : "none",
      ...style,
    }}
  >
    {children}
  </div>
);

const Chip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? C.accent + "20" : "transparent",
      border: `1px solid ${active ? C.accent : C.border}`,
      color: active ? C.accent : C.muted,
      borderRadius: 8,
      padding: "6px 14px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.2s",
    }}
  >
    {label}
  </button>
);

// ─── MINI SPARKLINE ──────────────────────────────────────────────────────────
const Sparkline = ({ data, color = C.accent, width = 120, height = 40 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
    )
    .join(" ");
  return (
    <svg width={width} height={height}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
};

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "Student" });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          opacity: 0.3,
        }}
      />
      {/* Glow orbs */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "15%",
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${C.accent}15 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          right: "10%",
          width: 300,
          height: 300,
          background: `radial-gradient(circle, ${C.accent2}15 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", width: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              ◈
            </div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: C.text,
                letterSpacing: -0.5,
              }}
            >
              Industry<span style={{ color: C.accent }}>Mirror</span>
            </span>
          </div>
          <p style={{ color: C.muted, fontSize: 13 }}>
            AI-Powered Immersive Skill Simulation
          </p>
        </div>

        <Card style={{ padding: 32 }}>
          {/* Mode toggle */}
          <div
            style={{
              display: "flex",
              background: "#060810",
              borderRadius: 8,
              padding: 3,
              marginBottom: 24,
            }}
          >
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 6,
                  border: "none",
                  background: mode === m ? C.accent + "20" : "transparent",
                  color: mode === m ? C.accent : C.muted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 6, letterSpacing: 1 }}>
                FULL NAME
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Arjun Sharma"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 6, letterSpacing: 1 }}>
              EMAIL
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@university.edu"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: mode === "signup" ? 16 : 24 }}>
            <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 6, letterSpacing: 1 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 6, letterSpacing: 1 }}>
                ROLE
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option>Student</option>
                <option>Admin</option>
                <option>College Placement Officer</option>
              </select>
            </div>
          )}

          <button
            onClick={() =>
              onLogin({
                name: form.name || "Arjun Sharma",
                email: form.email || "arjun@iit.edu",
                role: form.role,
              })
            }
            style={{
              width: "100%",
              padding: "12px 0",
              background: `linear-gradient(135deg, ${C.accent}dd, ${C.accent2}dd)`,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: 0.5,
              boxShadow: `0 4px 20px ${C.accent}30`,
            }}
          >
            {mode === "login" ? "→ ENTER PLATFORM" : "→ CREATE ACCOUNT"}
          </button>
        </Card>

        <p style={{ textAlign: "center", color: C.muted, fontSize: 11, marginTop: 16 }}>
          Demo: Click enter without filling form
        </p>
      </div>
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "#060810",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  fontSize: 13,
  fontFamily: "'IBM Plex Mono', monospace",
  outline: "none",
  boxSizing: "border-box",
};

// ─── ONBOARDING ──────────────────────────────────────────────────────────────
const Onboarding = ({ user, onComplete }) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    branch: "",
    skills: [],
    level: "",
  });

  const branches = ["CSE", "ECE", "Mechanical", "Business", "Data Science", "Cybersecurity"];
  const skillOptions = ["AI/ML", "Web Development", "Cybersecurity", "Cloud", "Data Science", "Finance"];
  const levels = ["Beginner", "Intermediate", "Advanced"];

  const steps = [
    {
      title: "Select Your Branch",
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {branches.map((b) => (
            <button
              key={b}
              onClick={() => setProfile({ ...profile, branch: b })}
              style={{
                padding: "10px 20px",
                background: profile.branch === b ? C.accent + "25" : "transparent",
                border: `1px solid ${profile.branch === b ? C.accent : C.border}`,
                borderRadius: 8,
                color: profile.branch === b ? C.accent : C.text,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {b}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Your Skill Interests",
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {skillOptions.map((s) => {
            const active = profile.skills.includes(s);
            return (
              <button
                key={s}
                onClick={() =>
                  setProfile({
                    ...profile,
                    skills: active
                      ? profile.skills.filter((x) => x !== s)
                      : [...profile.skills, s],
                  })
                }
                style={{
                  padding: "10px 20px",
                  background: active ? C.accent2 + "25" : "transparent",
                  border: `1px solid ${active ? C.accent2 : C.border}`,
                  borderRadius: 8,
                  color: active ? "#a78bfa" : C.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {active ? "✓ " : ""}{s}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Experience Level",
      content: (
        <div style={{ display: "flex", gap: 14 }}>
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => setProfile({ ...profile, level: l })}
              style={{
                flex: 1,
                padding: "20px",
                background: profile.level === l ? C.accent3 + "20" : "transparent",
                border: `1px solid ${profile.level === l ? C.accent3 : C.border}`,
                borderRadius: 10,
                color: profile.level === l ? C.accent3 : C.text,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "center",
              }}
            >
              {l === "Beginner" ? "🌱" : l === "Intermediate" ? "⚡" : "🔥"}
              <div style={{ marginTop: 8 }}>{l}</div>
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div style={{ width: 560 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <Badge label={`Step ${step + 1} of ${steps.length}`} color={C.accent} />
          <h2
            style={{
              color: C.text,
              fontSize: 24,
              fontWeight: 700,
              marginTop: 16,
              marginBottom: 4,
            }}
          >
            {steps[step].title}
          </h2>
          <p style={{ color: C.muted, fontSize: 13 }}>
            Building your personalized simulation environment
          </p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 99,
                background: i <= step ? C.accent : C.border,
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        <Card style={{ padding: 28, marginBottom: 20 }}>
          {steps[step].content}
        </Card>

        <div style={{ display: "flex", gap: 12 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                padding: "12px 24px",
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.muted,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < steps.length - 1) setStep(step + 1);
              else onComplete({ ...profile, branch: profile.branch || "CSE", level: profile.level || "Intermediate" });
            }}
            style={{
              flex: 1,
              padding: "12px 0",
              background: `linear-gradient(135deg, ${C.accent}cc, ${C.accent2}cc)`,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {step < steps.length - 1 ? "Continue →" : "Launch Platform →"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── SIMULATION INTERFACE ─────────────────────────────────────────────────────
const SimulationInterface = ({ scenario, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(scenario.time);
  const [response, setResponse] = useState("");
  const [clientReply, setClientReply] = useState("");
  const [decision, setDecision] = useState(null);
  const [tab, setTab] = useState("task");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [chatHistory, setChatHistory] = useState([
    { from: "sys", msg: "Simulation environment initialized. Clock started." },
  ]);
  const logRef = useRef(null);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [result]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const urgency = timeLeft < 120 ? C.danger : timeLeft < 300 ? C.warn : C.accent3;

  const handleSubmit = async (timedOut = false) => {
    setLoading(true);
    const prompt = `You are an expert evaluator for an industry simulation platform.

Scenario: "${scenario.title}"
Domain: ${scenario.domain}
Student's technical response: "${response || "(no technical response provided)"}"
Student's client reply: "${clientReply || "(none)"}"
Student's decision choice: ${decision !== null ? ["Rollback immediately", "Scale horizontally", "Investigate further"][decision] : "(none)"}
Time used: ${scenario.time - timeLeft}s of ${scenario.time}s
Timed out: ${timedOut}

Evaluate and respond in this exact JSON format:
{
  "technical": <0-100>,
  "communication": <0-100>,
  "decision": <0-100>,
  "overall": <0-100>,
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "roadmap": ["...", "...", "..."],
  "verdict": "one sentence professional summary"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((b) => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch {
      setResult(SAMPLE_FEEDBACK);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16, animation: "spin 1s linear infinite" }}>◈</div>
          <p style={{ color: C.accent, fontSize: 14 }}>AI Evaluation Engine Processing...</p>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Analyzing technical accuracy, communication & decision quality</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono', monospace", padding: 32 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Badge label="Simulation Complete" color={C.accent3} />
            <h2 style={{ color: C.text, fontSize: 28, fontWeight: 700, margin: "16px 0 4px" }}>
              Performance Report
            </h2>
            <p style={{ color: C.muted, fontSize: 13 }}>{scenario.title}</p>
          </div>

          {/* Score ring row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { label: "Overall", val: result.overall, color: C.accent },
              { label: "Technical", val: result.technical, color: C.accent2 },
              { label: "Communication", val: result.communication, color: C.accent3 },
              { label: "Decision Making", val: result.decision, color: C.warn },
            ].map(({ label, val, color }) => (
              <Card key={label} glow={color} style={{ textAlign: "center", padding: "20px 16px" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 6, letterSpacing: 1 }}>{label.toUpperCase()}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <Card>
              <h3 style={{ color: C.accent3, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>✓ STRENGTHS</h3>
              {(result.strengths || []).map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                  <span style={{ color: C.accent3, marginTop: 2 }}>▸</span>
                  <span style={{ color: C.text, fontSize: 12, lineHeight: 1.6 }}>{s}</span>
                </div>
              ))}
            </Card>
            <Card>
              <h3 style={{ color: C.warn, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>⚠ IMPROVEMENT AREAS</h3>
              {(result.weaknesses || []).map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                  <span style={{ color: C.warn, marginTop: 2 }}>▸</span>
                  <span style={{ color: C.text, fontSize: 12, lineHeight: 1.6 }}>{s}</span>
                </div>
              ))}
            </Card>
          </div>

          <Card style={{ marginBottom: 20 }}>
            <h3 style={{ color: C.accent, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>◈ PERSONALIZED ROADMAP</h3>
            {(result.roadmap || []).map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                <span style={{ color: C.accent, fontWeight: 700, fontSize: 11, minWidth: 20 }}>0{i + 1}</span>
                <span style={{ color: C.text, fontSize: 12, lineHeight: 1.6 }}>{s}</span>
              </div>
            ))}
          </Card>

          {result.verdict && (
            <Card style={{ marginBottom: 28, borderColor: C.accent + "30", background: C.accent + "08" }}>
              <p style={{ color: C.accent, fontSize: 13, fontStyle: "italic", margin: 0 }}>
                "{result.verdict}"
              </p>
            </Card>
          )}

          <button
            onClick={onComplete}
            style={{
              width: "100%",
              padding: "14px 0",
              background: `linear-gradient(135deg, ${C.accent}cc, ${C.accent2}cc)`,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            → Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // MAIN SIM UI
  const tabs = ["task", "logs", "messages", "respond", "decide"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono', monospace", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>◈ SIMULATION ACTIVE</span>
          <Badge label={scenario.difficulty} color={scenario.difficulty === "Hard" ? C.danger : scenario.difficulty === "Medium" ? C.warn : C.accent3} />
          <Badge label={scenario.domain} color={C.accent2} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: urgency, fontVariantNumeric: "tabular-nums", letterSpacing: 2 }}>
            {fmt(timeLeft)}
          </div>
          <button
            onClick={() => handleSubmit(false)}
            style={{
              padding: "8px 18px",
              background: C.accent3 + "20",
              border: `1px solid ${C.accent3}`,
              borderRadius: 6,
              color: C.accent3,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            SUBMIT →
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr", gap: 0 }}>
        {/* Left nav */}
        <div style={{ background: C.surface, borderRight: `1px solid ${C.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, marginBottom: 8 }}>WORKSPACE</div>
          {[
            { id: "task", icon: "📋", label: "Task Brief" },
            { id: "logs", icon: "🖥", label: "System Logs" },
            { id: "messages", icon: "✉️", label: "Client Messages" },
            { id: "respond", icon: "✏️", label: "Your Response" },
            { id: "decide", icon: "⚡", label: "Decision Panel" },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                background: tab === id ? C.accent + "18" : "transparent",
                border: `1px solid ${tab === id ? C.accent + "40" : "transparent"}`,
                borderRadius: 7,
                color: tab === id ? C.accent : C.muted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}

          <div style={{ marginTop: "auto", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 }}>TEAM CHAT</div>
            {chatHistory.slice(-3).map((c, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: C.muted }}>{c.from}</div>
                <div style={{ fontSize: 10, color: C.text, lineHeight: 1.4 }}>{c.msg}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input
                placeholder="msg team..."
                style={{ ...inputStyle, fontSize: 10, padding: "5px 8px", flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    setChatHistory([...chatHistory, { from: "you", msg: e.target.value }]);
                    e.target.value = "";
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div style={{ padding: 24, overflowY: "auto" }}>
          {tab === "task" && (
            <div>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{scenario.title}</h2>
              <p style={{ color: C.muted, fontSize: 12, marginBottom: 24 }}>{scenario.domain} · {fmt(scenario.time)} simulation</p>
              <Card style={{ marginBottom: 20, borderColor: C.accent + "30" }}>
                <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 10 }}>SITUATION</div>
                <p style={{ color: C.text, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{scenario.description}</p>
              </Card>
              <Card style={{ borderColor: C.accent3 + "30" }}>
                <div style={{ fontSize: 11, color: C.accent3, letterSpacing: 1, marginBottom: 10 }}>OBJECTIVE</div>
                <p style={{ color: C.text, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{scenario.objective}</p>
              </Card>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                {scenario.tags.map((t) => <Badge key={t} label={t} color={C.muted} />)}
              </div>
            </div>
          )}

          {tab === "logs" && (
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, marginBottom: 12 }}>SYSTEM LOGS — REAL TIME</div>
              <div
                ref={logRef}
                style={{
                  background: "#04060c",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 20,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  lineHeight: 2,
                  maxHeight: "65vh",
                  overflowY: "auto",
                }}
              >
                {scenario.logs.map((log, i) => {
                  const isErr = log.includes("ERROR");
                  const isWarn = log.includes("WARN") || log.includes("ALERT");
                  return (
                    <div key={i} style={{ color: isErr ? C.danger : isWarn ? C.warn : "#4ade80" }}>
                      {log}
                    </div>
                  );
                })}
                <div style={{ color: C.accent, animation: "blink 1s step-end infinite" }}>█</div>
              </div>
            </div>
          )}

          {tab === "messages" && (
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, marginBottom: 16 }}>INCOMING MESSAGES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {scenario.clientMessages.map((m, i) => (
                  <Card key={i} style={{ borderLeft: `3px solid ${i === 0 ? C.danger : i === 1 ? C.warn : C.accent}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: C.text, fontWeight: 700, fontSize: 12 }}>{m.from}</span>
                      <span style={{ color: C.muted, fontSize: 11 }}>{m.time}</span>
                    </div>
                    <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{m.msg}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tab === "respond" && (
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, marginBottom: 16 }}>YOUR RESPONSE</div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: C.accent, letterSpacing: 1, display: "block", marginBottom: 8 }}>
                  TECHNICAL SOLUTION / CODE / ANALYSIS
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Write your technical solution, code changes, or analysis here..."
                  style={{
                    ...inputStyle,
                    minHeight: 200,
                    resize: "vertical",
                    lineHeight: 1.7,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.accent2, letterSpacing: 1, display: "block", marginBottom: 8 }}>
                  CLIENT / STAKEHOLDER REPLY
                </label>
                <textarea
                  value={clientReply}
                  onChange={(e) => setClientReply(e.target.value)}
                  placeholder="Write your professional reply to the stakeholders..."
                  style={{
                    ...inputStyle,
                    minHeight: 120,
                    resize: "vertical",
                    lineHeight: 1.7,
                  }}
                />
              </div>
            </div>
          )}

          {tab === "decide" && (
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, marginBottom: 16 }}>CRITICAL DECISION POINT</div>
              <Card style={{ marginBottom: 20 }}>
                <p style={{ color: C.text, fontSize: 13, lineHeight: 1.7 }}>
                  Based on your analysis of the system logs and stakeholder messages, what is your immediate recommended action?
                </p>
              </Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Rollback to v2.3.1 immediately", desc: "Revert the recent deployment to restore service stability. Fastest path to recovery but may miss root cause." },
                  { label: "Scale horizontally + increase DB pool", desc: "Add more application instances and expand database connection pool. Addresses symptoms without rollback." },
                  { label: "Investigate further before acting", desc: "Gather more data from all system metrics before making any changes. Risk: extended downtime." },
                ].map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setDecision(i)}
                    style={{
                      padding: 16,
                      background: decision === i ? C.accent + "15" : "transparent",
                      border: `1px solid ${decision === i ? C.accent : C.border}`,
                      borderRadius: 10,
                      color: C.text,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `2px solid ${decision === i ? C.accent : C.border}`,
                        background: decision === i ? C.accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, color: "#fff",
                      }}>
                        {decision === i ? "✓" : ""}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: decision === i ? C.accent : C.text }}>
                        {String.fromCharCode(65 + i)}. {opt.label}
                      </span>
                    </div>
                    <p style={{ color: C.muted, fontSize: 11, margin: 0, paddingLeft: 28, lineHeight: 1.6 }}>{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── SCENARIO BROWSER ─────────────────────────────────────────────────────────
const ScenarioBrowser = ({ profile, onStart, onGenerate }) => {
  const [generating, setGenerating] = useState(false);
  const [aiScenario, setAiScenario] = useState(null);
  const [filter, setFilter] = useState("All");

  const allScenarios = [...(SCENARIOS.CSE || []), ...(SCENARIOS.Business || [])];

  const handleGenerate = async () => {
    setGenerating(true);
    const prompt = `Generate a realistic industry simulation scenario for a ${profile.level} ${profile.branch} student interested in ${profile.skills.join(", ")}.

Return ONLY this JSON:
{
  "id": "gen-1",
  "title": "<scenario title>",
  "difficulty": "${profile.level === 'Beginner' ? 'Easy' : profile.level === 'Intermediate' ? 'Medium' : 'Hard'}",
  "time": ${profile.level === 'Beginner' ? 600 : profile.level === 'Intermediate' ? 900 : 1200},
  "domain": "<domain>",
  "description": "<2-3 sentence realistic workplace scenario>",
  "objective": "<1-2 sentence clear task objective>",
  "logs": ["<log line 1>", "<log line 2>", "<log line 3>", "<log line 4>", "<log line 5>"],
  "clientMessages": [
    {"from": "<name and role>", "time": "<HH:MM>", "msg": "<urgent message>"},
    {"from": "<name and role>", "time": "<HH:MM>", "msg": "<follow up>"}
  ],
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((b) => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAiScenario(parsed);
    } catch {
      setAiScenario(null);
    }
    setGenerating(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>Simulation Library</h2>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Choose a scenario or generate one with AI</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            padding: "10px 20px",
            background: generating ? C.border : `linear-gradient(135deg, ${C.accent2}cc, ${C.accent}cc)`,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: generating ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {generating ? "⚙ Generating..." : "◈ AI Generate Scenario"}
        </button>
      </div>

      {aiScenario && (
        <Card glow={C.accent2} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <Badge label="AI Generated" color={C.accent2} />
                <Badge label={aiScenario.difficulty} color={C.warn} />
                <Badge label={aiScenario.domain} color={C.accent} />
              </div>
              <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{aiScenario.title}</h3>
              <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{aiScenario.description}</p>
            </div>
            <button
              onClick={() => onStart(aiScenario)}
              style={{
                marginLeft: 20,
                padding: "10px 20px",
                background: C.accent2 + "25",
                border: `1px solid ${C.accent2}`,
                borderRadius: 8,
                color: "#a78bfa",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              Start →
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {allScenarios.map((sc) => (
          <Card key={sc.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge label={sc.difficulty} color={sc.difficulty === "Hard" ? C.danger : sc.difficulty === "Medium" ? C.warn : C.accent3} />
              <Badge label={sc.domain} color={C.accent} />
            </div>
            <h3 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{sc.title}</h3>
            <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{sc.description.slice(0, 100)}...</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sc.tags.map((t) => <Badge key={t} label={t} color={C.muted} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.muted, fontSize: 11 }}>⏱ {Math.floor(sc.time / 60)} min</span>
              <button
                onClick={() => onStart(sc)}
                style={{
                  padding: "7px 16px",
                  background: C.accent + "20",
                  border: `1px solid ${C.accent + "50"}`,
                  borderRadius: 6,
                  color: C.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Launch →
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── ANALYTICS DASHBOARD ──────────────────────────────────────────────────────
const Analytics = ({ profile }) => {
  const sparkData = [62, 58, 71, 74, 69, 80, 76, 82, 85, 82];
  const skills = [
    { label: "Problem Solving", val: 82, color: C.accent },
    { label: "Technical Ability", val: 76, color: C.accent2 },
    { label: "Communication", val: 68, color: C.accent3 },
    { label: "Decision Making", val: 88, color: C.warn },
  ];

  return (
    <div>
      <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Skill Analytics</h2>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 28 }}>Your performance across all simulations</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Simulations", val: "7", icon: "◈", color: C.accent },
          { label: "Avg Score", val: "78", icon: "◆", color: C.accent3 },
          { label: "Industry Ready", val: "64%", icon: "▲", color: C.warn },
          { label: "Rank", val: "#12", icon: "★", color: C.accent2 },
        ].map(({ label, val, icon, color }) => (
          <Card key={label} glow={color}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color }}>{val}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{label}</div>
              </div>
              <span style={{ fontSize: 20, color: color + "60" }}>{icon}</span>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0 }}>Performance Trend</h3>
            <Sparkline data={sparkData} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sparkData.map((v, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, color: C.muted, width: 60 }}>Sim #{i + 1}</span>
                <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${v}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent}80, ${C.accent})`, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 10, color: C.accent, width: 28 }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: "0 0 20px" }}>Skill Map</h3>
          {skills.map((s) => <GlowBar key={s.label} {...s} />)}
        </Card>
      </div>

      <Card>
        <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: "0 0 16px" }}>Recent Simulations</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { name: "P0 Incident: API Latency Spike", date: "Mar 8", score: 82, domain: "Backend" },
            { name: "Security Breach: Unauthorized Access", date: "Mar 6", score: 74, domain: "Security" },
            { name: "Database Optimization Challenge", date: "Mar 3", score: 88, domain: "Data" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#060810", borderRadius: 8 }}>
              <div>
                <div style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{s.domain} · {s.date}</div>
              </div>
              <div style={{
                padding: "4px 12px",
                background: s.score >= 80 ? C.accent3 + "20" : s.score >= 70 ? C.warn + "20" : C.danger + "20",
                border: `1px solid ${s.score >= 80 ? C.accent3 : s.score >= 70 ? C.warn : C.danger}50`,
                borderRadius: 20,
                color: s.score >= 80 ? C.accent3 : s.score >= 70 ? C.warn : C.danger,
                fontWeight: 700,
                fontSize: 12,
              }}>
                {s.score}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
const AdminPanel = () => {
  const students = [
    { name: "Arjun Sharma", branch: "CSE", score: 82, sims: 7, status: "Active" },
    { name: "Priya Nair", branch: "ECE", score: 74, sims: 5, status: "Active" },
    { name: "Rahul Gupta", branch: "Business", score: 91, sims: 9, status: "Active" },
    { name: "Meera Iyer", branch: "CSE", score: 65, sims: 3, status: "Inactive" },
    { name: "Aditya Joshi", branch: "Data Science", score: 88, sims: 11, status: "Active" },
  ];

  return (
    <div>
      <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Admin Console</h2>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 28 }}>Platform analytics and user management</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Students", val: "1,247", color: C.accent },
          { label: "Active Sessions", val: "89", color: C.accent3 },
          { label: "Scenarios Run", val: "8,412", color: C.accent2 },
          { label: "Avg Readiness", val: "71%", color: C.warn },
        ].map(({ label, val, color }) => (
          <Card key={label} glow={color}>
            <div style={{ fontSize: 28, fontWeight: 900, color }}>{val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0 }}>Student Performance</h3>
          <Badge label="Live" color={C.accent3} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Student", "Branch", "Avg Score", "Simulations", "Status", "Action"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, color: C.muted, letterSpacing: 1, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.name}>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: C.text, fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: C.muted }}>{s.branch}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ color: s.score >= 80 ? C.accent3 : s.score >= 70 ? C.warn : C.danger, fontWeight: 700, fontSize: 13 }}>
                      {s.score}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: C.muted }}>{s.sims}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <Badge label={s.status} color={s.status === "Active" ? C.accent3 : C.muted} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 5, color: C.muted, fontSize: 10, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
const Leaderboard = () => {
  const entries = [
    { rank: 1, name: "Aditya Joshi", score: 94, sims: 11, branch: "Data Science" },
    { rank: 2, name: "Rahul Gupta", score: 91, sims: 9, branch: "Business" },
    { rank: 3, name: "Arjun Sharma", score: 82, sims: 7, branch: "CSE" },
    { rank: 4, name: "Meera Kapoor", score: 79, sims: 8, branch: "CSE" },
    { rank: 5, name: "Priya Nair", score: 74, sims: 5, branch: "ECE" },
    { rank: 6, name: "Kiran Rao", score: 71, sims: 6, branch: "Business" },
  ];
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Leaderboard</h2>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 28 }}>Top performers this month</p>

      {/* Top 3 podium */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {entries.slice(0, 3).map((e) => (
          <Card key={e.rank} glow={e.rank === 1 ? C.warn : C.border} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{medals[e.rank - 1]}</div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{e.name}</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{e.branch}</div>
            <div style={{ color: C.warn, fontSize: 24, fontWeight: 900, marginTop: 8 }}>{e.score}</div>
          </Card>
        ))}
      </div>

      <Card>
        {entries.map((e) => (
          <div key={e.rank} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: e.rank < entries.length ? `1px solid ${C.border}` : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ color: e.rank <= 3 ? C.warn : C.muted, fontWeight: 900, fontSize: 14, width: 24 }}>
                {e.rank <= 3 ? medals[e.rank - 1] : `#${e.rank}`}
              </span>
              <div>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{e.branch} · {e.sims} simulations</div>
              </div>
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, color: e.rank === 1 ? C.warn : e.rank === 2 ? "#94a3b8" : e.rank === 3 ? "#cd7f32" : C.text }}>
              {e.score}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("auth");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeNav, setActiveNav] = useState("scenarios");
  const [activeScenario, setActiveScenario] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setScreen("onboarding");
  };

  const handleProfileComplete = (p) => {
    setProfile(p);
    setScreen("app");
  };

  const handleStartScenario = (sc) => {
    setActiveScenario(sc);
    setScreen("sim");
  };

  const handleSimComplete = () => {
    setScreen("app");
    setActiveNav("analytics");
  };

  if (screen === "auth") return <AuthScreen onLogin={handleLogin} />;
  if (screen === "onboarding") return <Onboarding user={user} onComplete={handleProfileComplete} />;
  if (screen === "sim") return <SimulationInterface scenario={activeScenario} onComplete={handleSimComplete} />;

  const navItems = [
    { id: "scenarios", icon: "◈", label: "Scenarios" },
    { id: "analytics", icon: "◆", label: "Analytics" },
    { id: "leaderboard", icon: "★", label: "Leaderboard" },
    ...(user?.role === "Admin" || user?.role === "College Placement Officer"
      ? [{ id: "admin", icon: "⚙", label: "Admin" }]
      : []),
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'IBM Plex Mono', monospace",
        display: "flex",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 99px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
        textarea, input, select { transition: border-color 0.2s; }
        textarea:focus, input:focus, select:focus { border-color: ${C.accent}80 !important; outline: none; }
      `}</style>

      {/* Sidebar */}
      <div
        style={{
          width: 200,
          background: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          padding: 20,
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{
            width: 30,
            height: 30,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}>
            ◈
          </div>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>
            Industry<span style={{ color: C.accent }}>Mirror</span>
          </span>
        </div>

        {/* User */}
        <div style={{
          padding: 12,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          marginBottom: 24,
        }}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 12 }}>{user?.name || "Arjun Sharma"}</div>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{profile?.branch} · {profile?.level}</div>
          <div style={{ marginTop: 8 }}>
            <Badge label={user?.role || "Student"} color={C.accent} />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {navItems.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                background: activeNav === id ? C.accent + "18" : "transparent",
                border: `1px solid ${activeNav === id ? C.accent + "40" : "transparent"}`,
                borderRadius: 8,
                color: activeNav === id ? C.accent : C.muted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: 4,
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setScreen("auth")}
          style={{
            padding: "8px 12px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.muted,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Sign Out
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 200, padding: 32, overflowY: "auto" }}>
        {/* Top bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <p style={{ color: C.muted, fontSize: 11, letterSpacing: 1 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge label={`${profile?.skills?.slice(0, 2).join(" · ") || "AI · Web Dev"}`} color={C.accent2} />
            <Badge label="Industry Ready: 64%" color={C.accent3} />
          </div>
        </div>

        {activeNav === "scenarios" && (
          <ScenarioBrowser
            profile={profile || { branch: "CSE", level: "Intermediate", skills: ["AI", "Web Dev"] }}
            onStart={handleStartScenario}
          />
        )}
        {activeNav === "analytics" && <Analytics profile={profile} />}
        {activeNav === "leaderboard" && <Leaderboard />}
        {activeNav === "admin" && <AdminPanel />}
      </div>
    </div>
  );
}
