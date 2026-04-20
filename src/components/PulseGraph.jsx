import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { Heart } from "lucide-react";

// Generate initial smooth baseline
const generateInitialData = (length = 20, basePulse = 75) => {
  const data = [];
  let lastValue = basePulse;
  for (let i = 0; i < length; i++) {
    let change = (Math.random() - 0.5) * 1.5;
    let newValue = lastValue + change;
    newValue = newValue * 0.95 + basePulse * 0.05;
    newValue = Math.min(100, Math.max(60, Math.round(newValue)));
    data.push({ time: `${i}s`, pulse: newValue });
    lastValue = newValue;
  }
  return data;
};

export default function PulseGraph({ demoMode = true, patientId = "N/A", livePulse }) {
  const [data, setData] = useState(() => generateInitialData(20, 75));
  const lastPulseRef = useRef(75);

  const generateSpikyPoint = (prevPulse, baseLine = 75) => {
    let newPulse = prevPulse;
    const spikeChance = 0.15;
    const isSpike = Math.random() < spikeChance;

    if (isSpike) {
      const spikeType = Math.random() > 0.5 ? "up" : "down";
      if (spikeType === "up") {
        const increment = 15 + Math.random() * 15;
        newPulse = prevPulse + increment;
      } else {
        const decrement = 10 + Math.random() * 10;
        newPulse = prevPulse - decrement;
      }
    } else {
      let change = (Math.random() - 0.5) * 2.5;
      newPulse = prevPulse + change;
      newPulse = newPulse * 0.7 + baseLine * 0.3;
    }
    newPulse = Math.min(130, Math.max(40, Math.round(newPulse)));
    return newPulse;
  };

  // Real mode: use livePulse from parent
  useEffect(() => {
    if (livePulse !== undefined && !demoMode) {
      setData((prevData) => {
        const newPoint = { time: `${prevData.length}s`, pulse: livePulse };
        const newData = [...prevData.slice(1), newPoint];
        return newData.map((point, idx) => ({ ...point, time: `${idx}s` }));
      });
      lastPulseRef.current = livePulse;
    }
  }, [livePulse, demoMode]);

  // Demo mode: self‑generate spiky data
  useEffect(() => {
    if (!demoMode) return;
    const interval = setInterval(() => {
      setData((prevData) => {
        const lastPulse = prevData[prevData.length - 1]?.pulse || 75;
        const newPulse = generateSpikyPoint(lastPulse, 75);
        const newPoint = { time: `${prevData.length}s`, pulse: newPulse };
        const newData = [...prevData.slice(1), newPoint];
        return newData.map((point, idx) => ({ ...point, time: `${idx}s` }));
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [demoMode]);

  const currentPulse = data[data.length - 1]?.pulse || "--";

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{`Time: ${label}`}</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {payload[0].value} <span className="text-sm font-normal">BPM</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-5 w-full transition-all">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 animate-pulse" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Heart Rate Monitor
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {demoMode
                ? "Simulated patient data (spiky pattern)"
                : `Patient ${patientId} · Real-time`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {currentPulse}
          </div>
          <div className="text-xs text-gray-500">beats per minute</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
          />
          <YAxis
            domain={[40, 130]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "BPM",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#64748b", fontSize: 11 },
              dx: -10,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceArea y1={60} y2={100} fill="#10b981" fillOpacity={0.05} />
          <Line
            type="monotone"
            dataKey="pulse"
            stroke="#ef4444"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#ef4444", stroke: "white", strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-3 flex justify-between text-xs text-gray-400">
        <span>Updates every second · Spikes indicate possible arrhythmia</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
          Normal range 60–100 BPM
        </span>
      </div>
    </div>
  );
}