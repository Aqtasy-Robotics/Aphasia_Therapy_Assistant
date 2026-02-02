import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Clock, Plus, X, Trash2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const MySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2026-01-30");
  const [selectedTime, setSelectedTime] = useState("10:00 AM");
  
  // New state to track if a therapist is assigned
  const [therapistId, setTherapistId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Check for assigned therapist in profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("selected_therapist_id")
          .eq("id", user.id)
          .single();

        setTherapistId(profile?.selected_therapist_id || null);

        // 2. Load sessions
        const { data } = await supabase
          .from("sessions")
          .select("*")
          .eq("patient_id", user.id);
        
        setSessions(data || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    // Safety check
    if (!therapistId) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("sessions").insert([
        {
          patient_id: user.id,
          therapist_id: therapistId, // Link the session to the therapist
          session_date: selectedDate,
          session_time: selectedTime,
          bot_name: "Waabi"
        }
      ]);

      if (error) {
        alert(error.message);
      } else {
        setIsModalOpen(false);
        fetchInitialData(); 
      }
    }
  };

  const handleCancel = async (id) => {
    await supabase.from("sessions").delete().eq("id", id);
    fetchInitialData();
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center font-bold text-blue-600 animate-pulse">
      Syncing Waabi...
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-800">My Sessions</h1>
          <p className="text-gray-500 text-sm">Manage your training with Waabi</p>
        </div>
        
        {/* Only allow opening modal if therapistId exists */}
        <button 
          onClick={() => therapistId && setIsModalOpen(true)}
          disabled={!therapistId}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${
            therapistId 
              ? "bg-blue-600 text-white shadow-lg hover:bg-blue-700" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          + Book Session
        </button>
      </div>

      {/* ERROR MESSAGE IF NO THERAPIST */}
      {!therapistId && (
        <div className="mb-8 p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Therapist Required</p>
            <p className="text-amber-700 text-sm">
              You haven't assigned yourself a therapist yet. Please go to your{" "}
              <Link to="/profile" className="font-black underline hover:text-amber-800">
                Profile
              </Link>{" "}
              and select the specific speech therapist assigned to you to start booking sessions.
            </p>
          </div>
        </div>
      )}

      {/* SESSION LIST */}
      <div className="space-y-4">
        {sessions.length > 0 ? (
          sessions.map((s) => (
            <div key={s.id} className="p-6 bg-white border border-gray-100 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-xl">🤖</div>
                <div>
                  <p className="font-black text-gray-800">{s.bot_name}</p>
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={12} /> {s.session_date} @ {s.session_time}
                  </p>
                </div>
              </div>
              <button onClick={() => handleCancel(s.id)} className="text-gray-300 hover:text-red-500 p-2 transition-colors">
                <Trash2 size={20} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[2rem]">
            <p className="text-gray-400 font-medium">No sessions scheduled yet.</p>
          </div>
        )}
      </div>

      {/* BOOKING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-8 top-8 text-gray-400 hover:text-gray-600">
              <X />
            </button>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Schedule Waabi</h2>
            <p className="text-gray-400 text-sm mb-8 font-medium">Pick a convenient time for your robot therapy.</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 outline-none font-bold text-gray-700" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Time</label>
                <input 
                  type="time" 
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-100 outline-none font-bold text-gray-700" 
                  onChange={(e) => {
                      const [h, m] = e.target.value.split(':');
                      const suffix = h >= 12 ? 'PM' : 'AM';
                      setSelectedTime(`${((h % 12) || 12)}:${m} ${suffix}`);
                  }}
                />
              </div>

              <button 
                onClick={handleBook}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySessions;