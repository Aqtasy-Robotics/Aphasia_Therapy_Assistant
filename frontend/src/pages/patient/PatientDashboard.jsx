import React from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from "recharts";
import { BookOpen, Calendar, Target, TrendingUp } from "lucide-react";

const ProgressChart = () => {
  // Empty dataset structurally ready for Supabase data mapping
  const emptyWeek = [
    { day: "Mon" },
    { day: "Tue" },
    { day: "Wed" },
    { day: "Thu" },
    { day: "Fri" },
    { day: "Sat" },
    { day: "Sun" },
  ];

  const axisTextStyle = {
    fill: "#64748b", // slate-500
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "inherit", // Forces Recharts to use the global portal font
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {/* Increased left margin to 25 to ensure the Y-Axis label isn't cut off */}
      <LineChart data={emptyWeek} margin={{ top: 20, right: 20, left: 25, bottom: 10 }}>
        
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={true} />
        
        <XAxis 
          dataKey="day" 
          axisLine={{ stroke: "#cbd5e1" }} 
          tickLine={false} 
          tick={axisTextStyle}
          dy={10}
        />
        
        <YAxis 
          domain={[0, 100]} 
          ticks={[0, 25, 50, 75, 100]}
          axisLine={{ stroke: "#cbd5e1" }} 
          tickLine={false} 
          tick={axisTextStyle}
          dx={-10}
          label={{ 
            value: 'Accuracy (%)', 
            angle: -90, 
            position: 'insideLeft', 
            offset: -15, // Pushes label left so it doesn't overlap numbers
            fill: '#172554', // Deep Navy Brand
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'inherit'
          }}
        />
        
        {/* Deep Navy Line with Forest Green Hover/Active states */}
        <Line 
          type="monotone" 
          dataKey="progress" 
          stroke="#172554" 
          strokeWidth={4} 
          dot={{ r: 6, fill: "#172554", strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 8, fill: "#5cb338", stroke: "#fff", strokeWidth: 2 }} 
          connectNulls={false} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * 2. StatCard Component
 */
const StatCard = ({ title, value, subText, icon, iconBg, textColor, highlightBg = "bg-white" }) => (
  <div className={`${highlightBg} p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 flex flex-col items-start relative overflow-hidden transition-all duration-300 hover:scale-[1.03] border border-gray-50 font-sans`}>
    <div className="flex items-center gap-4 mb-10">
      <div className={`${iconBg} p-3.5 rounded-[1.25rem] text-white shadow-lg`}>
        {icon}
      </div>
      <p className="text-[11px] font-extrabold text-gray-800 uppercase tracking-tight leading-tight w-20">
        {title}
      </p>
    </div>
    <div className="space-y-1">
      <h3 className={`text-5xl font-extrabold ${textColor} tracking-tighter`}>
        {value}
      </h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
        {subText}
      </p>
    </div>
  </div>
);

/**
 * 3. Main PatientDashboard Component
 */
const PatientDashboard = () => {
  return (
    <div className="animate-in fade-in duration-700 font-sans antialiased pb-12">
      {/* Header Section */}
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-[#172554] tracking-tight">
            Welcome Back! 👋
          </h1>
          <p className="text-gray-400 mt-2 font-semibold text-sm">
            Clinical Overview • This Week's Metrics
          </p>
        </div>
        <div className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#172554] bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white shadow-sm">
          Patient Account
        </div>
      </header>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <StatCard 
          title="Words Mastered" 
          value="0" 
          subText="Start practicing!" 
          icon={<BookOpen className="w-5 h-5" />} 
          iconBg="bg-teal-600"
          textColor="text-teal-600"
        />
        <StatCard 
          title="Next Session" 
          value="None" 
          subText="Contact Therapist" 
          icon={<Calendar className="w-5 h-5" />} 
          iconBg="bg-[#172554]" // Deep Navy
          textColor="text-[#172554]"
        />
        <StatCard 
          title="Accuracy" 
          value="0%" 
          subText="This week" 
          icon={<Target className="w-5 h-5" />} 
          iconBg="bg-[#5cb338]" // Forest Green
          textColor="text-[#5cb338]"
        />
      </div>

      {/* Main Chart Section - Replicated from Screenshot */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 relative overflow-hidden">
        
        {/* Chart Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-xl font-bold text-[#172554] tracking-tight">
              Your Progress This Week
            </h2>
            <p className="text-sm font-semibold text-gray-500 mt-1">
              Speech accuracy percentage
            </p>
          </div>
          <TrendingUp className="text-[#172554] w-6 h-6 mt-1 mr-2 opacity-80" />
        </div>
        
        <div className="h-[320px] w-full">
          <ProgressChart />
        </div>
        
      </div>
    </div>
  );
};

export default PatientDashboard;