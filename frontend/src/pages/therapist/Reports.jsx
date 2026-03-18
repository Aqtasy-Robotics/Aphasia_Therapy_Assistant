import React from "react";
import {
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  TrendingUp,
  Users,
  Award,
  BarChart3,
  FileQuestion,
  PlusCircle,
  ShieldCheck
} from "lucide-react";

// Ghost data for axes rendering
const emptyLineData = [
  { month: "N/A", sessions: 0, patients: 0, avgProgress: 0 },
];

const TherapistReports = () => {
  return (
    <div className="animate-in fade-in duration-700 font-sans antialiased pb-20">
      
      {/* --- OPEN HEADER SECTION (Account Badge Removed) --- */}
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-[#012b1d] tracking-tight">
            Reports & Analytics
          </h1>
          <div className="flex items-center gap-3 mt-2">
             <ShieldCheck size={16} className="text-[#064e3b]" />
             <p className="text-gray-400 font-semibold text-sm italic">
               Clinical performance tracking powered by Waabi
             </p>
          </div>
        </div>
        
        <div className="flex items-center">
          {/* Primary Action Button: 11px font */}
          <button className="bg-[#012b1d] text-white px-10 py-4 rounded-2xl font-extrabold text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#012b1d]/20 hover:brightness-125 transition-all active:scale-95 flex items-center gap-3">
            <Download size={18} />
            Export Monthly PDF
          </button>
        </div>
      </header>

      {/* --- SUMMARY STATS GRID: Vertical High-Shadow Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <EmptyStatCard
          title="Total Patients"
          value="0"
          subText="Waiting for intake"
          icon={<Users size={20} />}
          iconBg="bg-[#172554]"
          textColor="text-[#172554]"
        />
        <EmptyStatCard
          title="Total Sessions"
          value="0"
          subText="No sessions logged"
          icon={<Award size={20} />}
          iconBg="bg-[#012b1d]"
          textColor="text-[#012b1d]"
        />
        <EmptyStatCard
          title="Avg Progress"
          value="0%"
          subText="Awaiting data"
          icon={<TrendingUp size={20} />}
          iconBg="bg-[#064e3b]"
          textColor="text-[#064e3b]"
        />
        <EmptyStatCard
          title="Success Rate"
          value="0%"
          subText="Goal tracking inactive"
          icon={<Award size={20} />}
          iconBg="bg-orange-600"
          textColor="text-orange-600"
          highlightBg="bg-orange-50/20"
        />
      </div>

      {/* --- MONTHLY OVERVIEW CHART --- */}
      <div className="bg-white p-12 rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 relative overflow-hidden mb-10">
        <div className="mb-10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-tight">
              Monthly Trends
            </h2>
            <p className="text-[10px] font-extrabold text-gray-400 mt-2 uppercase tracking-[0.3em] italic">
              Data visualization will activate after first 30 days.
            </p>
          </div>
          <div className="bg-gray-50 px-5 py-2 rounded-xl border border-gray-100 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">
            Diagnostic View
          </div>
        </div>

        <div className="h-[400px] w-full flex items-center justify-center relative">
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[4px] rounded-[2.5rem]">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner border border-gray-50">
              <BarChart3 className="w-10 h-10 text-gray-100" />
            </div>
            <p className="text-gray-300 font-extrabold text-[10px] uppercase tracking-[0.3em]">
              Insufficient data for analysis
            </p>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={emptyLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
              <XAxis dataKey="month" hide />
              <YAxis hide />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Progress Distribution - Empty */}
        <div className="bg-white p-12 rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 flex flex-col items-center justify-center min-h-[450px]">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-gray-100">
              <FileQuestion className="text-gray-100 w-12 h-12" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">
              Patient Progress
            </h2>
            <p className="text-sm font-semibold text-gray-400 max-w-[280px] mx-auto mt-4 leading-relaxed italic">
              Sync Waabi robot logs to generate speech accuracy metrics.
            </p>
          </div>
        </div>

        {/* Therapy Focus - Empty */}
        <div className="bg-white p-12 rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 flex flex-col items-center justify-center min-h-[450px]">
          <div className="w-56 h-56 rounded-full border-[10px] border-dashed border-gray-50 flex items-center justify-center relative bg-gray-50/20">
            <span className="text-gray-200 text-[10px] font-extrabold uppercase tracking-[0.3em] text-center px-10">
              Categorizing <br /> Clinical Focus
            </span>
          </div>
          <div className="mt-10 text-center">
            <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">
              Therapy Domains
            </h2>
            <p className="text-sm font-semibold text-gray-400 mt-4 italic">
              Distribution maps will populate as therapy types are assigned.
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard - Empty State */}
      <div className="bg-white p-12 rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 mt-10">
        <h2 className="text-xl font-extrabold text-gray-800 mb-10 uppercase tracking-tight">
          Clinical Leaderboard
        </h2>
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-gray-200 rounded-[2.5rem] bg-gray-50/20">
          <p className="text-gray-400 font-extrabold text-[10px] uppercase tracking-[0.3em]">
            Patient rankings will activate post-session
          </p>
          <button className="mt-8 bg-[#012b1d] text-white px-10 py-5 rounded-2xl text-[11px] font-extrabold uppercase tracking-[0.2em] shadow-xl shadow-[#012b1d]/20 hover:brightness-125 transition-all flex items-center gap-3">
            <PlusCircle size={18} /> Add Your First Case
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- REUSABLE STAT CARD COMPONENT --- */
const EmptyStatCard = ({ title, value, subText, icon, iconBg, textColor, highlightBg = "bg-white" }) => (
  <div className={`${highlightBg} p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 flex flex-col items-start relative overflow-hidden transition-all duration-300 hover:scale-[1.03] border border-white group`}>
    <div className="flex items-center gap-4 mb-10">
      <div className={`${iconBg} p-3.5 rounded-[1.25rem] text-white shadow-lg transition-transform duration-500 group-hover:rotate-6`}>
        {icon}
      </div>
      <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.2em] leading-tight w-20">
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

export default TherapistReports;