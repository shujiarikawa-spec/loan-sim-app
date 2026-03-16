"use client";
import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

export default function LoanSimulator() {
  const [amount, setAmount] = useState(3500);
  const [year, setYear] = useState(35);
  const [rate, setRate] = useState(0.5);

  // --- 計算ロジック ---
  const monthlyRate = (rate / 100) / 12;
  const payments = year * 12;
  const monthlyPayment = rate > 0
    ? Math.floor((amount * 10000 * monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1))
    : Math.floor((amount * 10000) / payments);

  const totalPayment = monthlyPayment * payments;
  const principal = amount * 10000;
  const interest = totalPayment - principal;

  // --- グラフ用データ作成 (useMemoで計算を効率化) ---
  const { pieData, lineData } = useMemo(() => {
    // 1. 円グラフ用
    const pie = [
      { name: '借入元金', value: principal },
      { name: '利息合計', value: interest },
    ];

    // 2. 折れ線グラフ用（5年ごとの残高推移）
    const line = [];
    let currentBalance = totalPayment;
    for (let i = 0; i <= year; i += 5) {
      // 簡易的な残高推移計算（総額から毎月返済分を引いていく）
      const remaining = Math.max(0, totalPayment - (monthlyPayment * i * 12));
      line.push({
        year: `${i}年`,
        balance: Math.floor(remaining / 10000), // 万円単位
      });
    }
    return { pieData: pie, lineData: line };
  }, [amount, year, rate, totalPayment, monthlyPayment]);

  // オシャレな配色設定
  const COLORS = ['#1e40af', '#fbbf24']; // ロイヤルブルー と ゴールド

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* ヒーローセクション */}
      <div className="relative h-72 w-full overflow-hidden">
        <img src="/living-room.png" alt="Living Room" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-center justify-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight text-center">
            未来の暮らしをデザインする
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-10">
        <div className="grid lg:grid-cols-12 gap-8">

          {/* 左側：入力パネル (4カラム) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-2xl">📊</span> 条件設定
              </h2>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-bold text-slate-600">
                    <span>借入金額</span>
                    <span className="text-blue-600 text-lg">{amount}万円</span>
                  </div>
                  <input type="range" min="100" max="10000" step="100" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-bold text-slate-600">
                    <span>返済期間</span>
                    <span className="text-blue-600 text-lg">{year}年</span>
                  </div>
                  <input type="range" min="1" max="50" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 uppercase tracking-wider">金利 (%)</label>
                  <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500 text-2xl font-black text-slate-700 transition-all" />
                </div>
              </div>
            </div>

            <div className="bg-blue-600 p-8 rounded-3xl shadow-xl text-white">
              <p className="text-blue-100 text-sm font-bold mb-1">毎月の返済額</p>
              <p className="text-5xl font-black tabular-nums">{monthlyPayment.toLocaleString()}<span className="text-xl ml-2 font-normal">円</span></p>
            </div>
          </div>

          {/* 右側：グラフパネル (8カラム) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 円グラフ */}
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">支払い内訳</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                        {pieData.map((_, index) => <Cell key={index} fill={COLORS[index]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 折れ線グラフ */}
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">返済推移 (万円)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1e40af" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="balance" stroke="#1e40af" strokeWidth={3} fillOpacity={1} fill="url(#colorBal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase">返済総額</p>
                <p className="text-3xl font-black text-slate-800">{totalPayment.toLocaleString()} <span className="text-lg font-bold">円</span></p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-400 uppercase">利息の割合</p>
                <p className="text-3xl font-black text-amber-500">{((interest / totalPayment) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}