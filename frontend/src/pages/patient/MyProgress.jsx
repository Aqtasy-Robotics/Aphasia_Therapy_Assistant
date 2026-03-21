import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Download, Target, BookOpen, Clock, Activity } from "lucide-react";

// Sample data with new branding colors in mind
const data = [
  { name: 'Week 1', accuracy: 0, words: 0 }
];

const MyProgress = () => {
  const chartTextStyle = {
    fill: "#9ca3af",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "Plus Jakarta Sans",
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 font-sans">
      
      {/* HEADER AREA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">My Progress</h1>
          <p className="text-gray-500 font-semibold mt-2 text-sm italic">Track your clinical improvement over time</p>
        </div>
      </div>

      {/* STATS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard 
          title="Overall Accuracy" 
          value="0%" 
          sub="0% improvement" 
          color="text-[#064e3b]" 
          icon={<Target className="w-5 h-5 text-[#064e3b]" />}
          bg="bg-green-50/30"
        />
        <StatCard 
          title="Words Learned" 
          value="0" 
          sub="Active this month" 
          color="text-[#172554]" 
          icon={<BookOpen className="w-5 h-5 text-[#172554]" />}
          bg="bg-white"
        />
        <StatCard 
          title="Avg Session" 
          value="0m" 
          sub="Per practice day" 
          color="text-orange-600" 
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          bg="bg-orange-50/20"
        />
      </div>

      {/* CHART AREA */}
      <div className="bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-3 bg-gray-50 rounded-2xl text-[#172554]">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-gray-800 uppercase tracking-tight">Weekly Performance</h3>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Accuracy vs. Vocabulary Size</p>
          </div>
        </div>

        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={chartTextStyle} 
                dy={15} 
              />
              <YAxis 
                yAxisId="left" 
                axisLine={false} 
                tickLine={false} 
                tick={chartTextStyle} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false} 
                tickLine={false} 
                tick={chartTextStyle} 
              />
              
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: 'none', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ 
                    paddingBottom: '40px', 
                    fontSize: '10px', 
                    fontWeight: '800', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em' 
                }} 
              />

              {/* Accuracy Line (Forest Green) */}
              <Line 
                yAxisId="left" 
                name="Accuracy %"
                type="monotone" 
                dataKey="accuracy" 
                stroke="#064e3b" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#064e3b', strokeWidth: 3, stroke: '#fff' }} 
                activeDot={{ r: 8, strokeWidth: 0 }} 
              />
              
              {/* Words Line (Deep Navy) */}
              <Line 
                yAxisId="left" 
                name="Words Mastered"
                type="monotone" 
                dataKey="words" 
                stroke="#172554" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#172554', strokeWidth: 3, stroke: '#fff' }} 
                activeDot={{ r: 8, strokeWidth: 0 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* --- REUSABLE STAT CARD --- */
const StatCard = ({ title, value, sub, color, icon, bg }) => (
  <div className={`${bg} p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-gray-200/50 flex flex-col items-start transition-all hover:scale-[1.02]`}>
    <div className="flex items-center gap-4 mb-10">
      <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50">
        {icon}
      </div>
      <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest leading-tight w-24">
        {title}
      </p>
    </div>
    <div className="space-y-1">
      <h2 className={`text-4xl font-extrabold text-gray-800 tracking-tighter`}>{value}</h2>
      <p className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{sub}</p>
    </div>
  </div>
);

export default MyProgress;