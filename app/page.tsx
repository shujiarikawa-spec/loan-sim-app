"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";
import {
  Home, SlidersHorizontal, TrendingDown, Percent, CalendarDays,
  Banknote, Info, ChevronDown, ChevronUp, ArrowRightLeft,
  Zap, Building2, TreePine, Plus, Minus,
} from "lucide-react";

// ════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ════════════════════════════════════════════════════════
interface YearRow { year: number; cumPrincipal: number; cumInterest: number; balance: number; }
interface SimResult {
  totalPayment: number; totalInterest: number;
  monthlyPayments: number[];
  lineData: { year: string; balance: number }[];
  yearlyData: YearRow[];
}

function simulate(amount: number, year: number, rates: number[], prepayments: { year: number; amount: number }[] = []): SimResult {
  const principal = amount * 10000;
  let balance = principal;
  let totalPaid = 0;
  const monthlyArr: number[] = [];
  const lineArr: { year: string; balance: number }[] = [{ year: "0年", balance: Math.floor(balance / 10000) }];
  const yearlyArr: YearRow[] = [];
  const periods = Math.ceil(year / 5);
  let cumP = 0, cumI = 0;

  for (let p = 0; p < periods; p++) {
    const r = (rates[p] ?? rates[periods - 1] ?? 0.5) / 100 / 12;
    const remainMonths = (year - p * 5) * 12;
    const periodMonths = Math.min(5 * 12, remainMonths);

    for (let m = 0; m < periodMonths; m++) {
      if (balance <= 0) break;
      const rem = remainMonths - m;
      const mp = r > 0
        ? Math.floor((balance * r * Math.pow(1 + r, rem)) / (Math.pow(1 + r, rem) - 1))
        : Math.floor(balance / rem);
      const ipart = r > 0 ? Math.floor(balance * r) : 0;
      const ppart = Math.min(mp - ipart, balance);
      balance = Math.max(0, balance - ppart);
      totalPaid += mp; cumP += ppart; cumI += ipart;
      monthlyArr.push(mp);

      if (m % 12 === 11) {
        const currentYear = p * 5 + Math.floor(m / 12) + 1;
        const prep = prepayments.find(x => x.year === currentYear);
        if (prep && balance > 0) {
          const a = prep.amount * 10000;
          totalPaid += Math.min(a, balance);
          cumP += Math.min(a, balance);
          balance = Math.max(0, balance - a);
        }
        yearlyArr.push({ year: currentYear, cumPrincipal: Math.floor(cumP / 10000), cumInterest: Math.floor(cumI / 10000), balance: Math.floor(balance / 10000) });
      }
    }
    const yr = (p + 1) * 5;
    if (yr <= year) lineArr.push({ year: `${yr}年`, balance: Math.floor(balance / 10000) });
  }
  if (balance > 0) totalPaid += balance;
  if (lineArr.length > 0) lineArr[lineArr.length - 1] = { year: `${year}年`, balance: 0 };
  return { totalPayment: totalPaid, totalInterest: totalPaid - principal, monthlyPayments: monthlyArr, lineData: lineArr, yearlyData: yearlyArr };
}

// ════════════════════════════════════════════════════════
// CHART TOOLTIPS — グラフ左下に固定浮き出し
// ════════════════════════════════════════════════════════
const floatStyle: React.CSSProperties = {
  background: "rgba(250,250,248,0.96)",
  border: "1px solid #E0DAD0",
  borderRadius: 14,
  padding: "10px 14px",
  fontSize: 12,
  color: "#3D3730",
  boxShadow: "0 8px 28px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.06)",
  backdropFilter: "blur(8px)",
  pointerEvents: "none",
  animation: "tooltipPop 0.18s cubic-bezier(0.34,1.56,0.64,1) forwards",
};

const PieTooltip = ({ active, payload }: any) => active && payload?.length ? (
  <div style={{ ...floatStyle, minWidth: 130 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: payload[0].payload.fill ?? "#5C7A6B", display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontWeight: 600, fontSize: 11 }}>{payload[0].name}</span>
    </div>
    <p style={{ color: "#5C7A6B", fontWeight: 700, fontSize: 14, margin: 0 }}>{payload[0].value.toLocaleString()}<span style={{ fontSize: 10, fontWeight: 400, color: "#8C7B6B", marginLeft: 3 }}>円</span></p>
  </div>
) : null;

const AreaTooltip = ({ active, payload, label }: any) => active && payload?.length ? (
  <div style={{ ...floatStyle, minWidth: 120 }}>
    <p style={{ color: "#A89A8A", fontSize: 10, margin: "0 0 5px", letterSpacing: "0.05em" }}>{label}</p>
    {payload.map((p: any, i: number) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {p.name && <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, display: "inline-block" }} />}
        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: p.color ?? "#3D3730" }}>
          {p.name ? `${p.name}  ` : ""}{p.value?.toLocaleString()}<span style={{ fontSize: 10, fontWeight: 400, color: "#8C7B6B", marginLeft: 3 }}>万円</span>
        </p>
      </div>
    ))}
  </div>
) : null;

const CustomLegend = ({ payload }: any) => (
  <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
    {payload?.map((e: any, i: number) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8C7B6B" }}>
        <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: e.color }} />{e.value}
      </div>
    ))}
  </div>
);

