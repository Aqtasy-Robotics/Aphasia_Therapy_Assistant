import React from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  UserPlus,
  Calendar,
  BarChart2,
  PlusCircle,
  Activity,
  ShieldCheck,
  Search,
} from "lucide-react";

const TherapistDashboard = () => {
  // 1. BULLETPROOF CONTEXT GRAB: This stops the app from crashing if context is empty
  const contextData = useOutletContext() || {};
  const userData = contextData.userData;

  // 2. SAFETY CHECK: If the data hasn't arrived yet, show a loading screen
  if (!userData) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-[#064e3b] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-extrabold tracking-[0.2em] uppercase text-xs animate-pulse">
          Loading Dashboard Data...
        </p>
      </div>
    );
  }

  // 3. Once data arrives safely, render the dashboard
  return (
    <div className="animate-in fade-in duration-700 font-sans antialiased pb-20">
      {/* --- HEADER SECTION --- */}
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-[#012b1d] tracking-tight">
            Welcome Back, {userData.title || ""}{" "}
            {userData.fullName || "Therapist"}! 👋
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <ShieldCheck size={16} className="text-[#064e3b]" />
            <p className="text-gray-400 font-semibold text-sm italic">
              {userData.clinicName || "Your Clinic"} • Clinical Oversight Active
            </p>
          </div>
        </div>

        {/* Floating Glassmorphism Badge */}
        <div className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#012b1d] bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white shadow-sm transition-all hover:bg-white/80">
          Therapist Account
        </div>
      </header>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <StatCard
          title="Active Patients"
          value="0"
          subText="In-take required"
          icon={<UserPlus size={20} />}
          iconBg="bg-[#172554]"
          textColor="text-[#172554]"
        />
        <StatCard
          title="Planned Sessions"
          value="0"
          subText="Check agenda"
          icon={<Calendar size={20} />}
          iconBg="bg-[#012b1d]"
          textColor="text-[#012b1d]"
        />
        <StatCard
          title="Avg. Progress"
          value="--"
          subText="Awaiting data"
          icon={<Activity size={20} />}
          iconBg="bg-orange-600"
          textColor="text-orange-600"
          highlightBg="bg-orange-50/20"
        />
        <StatCard
          title="Clinical Sites"
          value="1"
          subText="Primary Site Active"
          icon={<BarChart2 size={20} />}
          iconBg="bg-[#064e3b]"
          textColor="text-[#064e3b]"
        />
      </div>

      {/* --- MAIN DASHBOARD CONTENT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* RECENT ACTIVITY CARD */}
        <div className="bg-white p-12 rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 flex flex-col min-h-[450px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-[#012b1d]/5 transition-colors duration-700"></div>

          <h2 className="text-2xl font-extrabold text-gray-800 mb-10 tracking-tight">
            Recent Activity
          </h2>

          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100 shadow-inner">
              <Activity className="text-gray-200 w-12 h-12" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-gray-800 uppercase tracking-[0.2em]">
                No Recent Logs
              </p>
              <p className="text-sm text-gray-400 mt-3 font-semibold max-w-[280px] mx-auto leading-relaxed italic">
                Clinical updates from Waabi and your patient roster will be
                synced here.
              </p>
            </div>
          </div>
        </div>

        {/* PATIENT FOCUS CARD */}
        <div className="bg-white p-12 rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 flex flex-col min-h-[450px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-[#064e3b]/5 transition-colors duration-700"></div>

          <h2 className="text-2xl font-extrabold text-gray-800 mb-10 tracking-tight">
            Patient Focus
          </h2>

          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100 shadow-inner">
              <Search className="text-gray-200 w-12 h-12" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-gray-800 uppercase tracking-[0.2em]">
                Roster is Empty
              </p>
              <p className="text-sm text-gray-400 mt-3 font-semibold max-w-[280px] mx-auto leading-relaxed italic">
                Connect with patients to begin tracking their specialized
                therapy targets.
              </p>
            </div>

            <Link
              to="/therapist-patients"
              className="mt-6 bg-[#012b1d] text-white text-[11px] font-extrabold uppercase tracking-[0.2em] flex items-center gap-3 px-10 py-5 rounded-2xl hover:brightness-125 hover:-translate-y-1 transition-all shadow-xl shadow-[#012b1d]/20 active:scale-95"
            >
              <PlusCircle size={18} />
              Manage Patients
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- REUSABLE STAT CARD COMPONENT --- */
const StatCard = ({
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

export default TherapistDashboard;
