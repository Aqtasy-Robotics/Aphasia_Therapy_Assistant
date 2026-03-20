import React from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from "recharts";
import { BookOpen, Calendar, Flame, Target } from "lucide-react";

/**
 * 1. ProgressChart Component
 * Explicitly passing the font family to the Recharts SVG elements.
 */
const ProgressChart = () => {
  const emptyWeek = [
    { day: "Mon", progress: null },
    { day: "Tue", progress: null },
    { day: "Wed", progress: null },
    { day: "Thu", progress: null },
    { day: "Fri", progress: null },
    { day: "Sat", progress: null },
    { day: "Sun", progress: null },
  ];

  const axisStyle = {
    fill: "#9ca3af",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "Plus Jakarta Sans", // Explicitly setting the font for the SVG
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={emptyWeek} margin={{ top: 10, right: 30, left: -20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
        <XAxis 
          dataKey="day" 
          axisLine={{ stroke: "#e5e7eb" }} 
          tickLine={false} 
          tick={axisStyle}
          dy={10}
        />
        <YAxis 
          domain={[0, 100]} 
          ticks={[0, 25, 50, 75, 100]}
          axisLine={{ stroke: "#e5e7eb" }} 
          tickLine={false} 
          tick={axisStyle}
          dx={-5}
        />
        <Line 
          type="monotone" 
          dataKey="progress" 
          stroke="#172554" // Updated to Deep Navy
          strokeWidth={4} 
          dot={{ r: 6, fill: "#172554", strokeWidth: 2, stroke: "#fff" }}
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
  <div className={`${highlightBg} p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 flex flex-col items-start relative overflow-hidden transition-all duration-300 hover:scale-[1.03] border border-white font-sans`}>
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
    <div className="animate-in fade-in duration-700 font-sans antialiased">
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
          iconBg="bg-[#172554]" // Updated to Deep Navy
          textColor="text-gray-300"
        />
        <StatCard 
          title="Accuracy" 
          value="0%" 
          subText="This week" 
          icon={<Target className="w-5 h-5" />} 
          iconBg="bg-[#064e3b]" // Updated to Forest Green
          textColor="text-[#064e3b]"
        />
      </div>

      {/* Main Chart Section */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl shadow-gray-200/50 border border-gray-50 relative overflow-hidden">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-tight">
              Recovery Progress
            </h2>
            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest italic">Awaiting clinical data sync...</p>
          </div>
          <div className="text-[10px] font-extrabold text-white uppercase tracking-[0.2em] bg-[#172554] px-5 py-2 rounded-xl shadow-lg shadow-[#172554]/10">
            Weekly View
          </div>
        </div>
        
        <div className="h-[380px]">
          <ProgressChart />
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;