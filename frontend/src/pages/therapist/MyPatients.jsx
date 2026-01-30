import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Search, UserPlus, MoreVertical, Calendar, Loader2 } from "lucide-react";

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
      
      // 1. Get the current logged-in Therapist's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Fetch profiles where role is 'patient' AND the therapist ID matches
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

  // Filtering Logic for the Search Bar
  const filteredPatients = patients.filter((patient) =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="w-10 h-10 text-[#5cb338] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">My Patients</h1>
          <p className="text-gray-500 font-medium">Monitoring {patients.length} active clinical cases</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#5cb338] transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search patient name..."
          className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:ring-4 focus:ring-[#5cb338]/10 focus:border-[#5cb338] outline-none transition-all text-gray-700 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Patient Grid */}
      {filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div 
              key={patient.id} 
              className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-[#5cb338]/10 transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-[#f0fff4] text-[#5cb338] rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                  {patient.full_name?.charAt(0)}
                </div>
                <button className="text-gray-300 hover:text-gray-600 p-2">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-black text-gray-800 group-hover:text-[#5cb338] transition-colors leading-tight">
                  {patient.full_name}
                </h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                  DOB: {patient.date_of_birth || "Not set"}
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Case Status</span>
                    <span className="text-[10px] font-black text-[#5cb338] uppercase bg-[#f0fff4] px-2 py-1 rounded-md">Active</span>
                  </div>
                  <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-[#5cb338] rounded-full w-2/3 transition-all" />
                  </div>
                </div>

                <div className="flex items-center text-gray-500 gap-2 border-t border-gray-50 pt-4">
                  <Calendar className="w-4 h-4 text-gray-300" />
                  <span className="text-xs font-medium">Joined: {new Date(patient.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <button className="w-full mt-8 py-4 bg-gray-50 hover:bg-[#5cb338] text-gray-600 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm">
                Open Clinical File
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-gray-200">
          <p className="text-gray-400 font-bold">No patients assigned to you yet.</p>
          <p className="text-sm text-gray-300 mt-2">Patients must select you in their profile settings.</p>
        </div>
      )}
    </div>
  );
};

export default MyPatients;