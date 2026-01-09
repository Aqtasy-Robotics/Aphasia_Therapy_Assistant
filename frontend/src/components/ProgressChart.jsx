import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const data = [
  { day: "Mon", accuracy: 65 },
  { day: "Tue", accuracy: 68 },
  { day: "Wed", accuracy: 75 },
  { day: "Thu", accuracy: 72 },
  { day: "Fri", accuracy: 80 },
  { day: "Sat", accuracy: 85 },
  { day: "Sun", accuracy: 90 },
];

const ProgressChart = () => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
            dy={10}
          />
          <YAxis hide={true} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            }}
            itemStyle={{ color: "#4f6ef7", fontWeight: "bold" }}
          />
          <Area
            type="monotone"
            dataKey="accuracy"
            stroke="#4f6ef7"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorAccuracy)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
