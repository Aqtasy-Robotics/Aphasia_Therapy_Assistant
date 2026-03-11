import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Search, MoreVertical, Calendar, Loader2, User, Activity } from "lucide-react";

const MyPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMyPatients();
  }, []);

  const fetchMyPatients = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "patient")
        .eq("selected_therapist_id", user.id);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error fetching patients:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <Loader2 className="w-12 h-12 text-[#5cb338] animate-spin" />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Accessing Clinical Database...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">Patient Directory</h1>
          <p className="text-gray-500 font-medium mt-1">
            Monitoring {patients.length} active clinical cases with Waabi
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#5cb338] transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search patient name..."
          className="block w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/20 focus:ring-4 focus:ring-[#5cb338]/10 focus:border-[#5cb338] outline-none transition-all text-gray-700 font-bold text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* PATIENT LIST TABLE */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Clinical ID</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="group hover:bg-[#f0fff4]/30 transition-all cursor-pointer">
                    {/* Patient Name & Avatar */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#f0fff4] text-[#5cb338] rounded-xl flex items-center justify-center font-black text-sm shadow-inner border border-green-50">
                          {patient.full_name?.charAt(0)}
                        </div>
                        <span className="text-sm font-black text-gray-800 group-hover:text-[#5cb338] transition-colors">
                          {patient.full_name}
                        </span>
                      </div>
                    </td>
                    
                    {/* Clinical ID */}
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-md">
                        {patient.id?.slice(0, 8)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#5cb338] animate-pulse" />
                        <span className="text-[10px] font-black text-[#5cb338] uppercase tracking-widest">Active</span>
                      </div>
                    </td>

                    {/* Join Date */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-300" />
                        <span className="text-xs font-bold">
                          {new Date(patient.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    {/* Action Menu */}
                    <td className="px-8 py-6 text-right">
                      <button className="text-gray-300 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-24 text-center">
                    <div className="flex flex-col items-center">
                      <User className="w-12 h-12 text-gray-100 mb-4" />
                      <p className="text-gray-300 font-black uppercase tracking-[0.2em] text-sm">Directory Empty</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyPatients;