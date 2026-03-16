"use client";
import React, { useState } from 'react';

export default function LoanSimulator() {
  const [amount, setAmount] = useState(3500); // 借入額 (万円)
  const [year, setYear] = useState(35);       // 期間 (年)
  const [rate, setRate] = useState(0.5);      // 金利 (%)

  // 住宅ローン計算ロジック
  const monthlyRate = (rate / 100) / 12;
  const payments = year * 12;
  const monthlyPayment = Math.floor(
    (amount * 10000 * monthlyRate * Math.pow(1 + monthlyRate, payments)) /
    (Math.pow(1 + monthlyRate, payments) - 1)
  );

  return (
    <div className="p-8 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4 text-black">
      <h1 className="text-2xl font-bold text-center">住宅ローン計算機</h1>

      <div>
        <label className="block text-sm">借入金額: {amount}万円</label>
        <input type="range" min="100" max="10000" step="100" value={amount}
          onChange={(e) => setAmount(Number(e.target.value))} className="w-full" />
      </div>

      <div>
        <label className="block text-sm">返済期間: {year}年</label>
        <input type="range" min="1" max="50" value={year}
          onChange={(e) => setYear(Number(e.target.value))} className="w-full" />
      </div>

      <div>
        <label className="block text-sm">年利: {rate}%</label>
        <input type="number" step="0.1" value={rate}
          onChange={(e) => setRate(Number(e.target.value))} className="w-full border p-2" />
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
        <p className="text-sm text-blue-600">毎月の返済額</p>
        <p className="text-3xl font-bold text-blue-700">
          {monthlyPayment.toLocaleString()} 円
        </p>
      </div>
    </div>
  );
}