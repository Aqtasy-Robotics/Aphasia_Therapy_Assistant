import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { ChevronLeft, ChevronRight, Loader2, Clock } from "lucide-react";

const TherapistCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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
    setCurrentDate(
      new Date(currentDate.setMonth(currentDate.getMonth() + offset)),
    );
  };

  // --- DATA FETCHING ---
  const fetchInitialData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Only fetch sessions to display them
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-[#5cb338] w-12 h-12" />
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs">
          Syncing Schedule...
        </p>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in duration-700 pb-20">
      {/* HEADER & NAVIGATOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-xl shadow-gray-200/40 border border-gray-50">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
            {currentDate.toLocaleString("default", { month: "long" })}{" "}
            {currentDate.getFullYear()}
          </h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">
            Clinical Schedule
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <button
              onClick={() => changeMonth(-1)}
              className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/50 border border-gray-50 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-50">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/50"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {/* Empty cells for padding start of month */}
          {[...Array(firstDay)].map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-32 md:h-40 border-b border-r border-gray-50 bg-gray-50/20"
            />
          ))}

          {/* Actual Month Days */}
          {[...Array(days)].map((_, i) => {
            const dayNum = i + 1;
            const dayString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

            // Find sessions that match this specific day
            const daySessions = sessions.filter(
              (s) => s.session_date === dayString,
            );

            return (
              <div
                key={dayNum}
                className="h-32 md:h-40 border-b border-r border-gray-50 p-3 hover:bg-blue-50/10 transition-all group relative"
              >
                <span className="text-sm font-black text-gray-400 group-hover:text-[#5cb338]">
                  {dayNum}
                </span>

                {/* Session Indicators inside the day box */}
                <div className="mt-2 space-y-1.5 overflow-y-auto max-h-[80%] pr-1">
                  {daySessions.map((s) => (
                    <div
                      key={s.id}
                      className="bg-green-50 text-[#5cb338] p-2 rounded-xl border border-green-100 flex flex-col gap-1 shadow-sm"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#5cb338] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-tighter truncate">
                          {s.profiles?.full_name || "Patient"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-green-600/70 ml-3">
                        <Clock size={9} />
                        {s.session_time || "Time TBD"}
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
