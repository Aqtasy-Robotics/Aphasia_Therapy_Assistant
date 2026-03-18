import React from "react";
import { useOutletContext, Link } from "react-router-dom";
import { UserPlus, Calendar, BarChart2, PlusCircle, Activity } from "lucide-react";

const TherapistDashboard = () => {
  const { userData } = useOutletContext();

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER AREA */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/40 border border-gray-50">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">
            Welcome, {userData.title} {userData.fullName}! 👋
          </h1>
          <p className="text-[#5cb338] font-bold text-sm mt-1">
            {userData.clinicName} — Clinical Portal Active
          </p>
        </div>
        <div className="bg-green-50 text-[#5cb338] text-[10px] font-black px-6 py-3 rounded-full uppercase tracking-widest border border-green-100 shadow-sm">
          Therapist Account
        </div>
      </header>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Patients" 
          value="0" 
          sub="Add your first case" 
          color="border-blue-400" 
          icon={<UserPlus className="w-4 h-4 text-blue-400" />}
        />
        <StatCard 
          title="Planned Sessions" 
          value="0" 
          sub="Check your calendar" 
          color="border-[#5cb338]" 
          icon={<Calendar className="w-4 h-4 text-[#5cb338]" />}
        />
        <StatCard 
          title="Avg. Recovery" 
          value="--" 
          sub="Awaiting session data" 
          color="border-orange-400" 
          icon={<Activity className="w-4 h-4 text-orange-400" />}
        />
        <StatCard 
          title="Clinical Portals" 
          value="1" 
          sub="Primary Site Active" 
          color="border-purple-400" 
          icon={<BarChart2 className="w-4 h-4 text-purple-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* RECENT ACTIVITY - EMPTY STATE */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-2xl shadow-gray-200/30 flex flex-col min-h-[400px]">
          <h2 className="text-2xl font-black text-gray-800 mb-8 tracking-tight">Recent Activity</h2>
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center border border-gray-100">
              <Calendar className="text-gray-200 w-10 h-10" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800 uppercase tracking-widest">No activity yet</p>
              <p className="text-xs text-gray-400 mt-2 font-medium max-w-[250px] mx-auto leading-relaxed">
                Logs from your interactions with Waabi and patients will appear here.
              </p>
            </div>
          </div>
        </div>

        {/* PATIENT FOCUS - EMPTY STATE */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-2xl shadow-gray-200/30 flex flex-col min-h-[400px]">
          <h2 className="text-2xl font-black text-gray-800 mb-8 tracking-tight">Patient Focus</h2>
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center border border-gray-100">
              <UserPlus className="text-gray-200 w-10 h-10" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800 uppercase tracking-widest">Your roster is empty</p>
              <p className="text-xs text-gray-400 mt-2 font-medium max-w-[250px] mx-auto leading-relaxed">
                Connect with patients to begin tracking their specialized therapy progress.
              </p>
            </div>
            <Link 
              to="/my-patients" 
              className="text-[#5cb338] text-xs font-black uppercase tracking-widest flex items-center gap-2 bg-green-50 px-6 py-3 rounded-xl hover:bg-green-100 transition-all mt-4"
            >
              <PlusCircle className="w-4 h-4" />
              Manage Patients
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

/* --- COMPONENT HELPERS --- */

const StatCard = ({ title, value, sub, color, icon }) => (
  <div className={`bg-white p-8 rounded-[2.5rem] border-t-8 ${color} shadow-2xl shadow-gray-200/20 transition-all hover:scale-[1.02]`}>
    <div className="flex items-center justify-between mb-4">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</p>
      {icon}
    </div>
    <h3 className="text-4xl font-black text-gray-800 tracking-tighter">{value}</h3>
    <p className="text-[10px] font-bold text-gray-400 mt-3 uppercase tracking-widest opacity-60">{sub}</p>
  </div>
);

export default TherapistDashboard;