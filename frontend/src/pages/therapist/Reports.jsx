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
} from "lucide-react";

// For the empty state, we provide a tiny bit of "ghost" data just to show the axes
const emptyLineData = [
  { month: "N/A", sessions: 0, patients: 0, avgProgress: 0 },
];

const TherapistReports = () => {
  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Start tracking your clinical performance with Waabi
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-[#5cb338] hover:bg-[#4a912d] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center border border-[#4a912d]/20 shadow-lg shadow-green-100 transition-all active:scale-95">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards - Updated with Green Titles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EmptyStatCard
          title="Total Patients"
          value="0"
          sub="Waiting for first entry"
          icon={<Users className="w-5 h-5" />}
          color="border-[#5cb338]"
        />
        <EmptyStatCard
          title="Sessions"
          value="0"
          sub="No sessions logged"
          icon={<Award className="w-5 h-5" />}
          color="border-[#5cb338]"
        />
        <EmptyStatCard
          title="Avg Progress"
          value="0%"
          sub="Needs session data"
          icon={<TrendingUp className="w-5 h-5" />}
          color="border-[#5cb338]"
        />
        <EmptyStatCard
          title="Success Rate"
          value="0%"
          sub="Waiting for goals"
          icon={<Award className="w-5 h-5" />}
          color="border-[#5cb338]"
        />
      </div>

      {/* Monthly Overview - Empty State */}
      <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-2xl shadow-gray-200/40 relative overflow-hidden">
        <div className="mb-8">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
            Monthly Overview
          </h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
            Trends will appear after your first month of sessions.
          </p>
        </div>

        <div className="h-[350px] w-full flex items-center justify-center relative">
          {/* Overlay Message */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-2xl">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
              <BarChart3 className="w-8 h-8 text-gray-200" />
            </div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">
              Insufficient data for chart generation
            </p>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={emptyLineData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis dataKey="month" hide />
              <YAxis hide />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Progress Distribution - Empty */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-2xl shadow-gray-200/40 flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <FileQuestion className="text-gray-200 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              Patient Progress
            </h2>
            <p className="text-sm font-bold text-gray-400 max-w-[250px] mx-auto mt-3 leading-relaxed">
              Connect Waabi to start collecting speech accuracy data.
            </p>
          </div>
        </div>

        {/* Therapy Focus - Empty */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-2xl shadow-gray-200/40 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-48 h-48 rounded-full border-8 border-dashed border-gray-50 flex items-center justify-center relative">
            <span className="text-gray-200 text-[10px] font-black uppercase tracking-[0.2em] text-center px-6">
              Waiting for categories
            </span>
          </div>
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              Focus Areas
            </h2>
            <p className="text-sm font-bold text-gray-400 mt-3">
              Charts will populate as therapy types are assigned.
            </p>
          </div>
        </div>
      </div>

      {/* Top Performers Table - Empty State */}
      <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-2xl shadow-gray-200/40">
        <h2 className="text-xl font-black text-gray-800 mb-8 uppercase tracking-tight">
          Patient Leaderboard
        </h2>
        <div className="flex flex-col items-center justify-center py-16 border-4 border-dashed border-gray-50 rounded-[2.5rem] bg-gray-50/30">
          <p className="text-gray-400 font-black text-xs uppercase tracking-[0.2em]">
            Patient rankings will appear here.
          </p>
          <button className="mt-6 bg-[#5cb338] text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100 hover:scale-105 transition-all">
            + Add your first patient
          </button>
        </div>
      </div>
    </div>
  );
};

// Internal Empty Stat Card Helper - UPDATED WITH GREEN TITLE
const EmptyStatCard = ({ title, value, sub, icon, color }) => (
  <div
    className={`bg-white p-8 rounded-[2.5rem] border-l-4 ${color} shadow-2xl shadow-gray-200/40 border-r border-t border-b border-gray-50 transition-all duration-300 hover:scale-[1.03]`}
  >
    <div className="flex justify-between items-start mb-6">
      {/* Title fixed to Aqtasy Green */}
      <p className="text-[11px] font-black text-[#5cb338] uppercase tracking-[0.2em] leading-tight">
        {title}
      </p>
      <div className="p-3 bg-green-50 rounded-2xl text-[#5cb338] shadow-inner">
        {icon}
      </div>
    </div>
    <div className="space-y-1">
      {/* Value set to Deep Black */}
      <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
        {value}
      </h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
        {sub}
      </p>
    </div>
  </div>
);

export default TherapistReports;
