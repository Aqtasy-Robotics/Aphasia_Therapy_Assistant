import React from "react";
import { useOutletContext } from "react-router-dom";
import { UserPlus, Calendar, BarChart2, PlusCircle } from "lucide-react";

const TherapistDashboard = () => {
  const { userData } = useOutletContext();

  return (
    <>
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {userData.title} {userData.fullName}! 👋
          </h1>
          <p className="text-[#5cb338] font-bold text-sm mt-1">
            {userData.clinicName} — Setup in progress
          </p>
        </div>
        <div className="bg-green-50 text-[#5cb338] text-[10px] font-bold px-4 py-2 rounded-full uppercase">
          Therapist Account
        </div>
      </header>

      {/* STATS GRID - INITIAL STATE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard title="Patients" value="0" sub="Add your first patient" color="border-gray-200" />
        <StatCard title="Sessions" value="0" sub="Schedule a session" color="border-gray-200" />
        <StatCard title="Avg Progress" value="--" sub="No data yet" color="border-gray-200" />
        <StatCard title="Clinics" value="1" sub="Primary Clinic active" color="border-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RECENT ACTIVITY - EMPTY STATE */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col min-h-[300px]">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Activity</h2>
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
              <Calendar className="text-gray-300 w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">No activity yet</p>
              <p className="text-xs text-gray-400 mt-1">Activities from your sessions will appear here.</p>
            </div>
          </div>
        </div>

        {/* PATIENT FOCUS - EMPTY STATE */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col min-h-[300px]">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Patient Focus</h2>
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
              <UserPlus className="text-gray-300 w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Your roster is empty</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Add patients to begin tracking their therapy progress.</p>
            </div>
            <button className="text-[#5cb338] text-xs font-bold flex items-center gap-1 hover:underline mt-2">
              <PlusCircle className="w-4 h-4" />
              Add Patient
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* COMPONENT HELPERS */

const StatCard = ({ title, value, sub, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] border-l-4 ${color} shadow-sm transition-all`}>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
    <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
    <p className="text-xs text-gray-400 mt-2 italic">{sub}</p>
  </div>
);

export default TherapistDashboard;