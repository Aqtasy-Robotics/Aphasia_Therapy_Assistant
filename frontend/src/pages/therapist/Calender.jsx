import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { 
  Plus, Clock, Video, X, Loader2, Trash2, Calendar as CalIcon 
} from "lucide-react";

const TherapistCalendar = () => {
  const [sessions, setSessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: "",
    session_date: new Date().toISOString().split('T')[0],
    session_time: "10:00 AM",
    bot_name: "Waabi"
  });

  // FETCH DATA
  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch sessions + Patient Names
      const { data: sessionData } = await supabase
        .from("sessions")
        .select(`*, profiles:patient_id ( full_name )`)
        .eq("therapist_id", user.id)
        .order("session_date", { ascending: true });
      
      setSessions(sessionData || []);

      // Fetch Patients for dropdown
      const { data: patientData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "patient");
      
      setPatients(patientData || []);
    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // REALTIME & INITIAL LOAD
  useEffect(() => {
    fetchInitialData();

    // --- REALTIME MAGIC ---
    // This listens for ANY change to the sessions table and refreshes the UI
    const channel = supabase
      .channel('live-sessions')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' }, 
        () => {
          console.log("Database changed! Syncing UI...");
          fetchInitialData(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleBookSession = async () => {
  if (!formData.patient_id || !formData.session_date) {
    alert("Please select a patient and date");
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Insert and RETURN the data (using .select())
    const { data: newSession, error } = await supabase
      .from("sessions")
      .insert([
        {
          therapist_id: user.id,
          patient_id: formData.patient_id,
          session_date: formData.session_date,
          session_time: formData.session_time,
          bot_name: formData.bot_name
        }
      ])
      .select(`*, profiles:patient_id ( full_name )`) // Get the patient name back immediately
      .single();

    if (error) throw error;

    // 2. OPTIMISTIC UPDATE: Add it to the local state immediately
    // This makes it appear on the screen INSTANTLY
    setSessions(prev => [newSession, ...prev]);

    // 3. Close and Cleanup
    setIsModalOpen(false);
    setFormData({ ...formData, patient_id: "" });
    
  } catch (err) {
    alert("Booking Error: " + err.message);
  }
};

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Cancel this session?")) return;
    await supabase.from("sessions").delete().eq("id", id);
    // Realtime listener will handle the UI update
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-[#5cb338] w-12 h-12" />
      <p className="font-black text-gray-400 uppercase tracking-widest text-xs tracking-widest">Syncing Aqtasy Cloud...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">Clinical Agenda</h1>
          <p className="text-gray-500 font-medium mt-1">Real-time session monitoring with Waabi</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#5cb338] hover:bg-[#4a912d] text-white px-8 py-4 rounded-[1.5rem] font-black flex items-center shadow-xl shadow-green-100 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" /> Book New Session
        </button>
      </div>

      <div className="space-y-6">
        {sessions.length > 0 ? (
          sessions.map((s) => (
            <div key={s.id} className="p-8 bg-white border border-gray-100 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between shadow-xl shadow-gray-200/30 group hover:border-[#5cb338] transition-all">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🤖</div>
                <div>
                  <h3 className="text-xl font-black text-gray-800 tracking-tight">{s.profiles?.full_name || "Patient"}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-blue-500">
                      <Video className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{s.bot_name} Session</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{s.session_date} @ {s.session_time}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteSession(s.id)}
                className="mt-6 md:mt-0 p-4 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
              >
                <Trash2 size={22} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-24 border-4 border-dashed border-gray-50 rounded-[3rem] flex flex-col items-center">
            <CalIcon className="w-16 h-16 text-gray-100 mb-4" />
            <p className="text-gray-300 font-black uppercase tracking-[0.2em] text-sm">No Active Appointments</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-md relative animate-in zoom-in-95 duration-300 shadow-2xl">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-10 top-10 text-gray-300 hover:text-gray-900 transition-colors">
              <X size={28} />
            </button>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-2">Schedule Session</h2>
            <div className="space-y-8 mt-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Select Patient</label>
                <select 
                  className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-black text-gray-700"
                  value={formData.patient_id}
                  onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
                >
                  <option value="">Choose a patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <input 
                  type="date" 
                  className="w-full p-5 bg-gray-50 rounded-2xl font-black outline-none"
                  value={formData.session_date}
                  onChange={(e) => setFormData({...formData, session_date: e.target.value})}
                />
                <input 
                  type="time" 
                  className="w-full p-5 bg-gray-50 rounded-2xl font-black outline-none"
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':');
                    const suffix = h >= 12 ? 'PM' : 'AM';
                    setFormData({...formData, session_time: `${((h % 12) || 12)}:${m} ${suffix}`});
                  }}
                />
              </div>
              <button 
                onClick={handleBookSession}
                className="w-full bg-[#5cb338] text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-[#4a912d] transition-all"
              >
                Confirm Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistCalendar;