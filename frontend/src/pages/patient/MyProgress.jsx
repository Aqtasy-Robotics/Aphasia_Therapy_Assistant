import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Target, BookOpen, Clock, Activity } from "lucide-react";

// Empty structural data ready for Supabase injection
const emptyComparisonData = [
  { day: 'Mon' },
  { day: 'Tue' },
  { day: 'Wed' },
  { day: 'Thu' },
  { day: 'Fri' },
  { day: 'Sat' },
  { day: 'Sun' }
];

const MyProgress = () => {
  const chartTextStyle = {
    fill: "#64748b", // slate-500
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "inherit", // Forces Recharts to use your global portal font
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 font-sans">
      
      {/* HEADER AREA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-[#172554] tracking-tight">My Progress</h1>
          <p className="text-gray-500 font-semibold mt-2 text-sm italic">Track your clinical improvement over time</p>
        </div>
      </div>

      {/* STATS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard 
          title="Overall Accuracy" 
          value="0%" 
          sub="0% improvement" 
          color="text-[#4a6b99]" // Updated to the new lighter navy
          icon={<Target className="w-5 h-5 text-[#4a6b99]" />}
          bg="bg-white"
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
          bg="bg-white"
        />
      </div>

      {/* CHART AREA */}
      <div className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 relative overflow-hidden">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-4 bg-[#172554]/5 rounded-2xl text-[#172554]">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#172554] uppercase tracking-tight">Performance Comparison</h3>
            <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Current Week vs. Last Week Accuracy</p>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {/* FIX: Increased left margin significantly to prevent clipping */}
            <LineChart data={emptyComparisonData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
              
              <XAxis 
                dataKey="day" 
                axisLine={{ stroke: "#cbd5e1" }} 
                tickLine={false} 
                tick={chartTextStyle} 
                dy={15} 
              />
              
              {/* FIX: Added explicit width={65} to force Recharts to reserve space for the label */}
              <YAxis 
                width={65} 
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                axisLine={{ stroke: "#cbd5e1" }} 
                tickLine={false} 
                tick={chartTextStyle}
                dx={-5}
                label={{ 
                  value: 'Accuracy (%)', 
                  angle: -90, 
                  position: 'insideLeft', 
                  offset: 15, // Using positive offset inside the newly expanded width box
                  fill: '#172554', 
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: 'inherit'
                }}
              />
              
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: '1px solid #f1f5f9', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                  fontFamily: 'inherit',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              />
              
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ 
                    paddingBottom: '30px', 
                    fontSize: '11px', 
                    fontWeight: '800', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em',
                    color: '#172554'
                }} 
              />

              {/* Last Week Line (Lighter Navy Blue) */}
              <Line 
                name="Last Week"
                type="monotone" 
                dataKey="lastWeek" 
                stroke="#4a6b99" // Lighter, slate-navy blue
                strokeWidth={3} 
                strokeDasharray="5 5" // Dashed line to differentiate past data
                dot={{ r: 5, fill: '#4a6b99', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 7, strokeWidth: 0 }} 
                connectNulls={false}
              />

              {/* Current Week Line (Deep Navy) */}
              <Line 
                name="Current Week"
                type="monotone" 
                dataKey="currentWeek" 
                stroke="#172554" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#172554', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 8, fill: "#4a6b99", stroke: "#fff", strokeWidth: 2 }} 
                connectNulls={false}
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
  <div className={`${bg} p-8 rounded-[2.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 flex flex-col items-start transition-all duration-300 hover:scale-[1.03]`}>
    <div className="flex items-center gap-4 mb-10">
      <div className="p-3 bg-gray-50 rounded-[1.25rem] shadow-inner border border-gray-100">
        {icon}
      </div>
      <p className="text-[11px] font-extrabold text-gray-800 uppercase tracking-tight leading-tight w-24">
        {title}
      </p>
    </div>
    <div className="space-y-1">
      <h2 className={`text-4xl font-extrabold ${color} tracking-tighter`}>{value}</h2>
      <p className={`text-[10px] font-bold uppercase tracking-widest text-gray-400`}>{sub}</p>
    </div>
  </div>
);

export default MyProgress;