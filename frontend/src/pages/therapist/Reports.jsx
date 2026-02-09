import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Download, TrendingUp, Users, Award, BarChart3, FileQuestion } from 'lucide-react';

// For the empty state, we provide a tiny bit of "ghost" data just to show the axes
const emptyLineData = [{ month: 'N/A', sessions: 0, patients: 0, avgProgress: 0 }];

const TherapistReports = () => {
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Start tracking your clinical performance</p>
        </div>
        <div className="flex gap-3">
          <button disabled className="bg-gray-100 text-gray-400 px-5 py-2.5 rounded-xl font-bold flex items-center cursor-not-allowed">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards - All at 0 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EmptyStatCard title="Total Patients" value="0" sub="Waiting for first entry" icon={<Users className="text-gray-300" />} color="border-gray-200" />
        <EmptyStatCard title="Sessions" value="0" sub="No sessions logged" icon={<Award className="text-gray-300" />} color="border-gray-200" />
        <EmptyStatCard title="Avg Progress" value="0%" sub="Needs session data" icon={<TrendingUp className="text-gray-300" />} color="border-gray-200" />
        <EmptyStatCard title="Success Rate" value="0%" sub="Waiting for goals" icon={<Award className="text-gray-300" />} color="border-gray-200" />
      </div>

      {/* Monthly Overview - Empty State */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">Monthly Overview</h2>
          <p className="text-sm text-gray-500">Trends will appear here after your first month of sessions.</p>
        </div>
        
        <div className="h-[350px] w-full flex items-center justify-center relative">
          {/* Overlay Message */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px]">
             <BarChart3 className="w-12 h-12 text-gray-200 mb-2" />
             <p className="text-gray-400 font-medium">Insufficient data for chart generation</p>
          </div>
          
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={emptyLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" hide />
              <YAxis hide />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Progress Distribution - Empty */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
           <div className="text-center">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileQuestion className="text-gray-300 w-8 h-8" />
             </div>
             <h2 className="text-xl font-bold text-gray-800">Patient Progress</h2>
             <p className="text-sm text-gray-400 max-w-[250px] mx-auto mt-2">
               Connect Waabi to start collecting speech accuracy data.
             </p>
           </div>
        </div>

        {/* Therapy Focus - Empty */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
           <div className="w-40 h-40 rounded-full border-8 border-dashed border-gray-100 flex items-center justify-center">
              <span className="text-gray-300 text-xs font-bold uppercase tracking-widest">No Categories</span>
           </div>
           <div className="mt-6 text-center">
              <h2 className="text-xl font-bold text-gray-800">Focus Areas</h2>
              <p className="text-sm text-gray-400 mt-2">Charts will populate as therapy types are assigned.</p>
           </div>
        </div>
      </div>

      {/* Top Performers Table - Empty State */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Patient Leaderboard</h2>
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-50 rounded-3xl">
          <p className="text-gray-400 font-medium">Your patient rankings will appear here.</p>
          <button className="mt-4 text-[#5cb338] text-sm font-bold hover:underline">
            + Add your first patient to begin
          </button>
        </div>
      </div>
    </div>
  );
};

// Internal Empty Stat Card Helper
const EmptyStatCard = ({ title, value, sub, icon, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] border-l-4 ${color} shadow-sm`}>
    <div className="flex justify-between items-center mb-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
    </div>
    <h3 className="text-3xl font-bold text-gray-300">{value}</h3>
    <p className="text-xs text-gray-400 mt-2 italic">{sub}</p>
  </div>
);

export default TherapistReports;