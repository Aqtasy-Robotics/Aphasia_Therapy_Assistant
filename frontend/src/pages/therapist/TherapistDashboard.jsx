import React from "react";
import { useOutletContext } from "react-router-dom";

const TherapistDashboard = () => {
  const { userData } = useOutletContext(); // Receives data from the shared layout

  return (
    <>
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back, {userData.title} {userData.fullName}! 👋
          </h1>
          <p className="text-[#5cb338] font-bold text-sm mt-1">
            {userData.clinicName}
          </p>
        </div>
        <div className="bg-green-50 text-[#5cb338] text-[10px] font-bold px-4 py-2 rounded-full uppercase">
          Therapist Account
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard title="Patients" value="24" sub="+2 this month" color="border-green-500" />
        <StatCard title="Sessions" value="18" sub="This week" color="border-blue-500" />
        <StatCard title="Avg Progress" value="81%" sub="+5% increase" color="border-purple-500" />
        <StatCard title="Clinics" value="1" sub="Primary Clinic" color="border-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Activity</h2>
          <div className="space-y-6">
            <ActivityItem name="Sarah Johnson" action="Session Complete" time="2h ago" color="bg-green-500" />
            <ActivityItem name="Michael Brown" action="Sent Message" time="4h ago" color="bg-blue-500" />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Patient Focus</h2>
          <div className="space-y-4">
            <PatientRow name="Sarah Johnson" progress={88} />
            <PatientRow name="Emma Wilson" progress={92} />
          </div>
        </div>
      </div>
    </>
  );
};

// Sub-components (StatCard, ActivityItem, PatientRow) remain the same as your original snippet
const StatCard = ({ title, value, sub, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] border-l-4 ${color} shadow-sm`}>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
    <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
    <p className="text-xs text-gray-400 mt-2">{sub}</p>
  </div>
);

const ActivityItem = ({ name, action, time, color }) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <div>
        <p className="text-sm font-bold text-gray-800">{name}</p>
        <p className="text-[10px] text-gray-500">{action}</p>
      </div>
    </div>
    <span className="text-[10px] text-gray-300">{time}</span>
  </div>
);

const PatientRow = ({ name, progress }) => (
  <div className="p-4 border border-gray-100 rounded-2xl">
    <div className="flex justify-between items-center mb-2">
      <p className="text-sm font-bold text-gray-800">{name}</p>
      <p className="text-xs font-bold text-[#5cb338]">{progress}%</p>
    </div>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-[#5cb338]" style={{ width: `${progress}%` }} />
    </div>
  </div>
);

export default TherapistDashboard;