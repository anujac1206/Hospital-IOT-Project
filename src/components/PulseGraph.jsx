import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Defs,
  LinearGradient,
} from "recharts";
import { Activity, Heart } from "lucide-react";

const BASELINE = 72;
const DATA_POINTS = 30;

// Generates a more organic, undulating data point
const generateOrganicPoint = (prevPulse, time) => {
  // Use a sine wave to simulate natural physiological drift (e.g., breathing)
  const drift = Math.sin(time / 5) * 2;
  // Add a small amount of "jitter" (Heart Rate Variability)
  const hrv = (Math.random() - 0.5) * 3;
  
  // Occasional natural "surge" (simulating a deep breath or movement)
  const surge = Math.random() > 0.96 ? (Math.random() * 8) : 0;
  
  let newPulse = prevPulse * 0.8 + (BASELINE + drift + surge) * 0.2 + hrv;
  return Math.round(newPulse);
};

export default function PulseGraph({ demoMode = true, patientId = "PT-8821" }) {
  const [data, setData] = useState(() => {
    let initial = [];
    let last = BASELINE;
    for (let i = 0; i < DATA_POINTS; i++) {
      last = generateOrganicPoint(last, i);
      initial.push({ time: i, pulse: last });
    }
    return initial;
  });

  const [counter, setCounter] = useState(DATA_POINTS);

  useEffect(() => {
    if (!demoMode) return;

    const interval = setInterval(() => {
      setData((prev) => {
        const lastPulse = prev[prev.length - 1].pulse;
        const nextPulse = generateOrganicPoint(lastPulse, counter);
        const newData = [...prev.slice(1), { time: counter, pulse: nextPulse }];
        return newData;
      });
      setCounter((c) => c + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [demoMode, counter]);

  const currentPulse = data[data.length - 1].pulse;

  return (
    <div className="bg-[#0f172a] text-slate-100 rounded-3xl p-6 shadow-2xl border border-slate-800 w-full max-w-2xl mx-auto font-sans">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex gap-4 items-center">
          <div className="p-3 bg-red-500/10 rounded-2xl">
            <Activity className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Vitals Monitor
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{patientId}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                LIVE
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <Heart 
              className="w-5 h-5 text-red-500 fill-red-500" 
              style={{ 
                animation: `pulse ${60/currentPulse}s ease-in-out infinite` 
              }}
            />
            <span className="text-5xl font-black tabular-nums tracking-tighter text-white">
              {currentPulse}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium tracking-widest uppercase">
            BPM / Sinus Rhythm
          </span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              vertical={false} 
              stroke="#1e293b" 
              strokeDasharray="4 4" 
            />
            <XAxis hide dataKey="time" />
            <YAxis 
              domain={['dataMin - 10', 'dataMax + 10']} 
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#475569', fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  return (
                    <div className="bg-slate-800 border border-slate-700 p-2 rounded-lg shadow-xl">
                      <p className="text-red-400 font-bold text-sm">{payload[0].value} BPM</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="pulse"
              stroke="#ef4444"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPulse)"
              isAnimationActive={false} // Disabled for smoother real-time feel
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="mt-6 flex justify-between items-center border-t border-slate-800 pt-4">
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Status</span>
            <span className="text-xs font-semibold text-emerald-400">Stable</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Variability</span>
            <span className="text-xs font-semibold text-slate-300">±2.4%</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 italic">
          High-fidelity cardiovascular telemetry
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}