import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { ChevronLeft, ChevronRight, Loader2, Clock, ShieldCheck } from "lucide-react";

const TherapistCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessionData } = await supabase
        .from("sessions")
        .select(`*, profiles:patient_id ( full_name )`)
        .eq("therapist_id", user.id);

      setSessions(sessionData || []);
    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInitialData(); }, []);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-6">
        <Loader2 className="animate-spin text-[#012b1d] w-12 h-12" />
        <p className="font-extrabold text-gray-400 uppercase tracking-[0.3em] text-[10px]">Syncing Schedule...</p>
      </div>
    );

  return (
    <div className="animate-in fade-in duration-700 font-sans antialiased pb-10 max-w-5xl mx-auto">
      
      {/* --- COMPACT HEADER --- */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-[#012b1d] tracking-tight">
            {currentDate.toLocaleString("default", { month: "long" })}{" "}
            {currentDate.getFullYear()}
          </h1>
          <div className="flex items-center gap-2 mt-1">
             <ShieldCheck size={14} className="text-[#064e3b]" />
             <p className="text-gray-400 font-semibold text-xs italic">Clinical Schedule Oversight</p>
          </div>
        </div>

        <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-xl border border-white shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-[#012b1d] hover:text-white rounded-lg transition-all text-[#012b1d]"><ChevronLeft size={18} /></button>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-[#012b1d] hover:text-white rounded-lg transition-all text-[#012b1d]"><ChevronRight size={18} /></button>
        </div>
      </header>

      {/* --- CONDENSED CALENDAR GRID --- */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
        
        {/* Tightened Day Headers: 10px */}
        <div className="grid grid-cols-7 border-b border-gray-50">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-4 text-center text-[9px] font-extrabold text-gray-400 uppercase tracking-[0.4em] bg-gray-50/30">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {/* Padding Cells */}
          {[...Array(firstDay)].map((_, i) => (
            <div key={`empty-${i}`} className="h-20 md:h-28 border-b border-r border-gray-50 bg-gray-50/10" />
          ))}

          {/* Compact Day Cells */}
          {[...Array(days)].map((_, i) => {
            const dayNum = i + 1;
            const dayString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const daySessions = sessions.filter(s => s.session_date === dayString);

            return (
              <div key={dayNum} className="h-20 md:h-28 border-b border-r border-gray-50 p-2 hover:bg-[#064e3b]/5 transition-all group overflow-hidden">
                <span className="text-[10px] font-extrabold text-gray-400 group-hover:text-[#012b1d]">{dayNum}</span>

                <div className="mt-1.5 space-y-1 overflow-y-auto max-h-[75%] pr-0.5 custom-scrollbar">
                  {daySessions.map((s) => (
                    <div key={s.id} className="bg-white p-1.5 rounded-lg border border-gray-100 flex flex-col gap-0.5 shadow-sm border-l-2 border-l-[#064e3b]">
                      <span className="text-[8px] font-extrabold uppercase tracking-tight text-gray-800 truncate">
                        {s.profiles?.full_name?.split(' ')[0] || "Patient"}
                      </span>
                      <div className="flex items-center gap-1 text-[7px] font-bold text-[#064e3b]/70 uppercase">
                        <Clock size={7} /> {s.session_time?.split(' ')[0]} {s.session_time?.split(' ')[1]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TherapistCalendar;