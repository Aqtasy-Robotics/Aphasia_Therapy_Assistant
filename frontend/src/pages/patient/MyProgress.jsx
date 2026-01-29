import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

//sample data until we link to supabase
const data = [
  { name: 'Week 1', accuracy: 75, words: 12 },
  { name: 'Week 2', accuracy: 85, words: 18 },
  { name: 'Week 3', accuracy: 80, words: 15 },
  { name: 'Week 4', accuracy: 92, words: 24 },
];

const MyProgress = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Progress</h1>
          <p className="text-gray-500 text-sm">Track your improvement over time</p>
        </div>
        <button className="bg-[#4f6ef7] text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all flex items-center gap-2">
          <span>↓</span> Download Monthly Report
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Overall Accuracy" value="82%" sub="+17% improvement" color="text-blue-500" />
        <StatCard title="Total Words Learned" value="84" sub="This month" color="text-green-500" />
        <StatCard title="Avg Session Time" value="51 min" sub="Per session" color="text-orange-500" />
      </div>

      {/* CHART AREA */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-700 mb-6">Weekly Performance</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Line 
                yAxisId="left" type="monotone" dataKey="accuracy" stroke="#4ade80" 
                strokeWidth={3} dot={{ r: 6, fill: '#4ade80' }} activeDot={{ r: 8 }} 
              />
              <Line 
                yAxisId="left" type="monotone" dataKey="words" stroke="#4f6ef7" 
                strokeWidth={3} dot={{ r: 6, fill: '#4f6ef7' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, sub, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
    <h2 className="text-3xl font-black text-gray-800">{value}</h2>
    <p className={`text-[10px] font-bold mt-1 ${color}`}>{sub}</p>
  </div>
);

export default MyProgress;