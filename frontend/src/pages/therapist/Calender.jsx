import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { 
  ChevronLeft, ChevronRight, Plus, Clock, Video, X, Loader2, Trash2, Calendar as CalIcon 
} from "lucide-react";

const TherapistCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: "",
    session_date: "",
    session_time: "10:00 AM",
    bot_name: "Waabi"
  });

  // --- CALENDAR LOGIC HELPERS ---
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days };
  };

  const { firstDay, days } = getDaysInMonth(currentDate);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + offset)));
  };

  // --- DATA FETCHING ---
  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessionData } = await supabase
        .from("sessions")
        .select(`*, profiles:patient_id ( full_name )`)
        .eq("therapist_id", user.id);
      
      setSessions(sessionData || []);

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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleDayClick = (day) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setFormData({ ...formData, session_date: selectedDate.toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const handleBookSession = async () => {
    if (!formData.patient_id || !formData.session_date) {
      alert("Please select a patient and date");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: newSession, error } = await supabase
        .from("sessions")
        .insert([{
          therapist_id: user.id,
          patient_id: formData.patient_id,
          session_date: formData.session_date,
          session_time: formData.session_time,
          bot_name: formData.bot_name
        }])
        .select(`*, profiles:patient_id ( full_name )`)
        .single();

      if (error) throw error;
      setSessions(prev => [newSession, ...prev]);
      setIsModalOpen(false);
    } catch (err) {
      alert("Booking Error: " + err.message);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-[#5cb338] w-12 h-12" />
      <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Syncing Aqtasy Cloud...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER & NAVIGATOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-xl shadow-gray-200/40 border border-gray-50">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
            {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
          </h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Clinical Schedule</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => changeMonth(1)} className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500">
              <ChevronRight size={20} />
            </button>
          </div>
          <button 
            onClick={() => {
              setFormData({...formData, session_date: new Date().toISOString().split('T')[0]});
              setIsModalOpen(true);
            }}
            className="bg-[#5cb338] text-white px-6 py-4 rounded-2xl font-black flex items-center shadow-lg shadow-green-100 hover:scale-105 transition-all text-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Book Session
          </button>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/50 border border-gray-50 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-50">
          {daysOfWeek.map(day => (
            <div key={day} className="py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/50">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {/* Empty cells for padding start of month */}
          {[...Array(firstDay)].map((_, i) => (
            <div key={`empty-${i}`} className="h-32 md:h-40 border-b border-r border-gray-50 bg-gray-50/20" />
          ))}

          {/* Actual Month Days */}
          {[...Array(days)].map((_, i) => {
            const dayNum = i + 1;
            const dayString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const daySessions = sessions.filter(s => s.session_date === dayString);

            return (
              <div 
                key={dayNum} 
                onClick={() => handleDayClick(dayNum)}
                className="h-32 md:h-40 border-b border-r border-gray-50 p-3 hover:bg-blue-50/30 transition-all cursor-pointer group relative"
              >
                <span className="text-sm font-black text-gray-400 group-hover:text-[#5cb338]">{dayNum}</span>
                
                {/* Session Indicators inside the day box */}
                <div className="mt-2 space-y-1 overflow-y-auto max-h-[80%]">
                  {daySessions.map(s => (
                    <div key={s.id} className="bg-green-50 text-[#5cb338] p-2 rounded-lg text-[9px] font-black uppercase tracking-tighter truncate border border-green-100 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-[#5cb338]" />
                      {s.profiles?.full_name?.split(' ')[0]}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Modal (Remains the same with pre-filled date logic) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-md relative animate-in zoom-in-95 duration-300 shadow-2xl border border-white">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-10 top-10 text-gray-300 hover:text-gray-900">
              <X size={28} />
            </button>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-2">Schedule Session</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-10">Selected Date: {formData.session_date}</p>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Select Patient</label>
                <select 
                  className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-black text-gray-700 border border-transparent focus:border-[#5cb338] transition-all"
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
                  className="w-full p-5 bg-gray-50 rounded-2xl font-black outline-none border border-transparent focus:border-[#5cb338]"
                  value={formData.session_date}
                  onChange={(e) => setFormData({...formData, session_date: e.target.value})}
                />
                <input 
                  type="time" 
                  className="w-full p-5 bg-gray-50 rounded-2xl font-black outline-none border border-transparent focus:border-[#5cb338]"
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':');
                    const suffix = h >= 12 ? 'PM' : 'AM';
                    setFormData({...formData, session_time: `${((h % 12) || 12)}:${m} ${suffix}`});
                  }}
                />
              </div>
              <button 
                onClick={handleBookSession}
                className="w-full bg-[#5cb338] text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-[#4a912d] transition-all transform active:scale-95"
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistCalendar;