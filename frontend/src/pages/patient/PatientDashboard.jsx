import React from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from "recharts";
import { BookOpen, Calendar, Flame, Target } from "lucide-react";

/**
 * 1. ProgressChart Component (Zero Data State)
 * Renders the axes and grid, but no line since data is null.
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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={emptyWeek} margin={{ top: 10, right: 30, left: -20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
        <XAxis 
          dataKey="day" 
          axisLine={{ stroke: "#9ca3af" }} 
          tickLine={false} 
          tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: "bold" }}
          dy={10}
        />
        <YAxis 
          domain={[0, 100]} 
          ticks={[0, 25, 50, 75, 100]}
          axisLine={{ stroke: "#9ca3af" }} 
          tickLine={false} 
          tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: "bold" }}
          dx={-5}
        />
        <Line 
          type="monotone" 
          dataKey="progress" 
          stroke="#14b8a6" 
          strokeWidth={4} 
          dot={{ r: 6, fill: "#14b8a6", strokeWidth: 2, stroke: "#fff" }}
          connectNulls={false} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * 2. StatCard Component
 * Vertical, shadowed design matching your reference screenshot.
 */
const StatCard = ({ title, value, subText, icon, iconBg, textColor, highlightBg = "bg-white" }) => (
  <div className={`${highlightBg} p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 flex flex-col items-start relative overflow-hidden transition-all duration-300 hover:scale-[1.03] border border-white`}>
    <div className="flex items-center gap-4 mb-10">
      <div className={`${iconBg} p-3.5 rounded-[1.25rem] text-white shadow-lg`}>
        {icon}
      </div>
      <p className="text-[11px] font-black text-gray-800 uppercase tracking-tight leading-tight w-20">
        {title}
      </p>
    </div>
    <div className="space-y-1">
      <h3 className={`text-5xl font-black ${textColor} tracking-tighter`}>
        {value}
      </h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
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
    <div className="animate-in fade-in duration-700">
      {/* Header Section */}
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
            Welcome! 👋
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Here's how you're doing this week
          </p>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4f6ef7] bg-white/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/60 shadow-sm">
          Patient Account
        </div>
      </header>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          title="Words Mastered" 
          value="0" 
          subText="Start practicing!" 
          icon={<BookOpen className="w-5 h-5" />} 
          iconBg="bg-teal-500"
          textColor="text-teal-500"
        />
        <StatCard 
          title="Next Session" 
          value="None" 
          subText="Contact Therapist" 
          icon={<Calendar className="w-5 h-5" />} 
          iconBg="bg-blue-600"
          textColor="text-gray-400"
        />
        <StatCard 
          title="Practice Streak" 
          value="0" 
          subText="Days" 
          icon={<Flame className="w-5 h-5" />} 
          iconBg="bg-orange-600"
          textColor="text-orange-600"
          highlightBg="bg-orange-50/30"
        />
        <StatCard 
          title="Accuracy" 
          value="0%" 
          subText="This week" 
          icon={<Target className="w-5 h-5" />} 
          iconBg="bg-green-500"
          textColor="text-green-500"
        />
      </div>

      {/* Main Chart Section */}
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-gray-200/40 border border-gray-50 relative overflow-hidden">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
              Your Progress This Week
            </h2>
            <p className="text-xs font-bold text-gray-400 mt-1 italic">Waiting for your first session data...</p>
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            Weekly View
          </div>
        </div>
        
        <div className="h-[350px]">
          <ProgressChart />
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;