import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { 
  Search, MoreVertical, Calendar, Loader2, User, 
  Target, MessageSquare, Clock, Save, ChevronDown, ChevronUp, Timer, CalendarPlus 
} from "lucide-react";

const MyPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  // Clinical Time Options
  const hourOptions = [0, 1];
  const minuteOptions = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

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
      console.error("Fetch error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates Clinical Vocabulary and Session Duration
   */
  const handleUpdateClinicalData = async (patientId) => {
    const words = document.getElementById(`words-${patientId}`).value;
    const sentences = document.getElementById(`sentences-${patientId}`).value;
    const hours = document.getElementById(`hours-select-${patientId}`).value;
    const mins = document.getElementById(`mins-select-${patientId}`).value;
    const formattedTiming = `${hours}h ${mins}m`;

    try {
      setUpdatingId(patientId);
      const { error } = await supabase
        .from("profiles")
        .update({
          target_words: words,
          target_sentences: sentences,
          session_timing: formattedTiming,
        })
        .eq("id", patientId);

      if (error) throw error;
      
      setPatients(prev => prev.map(p => p.id === patientId ? { 
        ...p, target_words: words, target_sentences: sentences, session_timing: formattedTiming 
      } : p));
      
      alert("Clinical plan synced! 🤖");
    } catch (error) {
      alert("Update failed: " + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  /**
   * Assigns a Session to the Calendar (Time removed as requested)
   */
  const handleBookSession = async (patientId) => {
    const date = document.getElementById(`book-date-${patientId}`).value;

    if (!date) return alert("Please select a date for the session.");

    try {
      setBookingId(patientId);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("sessions")
        .insert([{
          therapist_id: user.id,
          patient_id: patientId,
          session_date: date,
          session_time: "09:00 AM", // Default morning start since time picker was removed
          bot_name: "Waabi"
        }]);

      if (error) throw error;
      alert("Session assigned! It is now visible on your main Calendar. 🗓️");
    } catch (error) {
      alert("Booking Error: " + error.message);
    } finally {
      setBookingId(null);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <Loader2 className="w-12 h-12 text-[#5cb338] animate-spin" />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Syncing Clinical Database...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <header>
        <h1 className="text-4xl font-black text-gray-800 tracking-tight">Clinical Directory</h1>
        <p className="text-gray-500 font-medium mt-1">Configure therapy goals and manage Waabi assignments</p>
      </header>

      {/* Search Interface */}
      <div className="relative group max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400">
          <Search size={20} />
        </div>
        <input
          type="text" placeholder="Search patient name..."
          className="block w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/20 outline-none focus:ring-4 focus:ring-[#5cb338]/10 transition-all font-bold text-sm"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Details</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Focus</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Configure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.map((patient) => (
                <React.Fragment key={patient.id}>
                  {/* MAIN ROW */}
                  <tr 
                    onClick={() => setExpandedId(expandedId === patient.id ? null : patient.id)}
                    className={`group hover:bg-[#f0fff4]/30 transition-all cursor-pointer ${expandedId === patient.id ? 'bg-[#f0fff4]/20' : ''}`}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#f0fff4] text-[#5cb338] rounded-xl flex items-center justify-center font-black text-sm border border-green-50 shadow-inner">
                          {patient.full_name?.charAt(0)}
                        </div>
                        <div>
                          <span className="text-sm font-black text-gray-800 block leading-tight">{patient.full_name}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ID: {patient.id?.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-black text-gray-400 uppercase border border-gray-100 w-fit">
                        {patient.session_timing || "0h 00m"}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right text-gray-300">
                      {expandedId === patient.id ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                    </td>
                  </tr>

                  {/* EXPANDED CONFIGURATION AREA */}
                  {expandedId === patient.id && (
                    <tr className="bg-[#f0fff4]/5">
                      <td colSpan="3" className="px-12 py-10">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in slide-in-from-top duration-500">
                          
                          {/* 1. Vocabulary Panel */}
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <Target size={14} className="text-[#5cb338]"/> Target Words
                            </label>
                            <textarea 
                              id={`words-${patient.id}`} 
                              className="w-full h-32 bg-white rounded-2xl p-4 text-xs font-bold outline-none border border-gray-100 focus:ring-4 focus:ring-green-50 transition-all shadow-sm" 
                              defaultValue={patient.target_words}
                              placeholder="e.g. Apple, Table, Water..."
                            />
                          </div>

                          {/* 2. Sentence Panel */}
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <MessageSquare size={14} className="text-blue-500"/> Phrases
                            </label>
                            <textarea 
                              id={`sentences-${patient.id}`} 
                              className="w-full h-32 bg-white rounded-2xl p-4 text-xs font-bold outline-none border border-gray-100 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm" 
                              defaultValue={patient.target_sentences}
                              placeholder="e.g. I want to drink water."
                            />
                          </div>

                          {/* 3. Session Timer Panel (Adjusted with List Selectors) */}
                          <div className="space-y-3 flex flex-col justify-between">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <Clock size={14} className="text-orange-400"/> Duration
                            </label>
                            <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                              <div className="flex-1 flex flex-col items-center">
                                <select id={`hours-select-${patient.id}`} className="w-full bg-transparent text-2xl font-black text-gray-800 outline-none text-center cursor-pointer" defaultValue={patient.session_timing?.split('h')[0] || 0}>
                                  {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span className="text-[8px] font-black text-gray-300 uppercase mt-1">Hours</span>
                              </div>
                              <span className="text-gray-200 font-black text-xl">:</span>
                              <div className="flex-1 flex flex-col items-center">
                                <select id={`mins-select-${patient.id}`} className="w-full bg-transparent text-2xl font-black text-gray-800 outline-none text-center cursor-pointer" defaultValue={patient.session_timing?.split(' ')[1]?.replace('m','') || 30}>
                                  {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <span className="text-[8px] font-black text-gray-300 uppercase mt-1">Mins</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleUpdateClinicalData(patient.id)} 
                              disabled={updatingId === patient.id} 
                              className="w-full bg-[#5cb338] text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-100 flex items-center justify-center gap-2 hover:brightness-95 transition-all"
                            >
                              {updatingId === patient.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Sync Plan
                            </button>
                          </div>

                          {/* 4. Quick Scheduler Panel (Time input removed) */}
                          <div className="space-y-3 flex flex-col justify-between bg-white/60 p-6 rounded-[2rem] border border-white shadow-sm">
                            <label className="text-[10px] font-black text-[#4f6ef7] uppercase tracking-widest flex items-center gap-2">
                              <CalendarPlus size={14}/> Schedule
                            </label>
                            <div className="space-y-2">
                              <input 
                                id={`book-date-${patient.id}`} 
                                type="date" 
                                className="w-full p-4 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all" 
                              />
                            </div>
                            <button 
                              onClick={() => handleBookSession(patient.id)} 
                              disabled={bookingId === patient.id} 
                              className="w-full bg-[#4f6ef7] text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition-all"
                            >
                              {bookingId === patient.id ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />} Assign Session
                            </button>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyPatients;