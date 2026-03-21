import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  LineChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Users,
  Award,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

// Ghost data for line chart
const emptyLineData = [
  { month: "N/A", sessions: 0, patients: 0, avgProgress: 0 },
];

// Structural skeleton for the Bar Chart (No raw data)
const emptyProgressData = [
  { range: '0-25%', patients: 0 },
  { range: '26-50%', patients: 0 },
  { range: '51-75%', patients: 0 },
  { range: '76-100%', patients: 0 },
];

const TherapistReports = () => {
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserName(user.user_metadata.full_name || "User");

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(data?.role);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 font-sans antialiased pb-20">
      {/* --- HEADER SECTION --- */}
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
        <div className="text-right">
            <p className="text-xs text-gray-400 font-extrabold uppercase tracking-widest leading-none">
                verified clinician
            </p>
            <p className="text-2xl font-black text-[#012b1d] mt-2 tracking-tighter">
                {userName}
            </p>
        </div>
      </header>

      {/* --- SUMMARY STATS GRID --- */}
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
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f8fafc"
                vertical={false}
              />
              <XAxis dataKey="month" hide />
              <YAxis hide />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* --- PATIENT PROGRESS DISTRIBUTION (Bar Chart) --- */}
        <div className="bg-white p-12 rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 flex flex-col min-h-[450px]">
          <div className="mb-10">
            <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">
              Patient Progress Distribution
            </h2>
            <p className="text-sm font-semibold text-gray-500 mt-2">
              Number of patients in each progress range
            </p>
          </div>

          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emptyProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#94a3b8' }}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  domain={[0, 12]}
                  ticks={[0, 3, 6, 9, 12]}
                  label={{ 
                    value: 'Patients', 
                    angle: -90, 
                    position: 'insideLeft', 
                    fill: '#64748b', 
                    fontSize: 13,
                    fontWeight: 700,
                    offset: 25
                  }}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#94a3b8' }}
                  tickLine={false}
                  dx={-10}
                />
                <Bar 
                  dataKey="patients" 
                  fill="#5cb338" 
                  radius={[6, 6, 0, 0]} 
                  barSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- THERAPY FOCUS (Empty State) --- */}
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
    </div>
  );
};

/* --- REUSABLE STAT CARD COMPONENT --- */
const EmptyStatCard = ({
  title,
  value,
  subText,
  icon,
  iconBg,
  textColor,
  highlightBg = "bg-white",
}) => (
  <div
    className={`${highlightBg} p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 flex flex-col items-start relative overflow-hidden transition-all duration-300 hover:scale-[1.03] border border-white group`}
  >
    <div className="flex items-center gap-4 mb-10">
      <div
        className={`${iconBg} p-3.5 rounded-[1.25rem] text-white shadow-lg transition-transform duration-500 group-hover:rotate-6`}
      >
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