// ════════════════════════════════════════════════════════
// SLIDER ROW
// ════════════════════════════════════════════════════════
function SliderRow({ icon: Icon, label, display, min, max, step = 1, value, onChange }: {
  icon: React.ElementType; label: string; display: string;
  min: number; max: number; step?: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#8C7B6B" }}>
          <Icon size={13} strokeWidth={1.8} />
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#3D3730", fontVariantNumeric: "tabular-nums" }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="nordic-slider"
        style={{ "--val": ((value - min) / (max - min)) * 100, width: "100%" } as React.CSSProperties}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ANIMATED NUMBER
// ════════════════════════════════════════════════════════
function AnimNumber({ value }: { value: number }) {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value; prev.current = to;
    if (from === to) return;
    const dur = 450, start = performance.now();
    const frame = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisp(Math.round(from + (to - from) * e));
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [value]);
  return <>{disp.toLocaleString()}</>;
}

// ════════════════════════════════════════════════════════
// WALKING FAMILY SCENE
// ════════════════════════════════════════════════════════
function WalkingFamilyScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const animDur = 8000;   // アニメーション本体 8秒
    const loopInterval = 15000; // 15秒ごとにループ

    let animId: number | null = null;
    let loopId: ReturnType<typeof setTimeout> | null = null;

    const runAnim = () => {
      setProgress(0);
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / animDur, 1);
        setProgress(t);
        if (t < 1) animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    };

    const scheduleLoop = () => {
      loopId = setTimeout(() => {
        runAnim();
        scheduleLoop();
      }, loopInterval);
    };

    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        runAnim();
        scheduleLoop();
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);

    return () => {
      obs.disconnect();
      if (animId) cancelAnimationFrame(animId);
      if (loopId) clearTimeout(loopId);
    };
  }, []);

  // 歩行アニメーション — 足を交互に振る
  const walkCycle = (t: number, offset = 0) => Math.sin((t * 20 + offset) * Math.PI) * 12;
  const armCycle = (t: number, offset = 0) => Math.sin((t * 20 + offset) * Math.PI) * 14;
  const pt = progress; // progress 0→1

  // 段階ごとに家族が増える
  const showWife = pt > 0.22;
  const showPet = pt > 0.44;
  const showChild1 = pt > 0.62;
  const showChild2 = pt > 0.80;

  // 全員で歩く水平位置 (左からゆっくり移動)
  const baseX = 60 + pt * 320;

  // 人物SVGパーツ描画ユーティリティ
  const Person = ({ x, y, scale = 1, color = "#5C7A6B", hairColor = "#3D3730", skirt = false, delay = 0 }: {
    x: number; y: number; scale?: number; color?: string; hairColor?: string; skirt?: boolean; delay?: number;
  }) => {
    const localT = Math.max(0, (pt - delay) / (1 - delay));
    const lLeg = walkCycle(localT, 0);
    const rLeg = walkCycle(localT, 1);
    const lArm = armCycle(localT, 1);
    const rArm = armCycle(localT, 0);
    const s = scale;
    return (
      <g transform={`translate(${x}, ${y}) scale(${s})`} style={{ opacity: localT > 0.01 ? 1 : 0, transition: "opacity 0.8s ease" }}>
        {/* 影 */}
        <ellipse cx={0} cy={32} rx={10 * s} ry={3 * s} fill="rgba(0,0,0,0.07)" />
        {/* 足 右 */}
        <line x1={3} y1={18} x2={3 + rLeg * 0.5} y2={32} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
        {/* 足 左 */}
        <line x1={-3} y1={18} x2={-3 + lLeg * 0.5} y2={32} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
        {/* スカート */}
        {skirt && <path d={`M -6,12 Q 0,20 6,12`} fill={color} opacity={0.5} />}
        {/* 胴体 */}
        <rect x={-5} y={2} width={10} height={16} rx={3} fill={color} />
        {/* 腕 右 */}
        <line x1={5} y1={5} x2={5 + rArm * 0.5} y2={16} stroke={color} strokeWidth={3} strokeLinecap="round" />
        {/* 腕 左 */}
        <line x1={-5} y1={5} x2={-5 + lArm * 0.5} y2={16} stroke={color} strokeWidth={3} strokeLinecap="round" />
        {/* 頭 */}
        <circle cx={0} cy={-4} r={8} fill={color} />
        {/* 髪 */}
        {skirt
          ? <path d={`M -8,-8 Q 0,-16 8,-8`} fill={hairColor} />
          : <path d={`M -8,-6 Q -6,-14 0,-13 Q 6,-14 8,-6`} fill={hairColor} />}
        {/* 目 */}
        <circle cx={-2.5} cy={-4} r={1.2} fill="rgba(255,255,255,0.9)" />
        <circle cx={2.5} cy={-4} r={1.2} fill="rgba(255,255,255,0.9)" />
      </g>
    );
  };

  // 犬
  const Pet = ({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) => {
    const localT = Math.max(0, (pt - delay) / (1 - delay));
    const tailWag = Math.sin(localT * 25 * Math.PI) * 18;
    const legF = Math.sin(localT * 22 * Math.PI) * 8;
    return (
      <g transform={`translate(${x}, ${y})`} style={{ opacity: localT > 0.01 ? 1 : 0, transition: "opacity 0.8s ease" }}>
        {/* 影 */}
        <ellipse cx={0} cy={20} rx={14} ry={2.5} fill="rgba(0,0,0,0.06)" />
        {/* 胴 */}
        <ellipse cx={0} cy={12} rx={12} ry={6} fill="#C8A96E" />
        {/* 頭 */}
        <circle cx={13} cy={8} r={7} fill="#C8A96E" />
        {/* 耳 */}
        <ellipse cx={10} cy={3} rx={3} ry={5} fill="#B8955A" transform="rotate(-15, 10, 3)" />
        <ellipse cx={16} cy={3} rx={3} ry={5} fill="#B8955A" transform="rotate(15, 16, 3)" />
        {/* 目・鼻 */}
        <circle cx={15} cy={8} r={1.5} fill="#3D3730" />
        <circle cx={17} cy={10} r={1.8} fill="#3D3730" />
        {/* 脚 */}
        <line x1={-8} y1={16} x2={-8 + legF} y2={22} stroke="#B8955A" strokeWidth={3} strokeLinecap="round" />
        <line x1={-3} y1={16} x2={-3 - legF} y2={22} stroke="#B8955A" strokeWidth={3} strokeLinecap="round" />
        <line x1={5} y1={16} x2={5 - legF} y2={22} stroke="#B8955A" strokeWidth={3} strokeLinecap="round" />
        <line x1={9} y1={16} x2={9 + legF} y2={22} stroke="#B8955A" strokeWidth={3} strokeLinecap="round" />
        {/* 尻尾 */}
        <path d={`M -12,10 Q -20,${5 + tailWag} -18,${-2 + tailWag}`} fill="none" stroke="#C8A96E" strokeWidth={3} strokeLinecap="round" />
      </g>
    );
  };

  // 家 (マイホームが現れる)
  const showHouse = pt > 0.55;
  const houseX = 560;

  return (
    <div ref={ref} style={{ width: "100%", background: "#F4F1EB", padding: "0 0 0", overflow: "hidden", position: "relative" }}>
      {/* 地面ライン */}
      <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, height: 1, background: "rgba(92,122,107,0.12)" }} />

      <svg viewBox="0 0 800 160" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EAE5DB" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#F4F1EB" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* 草・地面 */}
        <rect x="0" y="128" width="800" height="32" fill="#E8E4DC" rx="0" />
        <ellipse cx="400" cy="128" rx="400" ry="4" fill="#DDD8CE" />

        {/* 遠景の木 */}
        {[80, 200, 480, 660, 720].map((tx, i) => (
          <g key={i} style={{ opacity: pt > 0.05 + i * 0.06 ? 0.4 : 0, transition: "opacity 1s ease" }}>
            <rect x={tx - 2} y={90} width={4} height={38} fill="#8C7B6B" />
            <ellipse cx={tx} cy={85} rx={14} ry={18} fill="#7A9E8E" />
          </g>
        ))}

        {/* マイホーム */}
        <g style={{ opacity: showHouse ? 1 : 0, transition: "opacity 1.2s ease" }}>
          {/* 基礎 */}
          <rect x={houseX - 40} y={68} width={80} height={60} rx={3} fill="#FAFAF8" stroke="#D5CFBF" strokeWidth={1.5} />
          {/* 屋根 */}
          <path d={`M${houseX - 46},70 L${houseX},38 L${houseX + 46},70 Z`} fill="#5C7A6B" />
          <path d={`M${houseX - 40},70 L${houseX},42 L${houseX + 40},70 Z`} fill="#6B9080" />
          {/* 煙突 */}
          <rect x={houseX + 18} y={44} width={8} height={16} fill="#8C7B6B" />
          {/* 窓×2 */}
          <rect x={houseX - 28} y={82} width={18} height={16} rx={2} fill="#C8E0D8" stroke="#A8C4BC" strokeWidth={1} />
          <rect x={houseX + 10} y={82} width={18} height={16} rx={2} fill="#C8E0D8" stroke="#A8C4BC" strokeWidth={1} />
          {/* ドア */}
          <rect x={houseX - 8} y={100} width={16} height={28} rx={2} fill="#C8A96E" />
          <circle cx={houseX + 5} cy={115} r={2} fill="#8C7B6B" />
          {/* ★ */}
          <text x={houseX} y={32} textAnchor="middle" fontSize={14}>🏡</text>
        </g>

        {/* 人物グループ — baseXを中心に横並び */}
        {/* パパ */}
        <Person x={baseX} y={96} scale={1} color="#5C7A6B" hairColor="#3D3730" />
        {/* ママ */}
        {showWife && <Person x={baseX + 26} y={98} scale={0.92} color="#7A9E8E" hairColor="#8C7B6B" skirt delay={0.22} />}
        {/* ペット */}
        {showPet && <Pet x={baseX - 24} y={108} delay={0.44} />}
        {/* 子供1 */}
        {showChild1 && <Person x={baseX + 48} y={104} scale={0.7} color="#C8A96E" hairColor="#8C7B6B" delay={0.62} />}
        {/* 子供2 */}
        {showChild2 && <Person x={baseX + 64} y={106} scale={0.62} color="#DDB97E" hairColor="#6B5A4A" skirt delay={0.80} />}

        {/* ステージキャプション */}
        {[
          { threshold: 0.0, label: "ひとり暮らし", x: 120 },
          { threshold: 0.22, label: "ふたりの生活", x: 220 },
          { threshold: 0.44, label: "ペットと一緒に", x: 320 },
          { threshold: 0.62, label: "家族が増えた", x: 420 },
          { threshold: 0.80, label: "賑やかな毎日", x: 540 },
        ].map(({ threshold, label, x }, i) => (
          <text key={i} x={x} y={150} textAnchor="middle" fontSize={9} fill="#A89A8A"
            fontFamily="DM Sans, sans-serif" letterSpacing="0.1em"
            style={{ opacity: pt > threshold && pt < threshold + 0.25 ? 1 : 0, transition: "opacity 0.6s ease" }}>
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// LIFE LINE ANIMATION
// ════════════════════════════════════════════════════════
function LifeLineAnimation() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const animDur = 4500;
    const loopInterval = 15000;

    let animId: number | null = null;
    let loopId: ReturnType<typeof setTimeout> | null = null;

    const runAnim = () => {
      setProgress(0);
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / animDur, 1);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        setProgress(ease);
        if (t < 1) animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    };

    const scheduleLoop = () => {
      loopId = setTimeout(() => {
        runAnim();
        scheduleLoop();
      }, loopInterval);
    };

    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        runAnim();
        scheduleLoop();
        obs.disconnect();
      }
    }, { threshold: 0.2 });
    if (svgRef.current) obs.observe(svgRef.current);

    return () => {
      obs.disconnect();
      if (animId) cancelAnimationFrame(animId);
      if (loopId) clearTimeout(loopId);
    };
  }, []);

  const W = 1200, H = 160;
  const nodes = [
    { x: 60, y: 130, label: "" },
    { x: 130, y: 110, label: "誕生" },
    { x: 240, y: 90, label: "学生時代" },
    { x: 360, y: 70, label: "就職" },
    { x: 460, y: 52, label: "結婚" },
    { x: 570, y: 26, label: "🏡 マイホーム", highlight: true },
    { x: 680, y: 42, label: "子育て" },
    { x: 800, y: 36, label: "ローン完済" },
    { x: 920, y: 50, label: "老後" },
    { x: 1060, y: 60, label: "安心の余生" },
    { x: 1160, y: 68, label: "" },
  ];

  const pathD = nodes.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = nodes[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return acc + ` C ${cx} ${prev.y} ${cx} ${pt.y} ${pt.x} ${pt.y}`;
  }, "");

  return (
    <div style={{ width: "100%", background: "#F4F1EB", padding: "36px 0 24px", position: "relative", overflow: "hidden" }}>
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%", background: "#5C7A6B",
          width: 2, height: 2,
          left: `${(i * 61 + 7) % 100}%`, top: `${(i * 37 + 11) % 80}%`,
          opacity: progress > i / 20 ? 0.15 : 0, transition: "opacity 0.6s",
        }} />
      ))}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5C7A6B" stopOpacity={0.5} />
            <stop offset="48%" stopColor="#C8A96E" />
            <stop offset="100%" stopColor="#5C7A6B" stopOpacity={0.7} />
          </linearGradient>
          <filter id="glow2"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <clipPath id="clip1"><rect x="0" y="-20" width={W * progress} height={H + 40} /></clipPath>
        </defs>
        <path d={pathD} fill="none" stroke="rgba(92,122,107,0.18)" strokeWidth={3} />
        <path d={pathD} fill="none" stroke="url(#lg1)" strokeWidth={3} clipPath="url(#clip1)" filter="url(#glow2)" />

        {/* ノード */}
        {nodes.map((n, i) => {
          if (!n.label) return null;
          const nodeProgress = i / (nodes.length - 1);
          const visible = progress > nodeProgress - 0.04;
          const isH = (n as any).highlight;
          return (
            <g key={i} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}>
              {isH ? (
                <>
                  <circle cx={n.x} cy={n.y} r={14} fill="rgba(200,169,110,0.18)" />
                  <circle cx={n.x} cy={n.y} r={6} fill="#C8A96E" filter="url(#glow2)" />
                  {/* 家のシルエット */}
                  <g transform={`translate(${n.x - 10}, ${n.y - 50})`}>
                    <path d="M10,8 L0,16 L20,16 Z" fill="none" stroke="#C8A96E" strokeWidth={1.5} />
                    <rect x="3" y="16" width="14" height="11" fill="none" stroke="#C8A96E" strokeWidth={1.5} />
                    <rect x="7" y="20" width="6" height="7" fill="rgba(200,169,110,0.3)" stroke="#C8A96E" strokeWidth={1} />
                  </g>
                  <text x={n.x} y={n.y - 22} textAnchor="middle" fontSize={11} fontWeight={700} fill="#C8A96E" fontFamily="DM Serif Display, serif">{n.label}</text>
                </>
              ) : (
                <>
                  <circle cx={n.x} cy={n.y} r={3.5} fill="#5C7A6B" opacity={0.7} />
                  <text x={n.x} y={n.y - 11} textAnchor="middle" fontSize={10} fill="#8C7B6B" fontFamily="DM Sans, sans-serif">{n.label}</text>
                </>
              )}
            </g>
          );
        })}

        {/* カーソル点 */}
        {progress > 0.02 && progress < 0.97 && (() => {
          const raw = progress * (nodes.length - 1);
          const idx = Math.min(Math.floor(raw), nodes.length - 2);
          const frac = raw - idx;
          const cx = nodes[idx].x + (nodes[idx + 1].x - nodes[idx].x) * frac;
          const cy = nodes[idx].y + (nodes[idx + 1].y - nodes[idx].y) * frac;
          return (
            <g>
              <circle cx={cx} cy={cy} r={9} fill="rgba(200,169,110,0.2)" />
              <circle cx={cx} cy={cy} r={4.5} fill="#C8A96E" filter="url(#glow2)" />
            </g>
          );
        })()}
      </svg>
      <div style={{ textAlign: "center", marginTop: 6, opacity: progress > 0.85 ? 1 : 0, transition: "opacity 1s ease" }}>
        <span style={{ fontSize: 11, color: "#A89A8A", letterSpacing: "0.22em", textTransform: "uppercase" }}>
          人生は長い — マイホームが、その安心の礎となる
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function LoanSimulator() {
  const [amount, setAmount] = useState(3500);
  const [year, setYear] = useState(35);
  const periods = Math.ceil(year / 5);
  const [rates, setRates] = useState<number[]>(Array(10).fill(0.5));
  const updateRate = (idx: number, val: number) => setRates(p => { const n = [...p]; n[idx] = val; return n; });

  const [prepayments, setPrepayments] = useState<{ year: number; amount: number }[]>([]);
  const addPrepay = () => setPrepayments(p => [...p, { year: 10, amount: 100 }]);
  const removePrepay = (i: number) => setPrepayments(p => p.filter((_, j) => j !== i));
  const updatePrepay = (i: number, k: "year" | "amount", v: number) =>
    setPrepayments(p => { const n = [...p]; n[i] = { ...n[i], [k]: v }; return n; });

  const [amount2, setAmount2] = useState(3500);
  const [year2, setYear2] = useState(35);
  const [rates2, setRates2] = useState<number[]>(Array(10).fill(1.0));
  const periods2 = Math.ceil(year2 / 5);
  const updateRate2 = (idx: number, val: number) => setRates2(p => { const n = [...p]; n[idx] = val; return n; });

  const [monthlyRent, setMonthlyRent] = useState(12);
  const [rentIncrease, setRentIncrease] = useState(1);
  const [propertyValue, setPropertyValue] = useState(4000);
  const [valueChangeRate, setValueChangeRate] = useState(-0.5);

  const [tableOpen, setTableOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "compare" | "rent" | "tax">("main");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const result = useMemo(() => simulate(amount, year, rates, prepayments), [amount, year, rates, prepayments]);
  const resultNoPrepay = useMemo(() => simulate(amount, year, rates, []), [amount, year, rates]);
  const result2 = useMemo(() => simulate(amount2, year2, rates2, []), [amount2, year2, rates2]);

  const principal = amount * 10000;
  const { totalPayment, totalInterest, monthlyPayments, lineData, yearlyData } = result;
  const monthlyPayment = monthlyPayments[0] ?? 0;
  const interestRatio = totalPayment > 0 ? ((totalInterest / totalPayment) * 100).toFixed(1) : "0.0";
  const prepSaved = resultNoPrepay.totalPayment - totalPayment;
  const prepSavedYrs = resultNoPrepay.yearlyData.length - yearlyData.length;

  const pieData = [{ name: "借入元金", value: principal }, { name: "利息合計", value: totalInterest }];
  const COLORS = ["#5C7A6B", "#C8A96E"];

  const rentData = useMemo(() => {
    const maxYr = Math.max(year, 30);
    const out: { year: string; rent: number; buy: number }[] = [];
    let cr = 0, cb = 0;
    for (let y = 1; y <= maxYr; y++) {
      cr += monthlyRent * 10000 * 12 * Math.pow(1 + rentIncrease / 100, y - 1);
      cb += (monthlyPayments[(y - 1) * 12] ?? (monthlyPayments[monthlyPayments.length - 1] ?? 0)) * 12;
      if (y % 5 === 0 || y === maxYr)
        out.push({ year: `${y}年`, rent: Math.floor(cr / 10000), buy: Math.floor(cb / 10000) });
    }
    return out;
  }, [year, monthlyRent, rentIncrease, monthlyPayments]);

  const finalPropVal = propertyValue * 10000 * Math.pow(1 + valueChangeRate / 100, year);
  const lastRent = rentData[rentData.length - 1];

  // ── 住宅ローン控除・補助金 ──
  const [annualIncome, setAnnualIncome] = useState(600);   // 年収（万円）
  const [householdType, setHouseholdType] = useState<"single" | "family">("family");
  const [propertyType, setPropertyType] = useState<"certified" | "zeh" | "eco" | "general">("certified");
  const [isNewBuild, setIsNewBuild] = useState(true);
  const [entryYear, setEntryYear] = useState(2024);

  // 所得税・住民税の概算
  const taxableIncome = useMemo(() => {
    const deduction = annualIncome <= 162.5 ? 55
      : annualIncome <= 180 ? annualIncome * 0.4 - 10
        : annualIncome <= 360 ? annualIncome * 0.3 + 8
          : annualIncome <= 660 ? annualIncome * 0.2 + 44
            : annualIncome * 0.1 + 110;
    const basic = householdType === "family" ? 48 : 48;
    return Math.max(0, annualIncome - deduction - basic);
  }, [annualIncome, householdType]);

  const incomeTax = useMemo(() => {
    const ti = taxableIncome;
    if (ti <= 195) return ti * 0.05;
    if (ti <= 330) return ti * 0.1 - 9.75;
    if (ti <= 695) return ti * 0.2 - 42.75;
    if (ti <= 900) return ti * 0.23 - 63.6;
    if (ti <= 1800) return ti * 0.33 - 153.6;
    if (ti <= 4000) return ti * 0.40 - 279.6;
    return ti * 0.45 - 479.6;
  }, [taxableIncome]);

  const residentTax = useMemo(() => taxableIncome * 0.1, [taxableIncome]);

  // 住宅ローン控除の借入限度額
  const loanLimit = useMemo(() => {
    if (!isNewBuild) return entryYear <= 2025 ? 2000 : 0;
    if (propertyType === "certified") return entryYear <= 2025 ? 5000 : 4500;
    if (propertyType === "zeh") return entryYear <= 2025 ? 4500 : 3500;
    if (propertyType === "eco") return entryYear <= 2025 ? 4000 : 3000;
    return entryYear <= 2025 ? 3000 : 2000; // general
  }, [propertyType, isNewBuild, entryYear]);

  const deductionRate = 0.007; // 0.7%
  const deductionYears = isNewBuild ? 13 : 10;

  // 補助金額
  const subsidy = useMemo(() => {
    if (!isNewBuild) return 0;
    if (propertyType === "certified") return 160; // 長期優良住宅
    if (propertyType === "zeh") return 100;
    if (propertyType === "eco") return 80;
    return 0;
  }, [propertyType, isNewBuild]);

  // 年次控除シミュレーション
  const taxDeductionData = useMemo(() => {
    const rows: {
      yr: number; balance: number; maxDeduction: number;
      actualDeduction: number; cumDeduction: number;
    }[] = [];
    let cum = 0;
    const effectiveLoan = Math.min(amount, loanLimit) * 10000;
    for (let i = 1; i <= deductionYears; i++) {
      const bal = Math.floor((result.yearlyData[i - 1]?.balance ?? 0) * 10000);
      const appliedBal = Math.min(bal, effectiveLoan);
      const maxDed = Math.floor(appliedBal * deductionRate / 10000); // 万円
      // 所得税から控除（超過分は住民税から最大9.75万円）
      const fromIncomeTax = Math.min(maxDed, incomeTax);
      const remaining = maxDed - fromIncomeTax;
      const fromResidentTax = Math.min(remaining, 9.75);
      const actual = Math.floor((fromIncomeTax + fromResidentTax) * 10) / 10;
      cum += actual;
      rows.push({ yr: i, balance: Math.floor(bal / 10000), maxDeduction: maxDed, actualDeduction: actual, cumDeduction: Math.floor(cum * 10) / 10 });
    }
    return rows;
  }, [amount, loanLimit, deductionYears, result.yearlyData, incomeTax, residentTax]);

  const totalDeduction = taxDeductionData[taxDeductionData.length - 1]?.cumDeduction ?? 0;
  const totalBenefit = totalDeduction + subsidy;
  const effectiveCost = Math.floor(totalPayment / 10000) - totalDeduction + amount - subsidy - amount; // ローン分のみ

  const cardStyle = { background: "#FAFAF8", border: "1px solid #EAE5DB", borderRadius: 20 };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body, * { font-family: 'DM Sans', sans-serif; }
        .serif { font-family: 'DM Serif Display', serif; }
        .nordic-slider {
          -webkit-appearance: none; appearance: none;
          height: 3px; border-radius: 2px; outline: none; cursor: pointer; display: block;
          background: linear-gradient(to right,
            #5C7A6B 0%, #5C7A6B calc(var(--val) * 1%),
            #E0DAD0 calc(var(--val) * 1%), #E0DAD0 100%);
        }
        .nordic-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: #FAFAF8; border: 2.5px solid #5C7A6B;
          box-shadow: 0 2px 8px rgba(92,122,107,0.25);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .nordic-slider::-webkit-slider-thumb:hover { transform: scale(1.3); box-shadow: 0 4px 16px rgba(92,122,107,0.4); }
        .tab-btn { border: none; cursor: pointer; border-radius: 12px; padding: 8px 16px; font-size: 12px; font-weight: 500; letter-spacing: 0.04em; transition: all 0.2s; }
        .tab-btn.active { background: #5C7A6B; color: #fff; }
        .tab-btn:not(.active) { background: transparent; color: #8C7B6B; }
        .tab-btn:not(.active):hover { background: #F0EDE6; }
        @keyframes tooltipPop {
          from { opacity:0; transform:scale(0.88) translateY(4px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes slideUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        .slide-up { animation: slideUp 0.55s ease forwards; }
        .d1 { animation-delay:0.05s; opacity:0; }
        .d2 { animation-delay:0.13s; opacity:0; }
        .d3 { animation-delay:0.21s; opacity:0; }
        .d4 { animation-delay:0.30s; opacity:0; }
        .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
        .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.08) !important; }
        .accordion-inner { overflow: hidden; transition: max-height 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s; }
        tr.yr:hover { background: #F0EDE6 !important; }
        input[type=number] { -moz-appearance: textfield; }

        /* ── レスポンシブ ── */
        .main-grid        { display: grid; grid-template-columns: minmax(280px,380px) 1fr; gap: 20px; }
        .chart-grid       { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .compare-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .diff-grid        { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .rent-grid        { display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
        .summary-bar-grid { display: grid; grid-template-columns: 1fr 1px 1fr 1px 1fr; }
        .pill-grid        { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .rate-col-grid    { display: grid; grid-template-columns: 68px 1fr 96px; gap: 6px; }

        @media (max-width: 900px) {
          .main-grid    { grid-template-columns: 1fr; }
          .rent-grid    { grid-template-columns: 1fr; }
          .compare-grid { grid-template-columns: 1fr; }
          .diff-grid    { grid-template-columns: 1fr 1fr; }
          .rate-col-grid { grid-template-columns: 60px 1fr 80px; gap: 5px; }
        }
        @media (max-width: 640px) {
          .chart-grid       { grid-template-columns: 1fr; }
          .diff-grid        { grid-template-columns: 1fr 1fr; }
          .summary-bar-grid { grid-template-columns: 1fr 1fr; gap: 16px; }
          .summary-sep      { display: none !important; }
          .pill-grid        { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .pill-grid { grid-template-columns: 1fr 1fr; }
          .rate-col-grid { grid-template-columns: 54px 1fr 72px; gap: 4px; }
          .diff-grid { grid-template-columns: 1fr; }
        }
        .tab-nav { width: 100%; max-width: 640px; }
        .tab-label { display: inline; }
        /* インフォツールチップ */
        .info-wrap { position: relative; display: inline-flex; align-items: center; }
        .info-tip  {
          visibility: hidden; opacity: 0;
          position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
          background: #2D3B35; color: #F0EDE6; font-size: 11px; line-height: 1.7;
          border-radius: 12px; padding: 10px 14px; width: 240px; z-index: 100;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          transition: opacity 0.2s ease, visibility 0.2s ease;
          pointer-events: none;
        }
        .info-tip::after {
          content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          border: 6px solid transparent; border-top-color: #2D3B35;
        }
        .info-wrap:hover .info-tip,
        .info-wrap:focus-within .info-tip { visibility: visible; opacity: 1; }
        .info-icon { cursor: help; color: #A89A8A; transition: color 0.15s; }
        .info-icon:hover { color: #5C7A6B; }
        /* tax grid */
        .tax-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
        .tax-benefit-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 900px) {
          .tax-grid { grid-template-columns: 1fr; }
          .tax-benefit-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .tax-benefit-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 400px) {
          .tab-label { display: none; }
          .tab-btn { padding: 8px 10px; }
          .tab-nav { max-width: 100%; }
        }
        .content-wrap { max-width: 1200px; margin: 0 auto; padding: 32px 20px 80px; }
        @media (max-width: 768px) {
          .hero-section { height: 480px; }
          .content-wrap { padding: 24px 16px 60px; }
        }
        @media (max-width: 480px) {
          .hero-section { height: 360px; }
          .content-wrap { padding: 16px 12px 48px; }
        }
        input[type=number]::-webkit-inner-spin-button { opacity:0.5; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F4F1EB" }}>

        {/* ══ HERO ══ */}
        <div className="hero-section" style={{ position: "relative", overflow: "hidden" }}>
          <img src="/living-room.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", filter: "saturate(0.72) brightness(0.6)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(140deg, rgba(18,26,21,0.88) 0%, rgba(18,26,21,0.28) 55%, transparent 100%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: "clamp(28px,7vw,100px)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(0,0,0,0.44)", border: "1px solid rgba(200,169,110,0.65)", borderRadius: 100, padding: "5px 14px 5px 10px", backdropFilter: "blur(8px)", marginBottom: 24, width: "fit-content", opacity: mounted ? 1 : 0, transition: "opacity 0.6s 0.1s" }}>
              <Home size={13} strokeWidth={1.6} style={{ color: "#C8A96E" }} />
              <span style={{ color: "#E8D5A8", fontSize: 11, letterSpacing: "0.2em", fontWeight: 500, textTransform: "uppercase" }}>Housing Loan Simulator</span>
            </div>
            <h1 className="serif" style={{ color: "#FFF", fontSize: "clamp(40px,5.5vw,70px)", letterSpacing: "-0.02em", lineHeight: 1.12, textShadow: "0 2px 20px rgba(0,0,0,0.35)", margin: 0, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(18px)", transition: "opacity 0.7s 0.18s, transform 0.7s 0.18s" }}>
              未来の暮らしを<br /><em>デザインする</em>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.52)", fontSize: 14, marginTop: 20, letterSpacing: "0.06em", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.7s 0.3s, transform 0.7s 0.3s" }}>
              借入条件を設定して、あなたの返済計画をシミュレーション
            </p>
          </div>
          <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", opacity: mounted ? 0.6 : 0, transition: "opacity 1s 1s" }}>
            <div style={{ width: 1, height: 52, background: "linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)", margin: "0 auto" }} />
          </div>
        </div>

        {/* ══ CONTENT ══ */}
        <div className="content-wrap">

          {/* タブ */}
          <div className="slide-up d1 tab-nav" style={{ display: "flex", gap: 6, marginBottom: 24, background: "#FAFAF8", border: "1px solid #EAE5DB", borderRadius: 16, padding: 5 }}>
            {([
              { id: "main", Icon: Home, label: "シミュレーター" },
              { id: "compare", Icon: ArrowRightLeft, label: "プラン比較" },
              { id: "rent", Icon: Building2, label: "賃貸 vs 購入" },
              { id: "tax", Icon: Zap, label: "税制優遇" },
            ] as const).map(({ id, Icon, label }) => (
              <button key={id} className={`tab-btn${activeTab === id ? " active" : ""}`} onClick={() => setActiveTab(id)} style={{ flex: 1 }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon size={13} strokeWidth={2} /><span className="tab-label">{label}</span></span>
              </button>
            ))}
          </div>

          {/* ─── MAIN TAB ─── */}
          {activeTab === "main" && (
            <div className="main-grid">

              {/* 左 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* 条件設定 */}
                <div className="hover-lift slide-up d1" style={{ ...cardStyle, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                    <SlidersHorizontal size={14} strokeWidth={1.8} style={{ color: "#5C7A6B" }} />
                    <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#3D3730", margin: 0 }}>条件設定</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    <SliderRow icon={Banknote} label="借入金額" display={`${amount.toLocaleString()} 万円`} min={100} max={10000} step={100} value={amount} onChange={setAmount} />
                    <SliderRow icon={CalendarDays} label="返済期間" display={`${year} 年`} min={1} max={50} value={year} onChange={setYear} />

                    {/* 金利テーブル */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#8C7B6B", marginBottom: 10 }}>
                        <Percent size={13} strokeWidth={1.8} />
                        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" }}>金利（5年ごと）</span>
                      </div>
                      <div className="rate-col-grid" style={{ marginBottom: 5 }}>
                        <span /><span style={{ fontSize: 9, color: "#A89A8A", textAlign: "center" }}>金利</span><span style={{ fontSize: 9, color: "#A89A8A", textAlign: "center" }}>月返済額</span>
                      </div>
                      {Array.from({ length: periods }).map((_, i) => {
                        const s = i * 5 + 1, e2 = Math.min((i + 1) * 5, year);
                        const mp = monthlyPayments[i * 5 * 12] ?? 0;
                        return (
                          <div key={i} className="rate-col-grid" style={{ marginBottom: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "#8C7B6B", whiteSpace: "nowrap" }}>{s}〜{e2}年目</span>
                            <div style={{ position: "relative" }}>
                              <input type="number" step="0.1" min="0" max="20" value={rates[i]}
                                onChange={ev => updateRate(i, Number(ev.target.value))}
                                style={{ width: "100%", background: "#F0EDE6", border: "none", borderRadius: 9, padding: "6px 24px 6px 8px", fontSize: 12, fontWeight: 600, color: "#3D3730", outline: "none", textAlign: "right" }} />
                              <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#8C7B6B" }}>%</span>
                            </div>
                            <div style={{ background: "#5C7A6B", borderRadius: 9, padding: "6px 8px", textAlign: "right" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}><AnimNumber value={mp} /></span>
                              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>円</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 繰り上げ返済 */}
                <div className="hover-lift slide-up d2" style={{ ...cardStyle, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Zap size={13} strokeWidth={1.8} style={{ color: "#C8A96E" }} />
                      <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3D3730", margin: 0 }}>繰り上げ返済</h2>
                    </div>
                    <button onClick={addPrepay} style={{ display: "flex", alignItems: "center", gap: 4, background: "#5C7A6B", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                      <Plus size={11} strokeWidth={2} />追加
                    </button>
                  </div>
                  {prepayments.length === 0 ? (
                    <p style={{ fontSize: 11, color: "#A89A8A", textAlign: "center", padding: "10px 0", margin: 0 }}>「追加」で繰り上げ返済を設定</p>
                  ) : (
                    <>
                      {prepayments.map((pp, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, marginBottom: 6, alignItems: "center" }}>
                          <div style={{ position: "relative" }}>
                            <input type="number" min={1} max={year} value={pp.year}
                              onChange={ev => updatePrepay(i, "year", Number(ev.target.value))}
                              style={{ width: "100%", background: "#F0EDE6", border: "none", borderRadius: 9, padding: "6px 26px 6px 8px", fontSize: 12, color: "#3D3730", outline: "none" }} />
                            <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#8C7B6B" }}>年目</span>
                          </div>
                          <div style={{ position: "relative" }}>
                            <input type="number" min={1} value={pp.amount}
                              onChange={ev => updatePrepay(i, "amount", Number(ev.target.value))}
                              style={{ width: "100%", background: "#F0EDE6", border: "none", borderRadius: 9, padding: "6px 28px 6px 8px", fontSize: 12, color: "#3D3730", outline: "none" }} />
                            <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#8C7B6B" }}>万円</span>
                          </div>
                          <button onClick={() => removePrepay(i)} style={{ background: "#F0EDE6", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#8C7B6B", display: "flex", alignItems: "center" }}>
                            <Minus size={12} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                      {prepSaved > 0 && (
                        <div style={{ background: "linear-gradient(135deg,#4A6B5C,#6B9E8A)", borderRadius: 12, padding: "14px 16px", marginTop: 10 }}>
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", margin: "0 0 4px" }}>繰り上げによる節約効果</p>
                          <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}><AnimNumber value={Math.floor(prepSaved / 10000)} /> 万円 節約</p>
                          {prepSavedYrs > 0 && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", margin: "3px 0 0" }}>返済期間 {prepSavedYrs} 年短縮</p>}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* サマリーピル */}
                <div className="slide-up d3 pill-grid">
                  {[
                    { label: "返済総額", val: `${Math.floor(totalPayment / 10000).toLocaleString()} 万円`, color: "#FAFAF8", bg: "#3D3730", sub: "#BDB5AC" },
                    { label: "利息割合", val: `${interestRatio}%`, color: "#FAFAF8", bg: "#C8A96E", sub: "rgba(255,255,255,0.7)" },
                  ].map(({ label, val, color, bg, sub }) => (
                    <div key={label} className="hover-lift" style={{ background: bg, borderRadius: 14, padding: "18px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                      <p style={{ fontSize: 9, color: sub, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 5px" }}>{label}</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color, margin: 0 }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 右 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="chart-grid">
                  {/* 円グラフ */}
                  <div className="hover-lift slide-up d2" style={{ ...cardStyle, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <h3 style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8C7B6B", margin: 0 }}>支払い内訳</h3>
                      <TrendingDown size={13} strokeWidth={1.8} style={{ color: "#5C7A6B" }} />
                    </div>
                    <div style={{ position: "relative" }}>
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="44%" innerRadius={56} outerRadius={76} paddingAngle={6} dataKey="value" strokeWidth={0}>
                              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} opacity={0.9} />)}
                            </Pie>
                            <Tooltip content={<PieTooltip />} position={{ x: 0, y: 165 }} wrapperStyle={{ zIndex: 50 }} />
                            <Legend content={<CustomLegend />} verticalAlign="bottom" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ position: "absolute", top: "44%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                        <p style={{ fontSize: 10, color: "#8C7B6B", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>利息</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "#C8A96E", margin: 0 }}>{interestRatio}%</p>
                      </div>
                    </div>
                  </div>

                  {/* エリアグラフ */}
                  <div className="hover-lift slide-up d3" style={{ ...cardStyle, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <h3 style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8C7B6B", margin: 0 }}>残高推移</h3>
                      <CalendarDays size={13} strokeWidth={1.8} style={{ color: "#5C7A6B" }} />
                    </div>
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={lineData} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#5C7A6B" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="#5C7A6B" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#EAE5DB" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A89A8A" }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A89A8A" }} />
                          <Tooltip content={<AreaTooltip />} position={{ x: 0, y: 155 }} wrapperStyle={{ zIndex: 50 }} />
                          <Area type="monotone" dataKey="balance" stroke="#5C7A6B" strokeWidth={2.5} fill="url(#gG)" dot={false} activeDot={{ r: 4, fill: "#5C7A6B", stroke: "#FAFAF8", strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* サマリーバー */}
                <div className="hover-lift slide-up d4" style={{ ...cardStyle, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div className="summary-bar-grid">
                    {[
                      { label: "借入元金", val: Math.floor(principal / 10000), color: "#3D3730" }, null,
                      { label: "利息合計", val: Math.floor(totalInterest / 10000), color: "#C8A96E" }, null,
                      { label: "返済総額", val: Math.floor(totalPayment / 10000), color: "#3D3730" },
                    ].map((item, i) => item === null
                      ? <div key={i} className="summary-sep" style={{ background: "#EAE5DB", alignSelf: "stretch" }} />
                      : <div key={i} style={{ padding: "0 20px" }}>
                        <p style={{ fontSize: 9, color: "#8C7B6B", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 6px", whiteSpace: "nowrap" }}>{item.label}</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: item.color, margin: 0, whiteSpace: "nowrap" }}>
                          <AnimNumber value={item.val} /><span style={{ fontSize: 11, fontWeight: 400, color: "#8C7B6B", marginLeft: 3 }}>万円</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#A89A8A", marginBottom: 5 }}><span>元金</span><span>利息</span></div>
                    <div style={{ height: 5, background: "#EAE5DB", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(principal / totalPayment) * 100}%`, background: "linear-gradient(to right,#5C7A6B,#7A9E8E)", borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#8C7B6B", marginTop: 4 }}>
                      <span>{((principal / totalPayment) * 100).toFixed(1)}%</span><span>{interestRatio}%</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginTop: 12 }}>
                    <Info size={11} strokeWidth={1.6} style={{ color: "#A89A8A", marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 10, color: "#A89A8A", lineHeight: 1.7, margin: 0 }}>元利均等返済方式による概算。実際の返済額は金融機関にご確認ください。</p>
                  </div>
                </div>

                {/* 年次テーブル アコーディオン */}
                <div className="hover-lift slide-up d4" style={{ ...cardStyle, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <button onClick={() => setTableOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", background: "none", border: "none", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CalendarDays size={13} strokeWidth={1.8} style={{ color: "#5C7A6B" }} />
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3D3730" }}>年次返済テーブル</span>
                    </div>
                    {tableOpen ? <ChevronUp size={15} style={{ color: "#8C7B6B" }} /> : <ChevronDown size={15} style={{ color: "#8C7B6B" }} />}
                  </button>
                  <div className="accordion-inner" style={{ maxHeight: tableOpen ? 420 : 0, opacity: tableOpen ? 1 : 0, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #EAE5DB" }}>
                          {["年目", "元金累計", "利息累計", "残高"].map(h => (
                            <th key={h} style={{ padding: "8px 16px", textAlign: "right", fontSize: 9, color: "#8C7B6B", fontWeight: 500, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {yearlyData.map((row, i) => (
                          <tr key={i} className="yr" style={{ borderBottom: "1px solid #F0EDE6", background: i % 2 === 0 ? "#FAFAF8" : "#FDF9F4", transition: "background 0.15s" }}>
                            <td style={{ padding: "8px 16px", textAlign: "right", color: "#8C7B6B", fontWeight: 500 }}>{row.year}</td>
                            <td style={{ padding: "8px 16px", textAlign: "right", color: "#5C7A6B", fontWeight: 600 }}>{row.cumPrincipal.toLocaleString()} 万</td>
                            <td style={{ padding: "8px 16px", textAlign: "right", color: "#C8A96E", fontWeight: 600 }}>{row.cumInterest.toLocaleString()} 万</td>
                            <td style={{ padding: "8px 16px", textAlign: "right", color: "#3D3730", fontWeight: 700 }}>{row.balance.toLocaleString()} 万</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── COMPARE TAB ─── */}
          {activeTab === "compare" && (
            <div className="slide-up d1">
              <div className="compare-grid">
                {/* プランA */}
                <div style={{ ...cardStyle, padding: 26, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#5C7A6B", color: "#fff", borderRadius: 8, padding: "3px 12px", fontSize: 11, fontWeight: 700, marginBottom: 20 }}>プラン A</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <SliderRow icon={Banknote} label="借入金額" display={`${amount.toLocaleString()} 万円`} min={100} max={10000} step={100} value={amount} onChange={setAmount} />
                    <SliderRow icon={CalendarDays} label="返済期間" display={`${year} 年`} min={1} max={50} value={year} onChange={setYear} />
                    {Array.from({ length: periods }).map((_, i) => {
                      const s = i * 5 + 1, e2 = Math.min((i + 1) * 5, year);
                      return (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "#8C7B6B" }}>{s}〜{e2}年目</span>
                          <div style={{ position: "relative" }}>
                            <input type="number" step="0.1" min="0" max="20" value={rates[i]} onChange={ev => updateRate(i, Number(ev.target.value))}
                              style={{ width: "100%", background: "#F0EDE6", border: "none", borderRadius: 9, padding: "6px 24px 6px 8px", fontSize: 12, fontWeight: 600, color: "#3D3730", outline: "none", textAlign: "right" }} />
                            <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#8C7B6B" }}>%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ background: "#5C7A6B", borderRadius: 14, padding: "16px 20px", marginTop: 20 }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", margin: "0 0 4px" }}>月返済額（初期）</p>
                    <p style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}><AnimNumber value={monthlyPayment} /><span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>円</span></p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: "4px 0 0" }}>総支払 {Math.floor(totalPayment / 10000).toLocaleString()} 万円</p>
                  </div>
                </div>

                {/* プランB */}
                <div style={{ ...cardStyle, padding: 26, borderColor: "#C8A96E", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#C8A96E", color: "#fff", borderRadius: 8, padding: "3px 12px", fontSize: 11, fontWeight: 700, marginBottom: 20 }}>プラン B</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <SliderRow icon={Banknote} label="借入金額" display={`${amount2.toLocaleString()} 万円`} min={100} max={10000} step={100} value={amount2} onChange={setAmount2} />
                    <SliderRow icon={CalendarDays} label="返済期間" display={`${year2} 年`} min={1} max={50} value={year2} onChange={setYear2} />
                    {Array.from({ length: periods2 }).map((_, i) => {
                      const s = i * 5 + 1, e2 = Math.min((i + 1) * 5, year2);
                      return (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "#8C7B6B" }}>{s}〜{e2}年目</span>
                          <div style={{ position: "relative" }}>
                            <input type="number" step="0.1" min="0" max="20" value={rates2[i]} onChange={ev => updateRate2(i, Number(ev.target.value))}
                              style={{ width: "100%", background: "#FBF5EC", border: "none", borderRadius: 9, padding: "6px 24px 6px 8px", fontSize: 12, fontWeight: 600, color: "#3D3730", outline: "none", textAlign: "right" }} />
                            <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#8C7B6B" }}>%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ background: "#C8A96E", borderRadius: 14, padding: "16px 20px", marginTop: 20 }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", margin: "0 0 4px" }}>月返済額（初期）</p>
                    <p style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}><AnimNumber value={result2.monthlyPayments[0] ?? 0} /><span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>円</span></p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: "4px 0 0" }}>総支払 {Math.floor(result2.totalPayment / 10000).toLocaleString()} 万円</p>
                  </div>
                </div>
              </div>

              {/* 比較グラフ + 差分 */}
              <div style={{ ...cardStyle, padding: 28, marginTop: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <h3 style={{ fontSize: 11, fontWeight: 600, color: "#3D3730", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 18px" }}>残高推移 比較</h3>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#EAE5DB" />
                      <XAxis dataKey="year" type="category" allowDuplicatedCategory={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A89A8A" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A89A8A" }} />
                      <Tooltip content={<AreaTooltip />} position={{ x: 0, y: 210 }} wrapperStyle={{ zIndex: 50 }} />
                      <Line data={result.lineData} type="monotone" dataKey="balance" stroke="#5C7A6B" strokeWidth={2.5} dot={false} name="プランA" />
                      <Line data={result2.lineData} type="monotone" dataKey="balance" stroke="#C8A96E" strokeWidth={2.5} dot={false} strokeDasharray="6 3" name="プランB" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8, marginBottom: 20 }}>
                  {[{ label: "プランA", color: "#5C7A6B", dash: false }, { label: "プランB", color: "#C8A96E", dash: true }].map(({ label, color, dash }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8C7B6B" }}>
                      <svg width="20" height="3"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke={color} strokeWidth="2.5" strokeDasharray={dash ? "5 3" : "none"} /></svg>{label}
                    </div>
                  ))}
                </div>
                <div className="diff-grid">
                  {[
                    { label: "月返済額の差", val: Math.abs((result2.monthlyPayments[0] ?? 0) - monthlyPayment).toLocaleString() + "円", color: "#3D3730" },
                    { label: "総支払いの差", val: Math.abs(Math.floor((result2.totalPayment - totalPayment) / 10000)).toLocaleString() + "万円", color: result2.totalPayment > totalPayment ? "#C8A96E" : "#5C7A6B" },
                    { label: "利息の差", val: Math.abs(Math.floor((result2.totalInterest - totalInterest) / 10000)).toLocaleString() + "万円", color: "#C8A96E" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background: "#F4F1EB", borderRadius: 14, padding: "16px 18px" }}>
                      <p style={{ fontSize: 9, color: "#8C7B6B", margin: "0 0 5px", letterSpacing: "0.1em" }}>{label}</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color, margin: 0 }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── RENT TAB ─── */}
          {activeTab === "rent" && (
            <div className="slide-up d1 rent-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ ...cardStyle, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 20 }}>
                    <Building2 size={13} strokeWidth={1.8} style={{ color: "#5C7A6B" }} />
                    <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#3D3730", margin: 0 }}>賃貸の条件</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <SliderRow icon={Banknote} label="月額家賃" display={`${monthlyRent} 万円`} min={5} max={50} value={monthlyRent} onChange={setMonthlyRent} />
                    <SliderRow icon={Percent} label="家賃上昇率/年" display={`${rentIncrease}%`} min={0} max={5} step={0.5} value={rentIncrease} onChange={setRentIncrease} />
                  </div>
                </div>
                <div style={{ ...cardStyle, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 20 }}>
                    <TreePine size={13} strokeWidth={1.8} style={{ color: "#5C7A6B" }} />
                    <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#3D3730", margin: 0 }}>物件の資産価値</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <SliderRow icon={Banknote} label="購入価格" display={`${propertyValue.toLocaleString()} 万円`} min={500} max={20000} step={500} value={propertyValue} onChange={setPropertyValue} />
                    <SliderRow icon={Percent} label="年間価値変動率" display={`${valueChangeRate}%`} min={-5} max={5} step={0.5} value={valueChangeRate} onChange={setValueChangeRate} />
                  </div>
                </div>
                {/* 判定 */}
                <div style={{ background: "linear-gradient(140deg,#1E2A25,#2D3B35)", borderRadius: 20, padding: 24 }}>
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 14px" }}>{year}年後の試算</p>
                  {[
                    { label: "賃貸 累計支出", val: `${(lastRent?.rent ?? 0).toLocaleString()} 万円`, color: "#fff" },
                    { label: "購入 累計返済", val: `${(lastRent?.buy ?? 0).toLocaleString()} 万円`, color: "#C8A96E" },
                    { label: "物件 残存価値", val: `${Math.floor(finalPropVal / 10000).toLocaleString()} 万円`, color: "#7ABA9C" },
                  ].map(({ label, val, color }, i) => (
                    <div key={i} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none", paddingTop: i > 0 ? 12 : 0, marginTop: i > 0 ? 12 : 0 }}>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", margin: "0 0 3px" }}>{label}</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color, margin: 0 }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ ...cardStyle, padding: 26, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <h3 style={{ fontSize: 11, fontWeight: 600, color: "#3D3730", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 18px" }}>累計支出比較</h3>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={rentData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C8A96E" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#C8A96E" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gB2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5C7A6B" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#5C7A6B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#EAE5DB" />
                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A89A8A" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A89A8A" }} />
                        <Tooltip content={<AreaTooltip />} position={{ x: 0, y: 230 }} wrapperStyle={{ zIndex: 50 }} />
                        <Area type="monotone" dataKey="rent" name="賃貸" stroke="#C8A96E" strokeWidth={2.5} fill="url(#gR)" dot={false} />
                        <Area type="monotone" dataKey="buy" name="購入" stroke="#5C7A6B" strokeWidth={2.5} fill="url(#gB2)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 10 }}>
                    {[{ label: "賃貸", color: "#C8A96E" }, { label: "購入", color: "#5C7A6B" }].map(({ label, color }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8C7B6B" }}>
                        <span style={{ width: 14, height: 3, background: color, borderRadius: 2, display: "inline-block" }} />{label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...cardStyle, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <h3 style={{ fontSize: 11, fontWeight: 600, color: "#3D3730", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 16px" }}>購入メリット試算</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { label: "支出削減額", val: `${((lastRent?.rent ?? 0) - (lastRent?.buy ?? 0)).toLocaleString()} 万円`, sub: "賃貸との累計差", color: (lastRent?.rent ?? 0) > (lastRent?.buy ?? 0) ? "#5C7A6B" : "#C8A96E" },
                      { label: "資産残存価値", val: `${Math.floor(finalPropVal / 10000).toLocaleString()} 万円`, sub: `年${valueChangeRate}%変動`, color: "#7ABA9C" },
                    ].map(({ label, val, sub, color }) => (
                      <div key={label} style={{ background: "#F4F1EB", borderRadius: 14, padding: "18px 18px" }}>
                        <p style={{ fontSize: 9, color: "#8C7B6B", margin: "0 0 5px", letterSpacing: "0.1em" }}>{label}</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color, margin: 0 }}>{val}</p>
                        <p style={{ fontSize: 10, color: "#A89A8A", margin: "3px 0 0" }}>{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ─── TAX TAB ─── */}
          {activeTab === "tax" && (
            <div className="slide-up d1 tax-grid">

              {/* 左：入力パネル */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* 収入情報 */}
                <div style={{ ...cardStyle, padding: 26, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <Banknote size={14} strokeWidth={1.8} style={{ color: "#5C7A6B" }} />
                    <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3D3730", margin: 0 }}>収入・家族情報</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <SliderRow icon={Banknote} label="年収" display={`${annualIncome.toLocaleString()} 万円`} min={200} max={3000} step={50} value={annualIncome} onChange={setAnnualIncome} />

                    {/* 課税所得・税額プレビュー */}
                    <div style={{ background: "#F0EDE6", borderRadius: 12, padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", gap: 0 }}>
                      {[
                        { label: "課税所得", val: `${Math.floor(taxableIncome)} 万円` },
                        null,
                        { label: "所得税（概算）", val: `${Math.floor(incomeTax)} 万円` },
                        null,
                        { label: "住民税（概算）", val: `${Math.floor(residentTax)} 万円` },
                      ].map((item, i) => item === null
                        ? <div key={i} style={{ background: "#DDD8CE", alignSelf: "stretch", margin: "0 8px" }} />
                        : <div key={i} style={{ textAlign: "center" }}>
                          <p style={{ fontSize: 9, color: "#8C7B6B", margin: "0 0 4px", letterSpacing: "0.1em" }}>{item.label}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#3D3730", margin: 0 }}>{item.val}</p>
                        </div>
                      )}
                    </div>

                    {/* 世帯種別 */}
                    <div>
                      <p style={{ fontSize: 10, color: "#8C7B6B", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px" }}>世帯種別</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {([["single", "単身"], ["family", "家族あり"]] as const).map(([val, lbl]) => (
                          <button key={val} onClick={() => setHouseholdType(val)}
                            style={{ padding: "9px 0", borderRadius: 10, border: `1.5px solid ${householdType === val ? "#5C7A6B" : "#E0DAD0"}`, background: householdType === val ? "#5C7A6B" : "transparent", color: householdType === val ? "#fff" : "#8C7B6B", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 物件情報 */}
                <div style={{ ...cardStyle, padding: 26, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <Home size={14} strokeWidth={1.8} style={{ color: "#5C7A6B" }} />
                    <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3D3730", margin: 0 }}>物件・入居情報</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* 新築/中古 */}
                    <div>
                      <p style={{ fontSize: 10, color: "#8C7B6B", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px" }}>新築 / 中古</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {([true, false] as const).map((v) => (
                          <button key={String(v)} onClick={() => setIsNewBuild(v)}
                            style={{ padding: "9px 0", borderRadius: 10, border: `1.5px solid ${isNewBuild === v ? "#5C7A6B" : "#E0DAD0"}`, background: isNewBuild === v ? "#5C7A6B" : "transparent", color: isNewBuild === v ? "#fff" : "#8C7B6B", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>
                            {v ? "新築" : "中古"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 物件種別（新築のみ） */}
                    {isNewBuild && (
                      <div>
                        <p style={{ fontSize: 10, color: "#8C7B6B", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px" }}>省エネ性能</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {([
                            {
                              val: "certified", label: "認定長期優良・低炭素住宅",
                              tip: "対象：新築のみ\n物件：長期優良住宅・低炭素住宅の認定を受けた物件\n借入限度額：5,000万円（〜2025年）/ 4,500万円（2026年〜）\n補助金：子育てエコホーム支援事業 160万円"
                            },
                            {
                              val: "zeh", label: "ZEH水準省エネ住宅",
                              tip: "対象：新築のみ\n物件：ZEH・Nearly ZEH等の認定を受けた物件\n借入限度額：4,500万円（〜2025年）/ 3,500万円（2026年〜）\n補助金：子育てエコホーム支援事業 100万円"
                            },
                            {
                              val: "eco", label: "省エネ基準適合住宅",
                              tip: "対象：新築・中古\n物件：省エネ基準に適合する物件（断熱等性能等級4以上等）\n借入限度額：4,000万円（〜2025年）/ 3,000万円（2026年〜）\n補助金：子育てエコホーム支援事業 80万円"
                            },
                            {
                              val: "general", label: "一般住宅（省エネ基準以下）",
                              tip: "対象：新築・中古\n物件：省エネ基準未満の物件（2024年以降の新築は原則対象外）\n借入限度額：3,000万円（〜2025年）/ 2,000万円（2026年〜）\n補助金：なし\n注意：2024年以降の新築は省エネ基準適合が必須になる予定"
                            },
                          ] as const).map(({ val, label, tip }) => (
                            <label key={val} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: propertyType === val ? "#EAF2EE" : "#F8F6F2", border: `1.5px solid ${propertyType === val ? "#5C7A6B" : "transparent"}`, cursor: "pointer", transition: "all 0.2s" }}>
                              <input type="radio" name="propType" value={val} checked={propertyType === val} onChange={() => setPropertyType(val)}
                                style={{ accentColor: "#5C7A6B", width: 14, height: 14, flexShrink: 0 }} />
                              <span style={{ fontSize: 11, color: "#3D3730", flex: 1, lineHeight: 1.5 }}>{label}</span>
                              {/* インフォアイコン */}
                              <span className="info-wrap">
                                <Info size={13} className="info-icon" strokeWidth={1.8} />
                                <span className="info-tip">{tip.split("\n").map((line, i) => (
                                  <span key={i} style={{ display: "block" }}>{line}</span>
                                ))}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 入居年 */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <p style={{ fontSize: 10, color: "#8C7B6B", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>入居予定年</p>
                        <span className="info-wrap">
                          <Info size={12} className="info-icon" strokeWidth={1.8} />
                          <span className="info-tip">{"入居年によって控除限度額が変わります。\n2025年末までの入居が最大の恩恵を受けられます。"}</span>
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                        {[2024, 2025, 2026, 2027].map(y => (
                          <button key={y} onClick={() => setEntryYear(y)}
                            style={{ padding: "8px 0", borderRadius: 10, border: `1.5px solid ${entryYear === y ? "#5C7A6B" : "#E0DAD0"}`, background: entryYear === y ? "#5C7A6B" : "transparent", color: entryYear === y ? "#fff" : "#8C7B6B", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>
                            {y}年
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右：結果パネル */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* サマリーカード */}
                <div style={{ background: "linear-gradient(135deg,#2D3B35,#1E2A25)", borderRadius: 20, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 16px" }}>13年間の総合試算</p>
                  <div className="tax-benefit-grid">
                    {[
                      { label: "控除累計額", val: `${totalDeduction.toLocaleString()} 万円`, sub: "所得税＋住民税から控除", color: "#C8A96E", tip: "年末残高×0.7%を最大13年間、所得税・住民税から控除。所得税で控除しきれない分は住民税（上限9.75万円/年）から控除。" },
                      { label: "補助金", val: `${subsidy} 万円`, sub: "子育てエコホーム支援事業", color: "#7ABA9C", tip: "新築住宅の省エネ性能に応じた補助。長期優良住宅160万円、ZEH100万円、省エネ基準適合80万円。子育て世帯・若者夫婦世帯が対象（一部除く）。" },
                      { label: "合計メリット", val: `${totalBenefit.toLocaleString()} 万円`, sub: "控除＋補助金の合計", color: "#E8D5A8", tip: "住宅ローン控除累計額と補助金の合計。実質的な住宅取得コストの削減額を示します。" },
                    ].map(({ label, val, sub, color, tip }) => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", margin: 0, flex: 1 }}>{label}</p>
                          <span className="info-wrap">
                            <Info size={11} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.3)", cursor: "help" }} />
                            <span className="info-tip" style={{ bottom: "calc(100% + 8px)" }}>{tip}</span>
                          </span>
                        </div>
                        <p style={{ fontSize: 18, fontWeight: 700, color, margin: "0 0 3px" }}>{val}</p>
                        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: 0 }}>{sub}</p>
                      </div>
                    ))}
                  </div>
                  {/* 借入限度額バッジ */}
                  <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>適用借入限度額</span>
                    <span style={{ background: "rgba(200,169,110,0.2)", border: "1px solid rgba(200,169,110,0.5)", borderRadius: 8, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: "#C8A96E" }}>
                      {loanLimit.toLocaleString()} 万円
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>控除期間</span>
                    <span style={{ background: "rgba(92,122,107,0.3)", border: "1px solid rgba(92,122,107,0.5)", borderRadius: 8, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: "#7ABA9C" }}>
                      {deductionYears}年間
                    </span>
                  </div>
                </div>

                {/* 年次控除グラフ */}
                <div style={{ ...cardStyle, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: "#3D3730", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>年次控除額推移</h3>
                    <span className="info-wrap">
                      <Info size={13} className="info-icon" strokeWidth={1.8} />
                      <span className="info-tip">{"棒グラフ：各年の控除額（所得税＋住民税）\n折れ線：控除累計額\n残高減少とともに控除額も逓減します。"}</span>
                    </span>
                  </div>
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={taxDeductionData.map(r => ({ ...r, yr: `${r.yr}年目` }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gDed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C8A96E" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#C8A96E" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gCum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5C7A6B" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#5C7A6B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#EAE5DB" />
                        <XAxis dataKey="yr" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A89A8A" }} interval={1} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A89A8A" }} />
                        <Tooltip content={({ active, payload, label }: any) => active && payload?.length ? (
                          <div style={{ background: "rgba(250,250,248,0.97)", border: "1px solid #E0DAD0", borderRadius: 12, padding: "10px 14px", fontSize: 11, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                            <p style={{ color: "#A89A8A", margin: "0 0 6px" }}>{label}</p>
                            {payload.map((p: any, i: number) => (
                              <p key={i} style={{ color: p.color, fontWeight: 600, margin: "2px 0" }}>{p.name}: {p.value?.toFixed ? p.value.toFixed(1) : p.value} 万円</p>
                            ))}
                          </div>
                        ) : null} position={{ x: 0, y: 180 }} wrapperStyle={{ zIndex: 50 }} />
                        <Area type="monotone" dataKey="actualDeduction" name="年間控除額" stroke="#C8A96E" strokeWidth={2.5} fill="url(#gDed)" dot={false} activeDot={{ r: 4, fill: "#C8A96E", stroke: "#FAFAF8", strokeWidth: 2 }} />
                        <Area type="monotone" dataKey="cumDeduction" name="累計控除額" stroke="#5C7A6B" strokeWidth={2} fill="url(#gCum)" dot={false} strokeDasharray="5 3" activeDot={{ r: 4, fill: "#5C7A6B", stroke: "#FAFAF8", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
                    {[{ label: "年間控除額", color: "#C8A96E", dash: false }, { label: "累計控除額", color: "#5C7A6B", dash: true }].map(({ label, color, dash }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8C7B6B" }}>
                        <svg width="20" height="3"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke={color} strokeWidth="2" strokeDasharray={dash ? "5 3" : "none"} /></svg>{label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 年次テーブル */}
                <div style={{ ...cardStyle, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ padding: "16px 22px", borderBottom: "1px solid #EAE5DB", display: "flex", alignItems: "center", gap: 8 }}>
                    <CalendarDays size={13} strokeWidth={1.8} style={{ color: "#5C7A6B" }} />
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#3D3730" }}>年次控除明細</span>
                  </div>
                  <div style={{ overflowY: "auto", maxHeight: 280 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #EAE5DB" }}>
                          {["年目", "残高", "控除上限", "実控除額", "累計控除"].map(h => (
                            <th key={h} style={{ padding: "8px 14px", textAlign: "right", fontSize: 9, color: "#8C7B6B", fontWeight: 500, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {taxDeductionData.map((row, i) => (
                          <tr key={i} className="yr" style={{ borderBottom: "1px solid #F0EDE6", background: i % 2 === 0 ? "#FAFAF8" : "#FDF9F4" }}>
                            <td style={{ padding: "8px 14px", textAlign: "right", color: "#8C7B6B", fontWeight: 500 }}>{row.yr}</td>
                            <td style={{ padding: "8px 14px", textAlign: "right", color: "#3D3730" }}>{row.balance.toLocaleString()} 万</td>
                            <td style={{ padding: "8px 14px", textAlign: "right", color: "#A89A8A" }}>{row.maxDeduction.toFixed(1)} 万</td>
                            <td style={{ padding: "8px 14px", textAlign: "right", color: "#C8A96E", fontWeight: 700 }}>{row.actualDeduction.toFixed(1)} 万</td>
                            <td style={{ padding: "8px 14px", textAlign: "right", color: "#5C7A6B", fontWeight: 700 }}>{row.cumDeduction.toFixed(1)} 万</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 注意事項 */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "14px 16px", background: "#F0EDE6", borderRadius: 14 }}>
                  <Info size={13} strokeWidth={1.6} style={{ color: "#A89A8A", marginTop: 1, flexShrink: 0 }} />
                  <p style={{ fontSize: 10, color: "#8C7B6B", lineHeight: 1.8, margin: 0 }}>
                    本シミュレーションは概算です。実際の控除額は確定申告・年末調整の内容、扶養控除等により異なります。
                    補助金は申請時期・予算枠・世帯要件により変動します。詳細は税務署・住宅支援機構にご確認ください。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══ WALKING FAMILY + LIFE LINE — ページ最下部 ══ */}
        <WalkingFamilyScene />
        <LifeLineAnimation />
      </div>
    </>
  );
}