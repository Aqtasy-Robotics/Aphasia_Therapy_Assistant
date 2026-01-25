import React from "react";
import ProgressChart from "../../components/ProgressChart";

const PatientDashboard = () => {

  return (
    <>
      {/* Header Section */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Welcome back! 👋
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Here's how you're doing this week
          </p>
        </div>
        <div className="text-sm font-bold text-[#4f6ef7] bg-blue-50 px-4 py-2 rounded-full">
          Patient Account
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Words Mastered" value="24" color="border-blue-500" />
        <StatCard title="Session Time" value="1.5h" color="border-green-500" />
        <StatCard title="Daily Streak" value="12" color="border-orange-500" />
      </div>

      {/* Main Chart Section */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50">
        <h2 className="text-xl font-bold text-gray-800 mb-8">
          Therapy Progress
        </h2>
        <div className="h-[300px]">
          {" "}
          {/* Wrapper to control chart height */}
          <ProgressChart />
        </div>
      </div>
    </>
  );
};

// Small local component for the stats
const StatCard = ({ title, value, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-4 ${color}`}>
    <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
      {title}
    </p>
    <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
  </div>
);

export default PatientDashboard;
